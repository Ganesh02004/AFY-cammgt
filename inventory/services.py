import secrets
from django.db import transaction, models
from django.db.models import Q
from django.utils import timezone
from django.core.exceptions import ValidationError
from .models import (
    Device, DeviceMovement, DeviceActivityLog, Assignment, Transfer,
    DeviceReturn, Pickup, PickupDevice, AuditLog, Worker, ScannerSession
)
from .firebase_service import (
    sync_device_to_rtdb, sync_activity_log_to_rtdb,
    sync_scanner_session_to_rtdb
)


def record_audit_log(user, action, record_type, record_id, safe_metadata="", ip_address=""):
    """Creates an audit log entry for security and compliance."""
    actor = user if (user and user.is_authenticated) else None
    return AuditLog.objects.create(
        actor=actor,
        action=action,
        record_type=record_type,
        record_id=str(record_id),
        safe_metadata=safe_metadata,
        ip_address=ip_address or ""
    )


def record_movement(device, actor, to_custodian_type, to_custodian_name, to_status, related_transaction_type, related_transaction_id="", notes=""):
    """Appends a new record to the immutable device movement ledger."""
    from_type = device.current_custodian_type
    from_name = device.custodian_display
    from_status = device.get_current_status_display()

    return DeviceMovement.objects.create(
        device=device,
        from_custodian_type=from_type,
        from_custodian_name=from_name,
        to_custodian_type=to_custodian_type,
        to_custodian_name=to_custodian_name,
        from_status=from_status,
        to_status=to_status,
        actor=actor,
        timestamp=timezone.now(),
        related_transaction_type=related_transaction_type,
        related_transaction_id=str(related_transaction_id),
        notes=notes
    )


def record_device_activity(device, action, actor, details="", latitude=None, longitude=None, location_address="", related_transaction_type="", related_transaction_id=""):
    """
    Records a dedicated, timestamped activity log entry for a specific device,
    capturing action, actor, location coordinates, address, and transaction context.
    Also synchronizes the activity log to Cloud Firestore.
    """
    actor_name = actor.display_name if actor else "System"
    actor_role = actor.get_role_display() if actor else "Automated"

    log_entry = DeviceActivityLog.objects.create(
        device=device,
        action=action,
        timestamp=timezone.now(),
        actor=actor if (actor and actor.is_authenticated) else None,
        actor_name=actor_name,
        actor_role=actor_role,
        details=details,
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or "",
        related_transaction_type=related_transaction_type,
        related_transaction_id=str(related_transaction_id)
    )

    sync_activity_log_to_rtdb(log_entry)
    sync_device_to_rtdb(device)
    return log_entry


@transaction.atomic
def intake_devices(client, collecting_user, devices_data, actual_poc=None, scheduled_time=None, notes="", location="", latitude=None, longitude=None):
    """
    Intakes multiple or single physical devices collected from a client.
    Each device gets an individual record, unique asset ID, and QR code referencing
    the client, POC, and intake timestamp.
    Updates collecting user's custody atomically and records location.
    """
    if not scheduled_time:
        scheduled_time = timezone.now()

    pickup = Pickup.objects.create(
        client=client,
        actual_poc=actual_poc,
        collecting_user=collecting_user,
        scheduled_time=scheduled_time,
        actual_time=timezone.now(),
        location=location or f"{client.name} Facility",
        latitude=latitude,
        longitude=longitude,
        location_address=location or "",
        status='COMPLETED',
        notes=notes
    )

    created_devices = []

    for item in devices_data:
        asset_id = item.get('asset_id', '').strip()
        if not asset_id:
            # Generate sequential/unique asset ID
            prefix = "CAM" if item.get('device_type') == 'CAMERA' else "DEV"
            count = Device.objects.count() + 1 + len(created_devices)
            asset_id = f"{prefix}-{timezone.now().year}-{count:04d}"

        imei = item.get('imei_or_serial', '').strip() or None
        if imei and not item.get('allow_duplicate_serial', False):
            if Device.objects.filter(imei_or_serial=imei).exists():
                raise ValidationError(f"A device with IMEI/Serial '{imei}' already exists. Please verify.")

        device = Device(
            asset_id=asset_id,
            device_type=item.get('device_type', 'CAMERA'),
            brand_and_model=item.get('brand_and_model', 'Standard Camera'),
            imei_or_serial=imei,
            accessories=item.get('accessories', ''),
            condition=item.get('condition', 'GOOD'),
            source_client=client,
            initial_poc=actual_poc,
            current_status='WITH_COLLECTOR',
            current_custodian_type='USER',
            current_custodian_user=collecting_user,
            received_date=timezone.now(),
            notes=item.get('notes', '')
        )
        if item.get('photo'):
            device.photo = item['photo']

        device.save()
        device.generate_qr_code()
        device.save(update_fields=['qr_code_image'])

        PickupDevice.objects.create(
            pickup=pickup,
            device=device,
            condition_at_collection=device.condition,
            accessories_at_collection=device.accessories
        )

        record_movement(
            device=device,
            actor=collecting_user,
            to_custodian_type='USER',
            to_custodian_name=f"Staff: {collecting_user.display_name}",
            to_status='With Collector / In Transit',
            related_transaction_type='INTAKE',
            related_transaction_id=pickup.id,
            notes=f"Collected from {client.name} (Pickup #{pickup.id})"
        )

        record_device_activity(
            device=device,
            action='COLLECTED_FROM_CLIENT',
            actor=collecting_user,
            details=f"Intake batch from client {client.name} (POC: {actual_poc.name if actual_poc else 'N/A'}). Condition: {device.condition}. Accessories: {device.accessories}",
            latitude=latitude,
            longitude=longitude,
            location_address=location or f"{client.name} Facility",
            related_transaction_type='PICKUP',
            related_transaction_id=pickup.id
        )

        created_devices.append(device)

    record_audit_log(
        user=collecting_user,
        action="INTAKE_DEVICES",
        record_type="Pickup",
        record_id=pickup.id,
        safe_metadata=f"Collected {len(created_devices)} devices from {client.name}"
    )

    return pickup, created_devices


@transaction.atomic
def assign_device_to_worker(device, worker, delivering_user, condition="GOOD", accessories="", acknowledgement="", expected_return_date=None, notes="", latitude=None, longitude=None, location_address=""):
    """
    Assigns a device to a worker.
    Enforces that:
    1. The device must be in the delivering user's custody (or delivering user is Admin).
    2. The device cannot already be assigned or in invalid status.
    3. Blocks double assignment.
    4. Records dynamic GPS coordinates & location.
    5. Appends both DeviceMovement and DeviceActivityLog.
    """
    if not delivering_user.is_admin:
        if device.current_custodian_type != 'USER' or device.current_custodian_user != delivering_user:
            raise ValidationError(f"Device {device.asset_id} is not in your custody. Current custodian: {device.custodian_display}")

    if device.current_status == 'ASSIGNED_WORKER' and device.current_custodian_type == 'WORKER':
        raise ValidationError(f"Device {device.asset_id} is already assigned to {device.custodian_display}. Cannot double-assign.")

    if device.current_status in ['LOST', 'RETIRED', 'RETURNED_TO_CLIENT', 'DAMAGED']:
        raise ValidationError(f"Device {device.asset_id} cannot be assigned because its status is {device.get_current_status_display()}.")

    # Close any lingering active assignment
    Assignment.objects.filter(device=device, status='ACTIVE').update(
        status='TERMINATED',
        closed_time=timezone.now()
    )

    assignment = Assignment.objects.create(
        device=device,
        worker=worker,
        delivering_user=delivering_user,
        assignment_time=timezone.now(),
        condition=condition or device.condition,
        accessories=accessories or device.accessories,
        acknowledgement=acknowledgement or "Direct field handover acknowledged by worker.",
        expected_return_date=expected_return_date,
        status='ACTIVE',
        notes=notes,
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or ""
    )

    record_movement(
        device=device,
        actor=delivering_user,
        to_custodian_type='WORKER',
        to_custodian_name=f"Worker: {worker.name} ({worker.worker_id})",
        to_status='Assigned to Worker / In Use',
        related_transaction_type='ASSIGNMENT',
        related_transaction_id=assignment.id,
        notes=f"Handed over by {delivering_user.display_name}. Ack: {acknowledgement}"
    )

    # Atomically update device custody
    device.current_status = 'ASSIGNED_WORKER'
    device.current_custodian_type = 'WORKER'
    device.current_custodian_worker = worker
    device.current_custodian_user = None
    device.condition = condition or device.condition
    if accessories:
        device.accessories = accessories
    device.save()

    record_device_activity(
        device=device,
        action='ASSIGNED_TO_WORKER',
        actor=delivering_user,
        details=f"Assigned to {worker.name} ({worker.worker_id}) from {worker.employer_company.name}. Ack: {acknowledgement}",
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or "",
        related_transaction_type='ASSIGNMENT',
        related_transaction_id=assignment.id
    )

    record_audit_log(
        user=delivering_user,
        action="ASSIGN_DEVICE",
        record_type="Device",
        record_id=device.asset_id,
        safe_metadata=f"Assigned to worker {worker.name} ({worker.worker_id})"
    )

    return assignment


@transaction.atomic
def initiate_transfer(device, sender, receiver, condition="", notes="", latitude=None, longitude=None, location_address=""):
    """
    Initiates custody transfer from sender to receiver.
    Custody remains with sender until accepted by receiver.
    """
    if sender == receiver:
        raise ValidationError("Sender and receiver cannot be the same user.")

    if not sender.is_admin:
        if device.current_custodian_type != 'USER' or device.current_custodian_user != sender:
            raise ValidationError(f"Device {device.asset_id} is not in your custody.")

    if Transfer.objects.filter(device=device, status='PENDING').exists():
        raise ValidationError(f"Device {device.asset_id} already has a pending transfer request.")

    transfer = Transfer.objects.create(
        device=device,
        sender=sender,
        receiver=receiver,
        condition=condition or device.condition,
        notes=notes,
        status='PENDING',
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or ""
    )

    record_device_activity(
        device=device,
        action='TRANSFER_INITIATED',
        actor=sender,
        details=f"Transfer initiated to {receiver.display_name}. Notes: {notes}",
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or "",
        related_transaction_type='TRANSFER',
        related_transaction_id=transfer.id
    )

    record_audit_log(
        user=sender,
        action="INITIATE_TRANSFER",
        record_type="Transfer",
        record_id=transfer.id,
        safe_metadata=f"Initiated transfer of {device.asset_id} to {receiver.display_name}"
    )

    return transfer


@transaction.atomic
def accept_transfer(transfer, receiver, latitude=None, longitude=None, location_address=""):
    """
    Receiver accepts transfer.
    Custody changes atomically to receiver and movement & activity log are appended.
    """
    if transfer.receiver != receiver and not receiver.is_admin:
        raise ValidationError("Only the designated receiver (or Admin) can accept this transfer.")

    if transfer.status != 'PENDING':
        raise ValidationError(f"Transfer #{transfer.id} is already {transfer.get_status_display()}.")

    device = transfer.device

    record_movement(
        device=device,
        actor=receiver,
        to_custodian_type='USER',
        to_custodian_name=f"Staff: {receiver.display_name}",
        to_status='With Collector / In Transit',
        related_transaction_type='TRANSFER',
        related_transaction_id=transfer.id,
        notes=f"Transfer accepted by {receiver.display_name} from {transfer.sender.display_name}"
    )

    device.current_status = 'WITH_COLLECTOR'
    device.current_custodian_type = 'USER'
    device.current_custodian_user = receiver
    device.current_custodian_worker = None
    device.condition = transfer.condition or device.condition
    device.save()

    transfer.status = 'ACCEPTED'
    transfer.accepted_at = timezone.now()
    if latitude:
        transfer.latitude = latitude
    if longitude:
        transfer.longitude = longitude
    if location_address:
        transfer.location_address = location_address
    transfer.save()

    record_device_activity(
        device=device,
        action='TRANSFER_ACCEPTED',
        actor=receiver,
        details=f"Custody accepted from {transfer.sender.display_name}",
        latitude=latitude or transfer.latitude,
        longitude=longitude or transfer.longitude,
        location_address=location_address or transfer.location_address,
        related_transaction_type='TRANSFER',
        related_transaction_id=transfer.id
    )

    record_audit_log(
        user=receiver,
        action="ACCEPT_TRANSFER",
        record_type="Transfer",
        record_id=transfer.id,
        safe_metadata=f"Accepted custody of {device.asset_id}"
    )

    return transfer


@transaction.atomic
def reject_transfer(transfer, user, reason=""):
    """Receiver rejects transfer. Custody remains with sender."""
    if transfer.receiver != user and not user.is_admin:
        raise ValidationError("Only the designated receiver (or Admin) can reject this transfer.")

    if transfer.status != 'PENDING':
        raise ValidationError(f"Transfer #{transfer.id} is already {transfer.get_status_display()}.")

    transfer.status = 'REJECTED'
    transfer.rejected_at = timezone.now()
    if reason:
        transfer.notes = f"{transfer.notes}\nRejection Reason: {reason}".strip()
    transfer.save()

    record_device_activity(
        device=transfer.device,
        action='TRANSFER_REJECTED',
        actor=user,
        details=f"Transfer rejected by {user.display_name}. Reason: {reason}",
        related_transaction_type='TRANSFER',
        related_transaction_id=transfer.id
    )

    record_audit_log(
        user=user,
        action="REJECT_TRANSFER",
        record_type="Transfer",
        record_id=transfer.id,
        safe_metadata=f"Rejected transfer of {transfer.device.asset_id}"
    )

    return transfer


@transaction.atomic
def cancel_transfer(transfer, user):
    """Sender or Admin cancels a pending transfer."""
    if transfer.sender != user and not user.is_admin:
        raise ValidationError("Only the sender (or Admin) can cancel this transfer.")

    if transfer.status != 'PENDING':
        raise ValidationError(f"Transfer #{transfer.id} is not in pending state.")

    transfer.status = 'CANCELLED'
    transfer.save()

    record_audit_log(
        user=user,
        action="CANCEL_TRANSFER",
        record_type="Transfer",
        record_id=transfer.id,
        safe_metadata=f"Cancelled transfer of {transfer.device.asset_id}"
    )

    return transfer


@transaction.atomic
def process_return(device, worker, receiving_user, condition="GOOD", accessories="", notes="", evidence=None, latitude=None, longitude=None, location_address=""):
    """
    Receives returned device from worker.
    Device is moved to receiving user's custody with status 'AWAITING_INSPECTION'.
    It DOES NOT become available stock until inspection is completed!
    Closes worker's active assignment.
    Records GPS coordinates and formatted return address.
    """
    # Close any active assignment
    Assignment.objects.filter(device=device, worker=worker, status='ACTIVE').update(
        status='RETURNED',
        closed_time=timezone.now()
    )

    device_return = DeviceReturn.objects.create(
        device=device,
        worker=worker,
        receiving_user=receiving_user,
        return_time=timezone.now(),
        condition=condition,
        accessories=accessories or device.accessories,
        notes=notes,
        evidence=evidence,
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or "",
        inspection_completed=False
    )

    record_movement(
        device=device,
        actor=receiving_user,
        to_custodian_type='USER',
        to_custodian_name=f"Staff: {receiving_user.display_name}",
        to_status='Awaiting Inspection',
        related_transaction_type='RETURN',
        related_transaction_id=device_return.id,
        notes=f"Return collected from worker {worker.name} ({worker.worker_id}). Location: {location_address or 'Not specified'}"
    )

    device.current_status = 'AWAITING_INSPECTION'
    device.current_custodian_type = 'USER'
    device.current_custodian_user = receiving_user
    device.current_custodian_worker = None
    device.condition = condition
    if accessories:
        device.accessories = accessories
    device.save()

    record_device_activity(
        device=device,
        action='RETURN_COLLECTED',
        actor=receiving_user,
        details=f"Returned by worker {worker.name} ({worker.worker_id}). Condition: {condition}. Accessories: {accessories}",
        latitude=latitude,
        longitude=longitude,
        location_address=location_address or "",
        related_transaction_type='RETURN',
        related_transaction_id=device_return.id
    )

    record_audit_log(
        user=receiving_user,
        action="PROCESS_RETURN",
        record_type="DeviceReturn",
        record_id=device_return.id,
        safe_metadata=f"Received return of {device.asset_id} from {worker.name}"
    )

    return device_return


@transaction.atomic
def complete_inspection(return_record, inspector, inspection_result, outcome, notes=""):
    """
    Completes inspection for a returned device.
    Only if outcome == 'AVAILABLE_STORAGE' does it become available stock in company storage.
    """
    device = return_record.device

    outcome_mapping = {
        'AVAILABLE_STORAGE': ('AVAILABLE_STORAGE', 'STORAGE', None, 'Available in Company Storage', 'Company Storage'),
        'RETURNED_CLIENT': ('RETURNED_TO_CLIENT', 'CLIENT', None, 'Returned to Client', f"Client: {device.source_client.name}"),
        'UNDER_REPAIR': ('UNDER_REPAIR', 'STORAGE', None, 'Under Repair', 'Repair Bay / Storage'),
        'DAMAGED': ('DAMAGED', 'STORAGE', None, 'Damaged', 'Damaged Quarantine Storage'),
        'RETIRED': ('RETIRED', 'STORAGE', None, 'Retired', 'Retired Asset Archive'),
    }

    if outcome not in outcome_mapping:
        raise ValidationError(f"Invalid outcome: {outcome}")

    new_status, new_cust_type, new_cust_user, status_display, cust_display = outcome_mapping[outcome]

    record_movement(
        device=device,
        actor=inspector,
        to_custodian_type=new_cust_type,
        to_custodian_name=cust_display,
        to_status=status_display,
        related_transaction_type='INSPECTION',
        related_transaction_id=return_record.id,
        notes=f"Inspection Result: {inspection_result}. Outcome: {outcome}. Notes: {notes}"
    )

    device.current_status = new_status
    device.current_custodian_type = new_cust_type
    device.current_custodian_user = new_cust_user
    device.current_custodian_worker = None
    device.save()

    return_record.inspection_completed = True
    return_record.inspection_time = timezone.now()
    return_record.inspector = inspector
    return_record.inspection_result = inspection_result
    return_record.outcome = outcome
    if notes:
        return_record.notes = f"{return_record.notes}\nInspection Notes: {notes}".strip()
    return_record.save()

    record_device_activity(
        device=device,
        action='INSPECTION_COMPLETED',
        actor=inspector,
        details=f"Technical inspection completed: Verdict={inspection_result}, Outcome={outcome}. Notes: {notes}",
        related_transaction_type='INSPECTION',
        related_transaction_id=return_record.id
    )

    record_audit_log(
        user=inspector,
        action="COMPLETE_INSPECTION",
        record_type="DeviceReturn",
        record_id=return_record.id,
        safe_metadata=f"Inspected {device.asset_id}: {inspection_result} -> {outcome}"
    )

    return return_record


@transaction.atomic
def audited_adjustment(device, actor, new_status, new_custodian_type, new_custodian_user=None, new_custodian_worker=None, reason=""):
    """
    Allows Admin to correct exceptional records through audited adjustments with mandatory reason.
    """
    if not actor.is_admin:
        raise ValidationError("Only Admin users can perform audited adjustments.")

    if not reason or len(reason.strip()) < 5:
        raise ValidationError("A clear reason (at least 5 characters) is required for audited adjustments.")

    custodian_name = "Company Storage"
    if new_custodian_type == 'USER' and new_custodian_user:
        custodian_name = f"Staff: {new_custodian_user.display_name}"
    elif new_custodian_type == 'WORKER' and new_custodian_worker:
        custodian_name = f"Worker: {new_custodian_worker.name} ({new_custodian_worker.worker_id})"
    elif new_custodian_type == 'CLIENT':
        custodian_name = f"Client: {device.source_client.name}"

    record_movement(
        device=device,
        actor=actor,
        to_custodian_type=new_custodian_type,
        to_custodian_name=custodian_name,
        to_status=dict(Device.STATUS_CHOICES).get(new_status, new_status),
        related_transaction_type='ADJUSTMENT',
        notes=f"Admin Adjustment by {actor.display_name}. Reason: {reason}"
    )

    device.current_status = new_status
    device.current_custodian_type = new_custodian_type
    device.current_custodian_user = new_custodian_user
    device.current_custodian_worker = new_custodian_worker
    device.save()

    record_device_activity(
        device=device,
        action='AUDITED_ADJUSTMENT',
        actor=actor,
        details=f"Admin adjustment: Status -> {new_status}, Custodian -> {custodian_name}. Reason: {reason}",
        related_transaction_type='ADJUSTMENT'
    )

    record_audit_log(
        user=actor,
        action="AUDITED_ADJUSTMENT",
        record_type="Device",
        record_id=device.asset_id,
        safe_metadata=f"Status -> {new_status}, Custodian -> {custodian_name}. Reason: {reason}"
    )

    return device


# ==========================================
# REMOTE DESKTOP-TO-MOBILE SCANNER SESSIONS
# ==========================================

def create_remote_scanner_session(user):
    """
    Creates a temporary pairing session for desktop scanning.
    Valid for 30 minutes. Returns session object.
    """
    # Invalidate older sessions for this user
    ScannerSession.objects.filter(user=user, status='WAITING').update(status='DISCONNECTED')

    token = secrets.token_urlsafe(24)
    session = ScannerSession.objects.create(
        user=user,
        pairing_token=token,
        status='WAITING',
        expires_at=timezone.now() + timezone.timedelta(minutes=30)
    )

    sync_scanner_session_to_rtdb(session)
    return session


def pair_remote_scanner(pairing_token):
    """
    Called when a mobile phone opens the pairing URL.
    Validates token and updates session status to 'PAIRED'.
    """
    try:
        session = ScannerSession.objects.get(pairing_token=pairing_token)
    except ScannerSession.DoesNotExist:
        return None, "Invalid or expired pairing session."

    if not session.is_valid:
        session.status = 'EXPIRED'
        session.save()
        return None, "This scanner session has expired. Please refresh the QR code on your desktop."

    if session.status == 'WAITING':
        session.status = 'PAIRED'
        session.paired_at = timezone.now()
        session.save()
        sync_scanner_session_to_rtdb(session)

    return session, None


def record_remote_scan_result(pairing_token, scanned_value):
    """
    Called when the paired mobile camera scans a device QR code.
    Identifies the device and updates the session so the desktop receives it in real-time.
    """
    try:
        session = ScannerSession.objects.get(pairing_token=pairing_token)
    except ScannerSession.DoesNotExist:
        return None, "Scanner session not found."

    if not session.is_valid:
        return None, "Scanner session has expired."

    val = str(scanned_value).strip()
    
    # Extract token if a full URL was scanned (e.g. /device/qr/<token>/)
    if '/device/qr/' in val:
        parts = val.split('/device/qr/')
        if len(parts) > 1:
            val = parts[1].strip('/').split('?')[0]

    # Find device by QR token, Asset ID, or Serial
    device = Device.objects.filter(
        models.Q(qr_token__iexact=val) |
        models.Q(asset_id__iexact=val) |
        models.Q(imei_or_serial__iexact=val)
    ).first()

    session.last_scanned_device = device
    session.last_scanned_token = val
    session.last_scanned_at = timezone.now()
    session.status = 'SCANNED'
    session.save()

    sync_scanner_session_to_rtdb(session)
    return session, None
