import uuid
import qrcode
from io import BytesIO
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.files.base import ContentFile
from django.utils import timezone
from .validators import validate_indian_mobile, validate_email_address


class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('MANAGEMENT', 'Management Staff'),
        ('POSTMAN', 'Postman / Field Collector'),
    ]
    REQUESTED_ROLE_CHOICES = [
        ('MANAGEMENT', 'Management Staff'),
        ('POSTMAN', 'Postman / Field Collector'),
    ]
    APPROVAL_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('DEACTIVATED', 'Deactivated'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='POSTMAN')
    requested_role = models.CharField(max_length=20, choices=REQUESTED_ROLE_CHOICES, default='POSTMAN')
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='APPROVED', db_index=True)
    is_profile_completed = models.BooleanField(default=True)
    email_verified = models.BooleanField(default=True)

    firebase_uid = models.CharField(max_length=128, blank=True, null=True, unique=True, db_index=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)

    phone = models.CharField(max_length=20, blank=True, default='', validators=[validate_indian_mobile])
    email = models.EmailField(blank=True, validators=[validate_email_address])
    address = models.TextField(blank=True, default='')
    work_location = models.CharField(max_length=255, blank=True, default='')
    work_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    work_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_users')
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['username']

    @property
    def is_admin(self):
        return self.role == 'ADMIN' or self.is_superuser

    @property
    def is_management(self):
        return self.role == 'MANAGEMENT'

    @property
    def is_postman(self):
        return self.role == 'POSTMAN'

    @property
    def is_approved(self):
        return self.is_admin or self.approval_status == 'APPROVED'

    @property
    def is_pending(self):
        return not self.is_admin and self.approval_status == 'PENDING'

    @property
    def is_deactivated(self):
        return self.approval_status in ('DEACTIVATED', 'REJECTED') or (not self.is_active and self.approval_status != 'PENDING')

    @property
    def display_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.username

    def __str__(self):
        return f"{self.display_name} ({self.get_role_display()})"


class ClientCompany(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, help_text="Unique client code (e.g. CLI-001)")
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pin_code = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    custom_fields = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Client Companies"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class ClientContact(models.Model):
    client = models.ForeignKey(ClientCompany, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=150)
    designation = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, validators=[validate_indian_mobile])
    email = models.EmailField(blank=True, validators=[validate_email_address])
    is_active = models.BooleanField(default=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.client.name}"


class EmployerCompany(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
    ]
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, help_text="Unique employer code (e.g. EMP-001)")
    address = models.TextField()
    contact_details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    custom_fields = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Employer Companies"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Worker(models.Model):
    worker_id = models.CharField(max_length=50, unique=True, help_text="Worker ID/badge number (e.g. WRK-1001)")
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, validators=[validate_indian_mobile])
    email = models.EmailField(blank=True, validators=[validate_email_address])
    address = models.TextField(blank=True)
    employer_company = models.ForeignKey(EmployerCompany, on_delete=models.PROTECT, related_name='workers')
    role_or_status = models.CharField(max_length=100, default='Active Field Worker')
    
    # Sensitive payment/identity fields (strictly masked for non-admin)
    aadhaar_number = models.CharField(max_length=30, blank=True, help_text="Sensitive Aadhaar number")
    bank_account_number = models.CharField(max_length=40, blank=True, help_text="Sensitive bank account")
    bank_ifsc = models.CharField(max_length=30, blank=True)
    upi_id = models.CharField(max_length=60, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.worker_id}) - {self.employer_company.name}"

    @property
    def masked_aadhaar(self):
        if not self.aadhaar_number:
            return "N/A"
        clean = self.aadhaar_number.replace(' ', '').replace('-', '')
        if len(clean) >= 4:
            return f"XXXX-XXXX-{clean[-4:]}"
        return "XXXX-XXXX-XXXX"

    @property
    def masked_bank(self):
        if not self.bank_account_number:
            return "N/A"
        if len(self.bank_account_number) >= 4:
            return f"XXXXXXXX{self.bank_account_number[-4:]}"
        return "XXXXXXXXXXXX"


class Device(models.Model):
    DEVICE_TYPE_CHOICES = [
        ('CAMERA', 'Camera'),
        ('SMARTPHONE', 'Smartphone'),
        ('BODYCAM', 'Body Camera'),
        ('DASHCAM', 'Dashcam'),
        ('TABLET', 'Tablet'),
        ('OTHER', 'Other Accessory / Device'),
    ]

    STATUS_CHOICES = [
        ('EXPECTED', 'Expected'),
        ('WITH_COLLECTOR', 'With Collector / In Transit'),
        ('AVAILABLE_STORAGE', 'Available in Company Storage'),
        ('ASSIGNED_WORKER', 'Assigned to Worker / In Use'),
        ('RETURN_REQUESTED', 'Return Requested'),
        ('RETURN_IN_TRANSIT', 'Return In Transit'),
        ('AWAITING_INSPECTION', 'Awaiting Inspection'),
        ('UNDER_REPAIR', 'Under Repair'),
        ('DAMAGED', 'Damaged'),
        ('LOST', 'Lost'),
        ('RETURNED_TO_CLIENT', 'Returned to Client'),
        ('RETIRED', 'Retired'),
    ]

    CUSTODIAN_TYPE_CHOICES = [
        ('USER', 'User (Collector / Staff)'),
        ('WORKER', 'Worker'),
        ('STORAGE', 'Company Storage'),
        ('CLIENT', 'Client'),
    ]

    CONDITION_CHOICES = [
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Good'),
        ('FAIR', 'Fair'),
        ('DAMAGED', 'Damaged'),
    ]

    asset_id = models.CharField(max_length=50, unique=True, db_index=True, help_text="Unique internal Asset ID")
    qr_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    device_type = models.CharField(max_length=30, choices=DEVICE_TYPE_CHOICES, default='CAMERA')
    brand_and_model = models.CharField(max_length=150)
    imei_or_serial = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    accessories = models.TextField(blank=True, default='', help_text="e.g. Charger, USB-C Cable, Pouch, 64GB SD Card")
    photo = models.ImageField(upload_to='devices/photos/', blank=True, null=True)
    condition = models.CharField(max_length=30, choices=CONDITION_CHOICES, default='GOOD')
    source_client = models.ForeignKey(ClientCompany, on_delete=models.PROTECT, related_name='devices')
    initial_poc = models.ForeignKey(ClientContact, on_delete=models.SET_NULL, null=True, blank=True, related_name='intake_devices')
    
    # Controlled Status and Custodian
    current_status = models.CharField(max_length=40, choices=STATUS_CHOICES, default='EXPECTED', db_index=True)
    current_custodian_type = models.CharField(max_length=20, choices=CUSTODIAN_TYPE_CHOICES, default='CLIENT')
    current_custodian_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='custody_devices')
    current_custodian_worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_devices')

    received_date = models.DateTimeField(default=timezone.now)
    qr_code_image = models.ImageField(upload_to='devices/qr/', blank=True, null=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.asset_id} - {self.brand_and_model} ({self.get_current_status_display()})"

    @property
    def is_available_stock(self):
        """Only devices in company storage ready for dispatch count as available stock."""
        return self.current_status == 'AVAILABLE_STORAGE' and self.current_custodian_type == 'STORAGE'

    @property
    def custodian_display(self):
        if self.current_custodian_type == 'USER' and self.current_custodian_user:
            return f"Staff: {self.current_custodian_user.display_name}"
        elif self.current_custodian_type == 'WORKER' and self.current_custodian_worker:
            return f"Worker: {self.current_custodian_worker.name} ({self.current_custodian_worker.worker_id})"
        elif self.current_custodian_type == 'STORAGE':
            return "Company Storage"
        elif self.current_custodian_type == 'CLIENT':
            return f"Client: {self.source_client.name}"
        return "Unassigned"

    @property
    def status_badge_class(self):
        mapping = {
            'AVAILABLE_STORAGE': 'bg-emerald-100 text-emerald-800 border-emerald-300',
            'ASSIGNED_WORKER': 'bg-blue-100 text-blue-800 border-blue-300',
            'WITH_COLLECTOR': 'bg-indigo-100 text-indigo-800 border-indigo-300',
            'EXPECTED': 'bg-slate-100 text-slate-800 border-slate-300',
            'RETURN_REQUESTED': 'bg-amber-100 text-amber-800 border-amber-300',
            'RETURN_IN_TRANSIT': 'bg-amber-100 text-amber-800 border-amber-300',
            'AWAITING_INSPECTION': 'bg-purple-100 text-purple-800 border-purple-300',
            'UNDER_REPAIR': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'DAMAGED': 'bg-rose-100 text-rose-800 border-rose-300',
            'LOST': 'bg-red-200 text-red-900 border-red-400',
            'RETURNED_TO_CLIENT': 'bg-cyan-100 text-cyan-800 border-cyan-300',
            'RETIRED': 'bg-gray-100 text-gray-700 border-gray-300',
        }
        return mapping.get(self.current_status, 'bg-gray-100 text-gray-800 border-gray-300')

    def generate_qr_code(self, base_url=""):
        """
        Generates a secure QR code image encoding the opaque lookup URL.
        Does NOT expose sensitive Aadhaar, banking, or contact information directly in the QR code.
        Company, POC, and timestamp information are securely retrieved upon authorized scan.
        """
        payload = f"/device/qr/{str(self.qr_token)}/"
        if base_url:
            payload = f"{base_url.rstrip('/')}{payload}"
            
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        file_name = f"qr_{self.asset_id}.png"
        self.qr_code_image.save(file_name, ContentFile(buffer.getvalue()), save=False)


class Pickup(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    client = models.ForeignKey(ClientCompany, on_delete=models.PROTECT, related_name='pickups')
    actual_poc = models.ForeignKey(ClientContact, on_delete=models.SET_NULL, null=True, blank=True)
    collecting_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='collected_pickups')
    scheduled_time = models.DateTimeField(default=timezone.now)
    actual_time = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    
    # Dynamic location coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scheduled_time']

    def __str__(self):
        return f"Pickup #{self.id} from {self.client.name} by {self.collecting_user.display_name}"


class PickupDevice(models.Model):
    pickup = models.ForeignKey(Pickup, on_delete=models.CASCADE, related_name='pickup_devices')
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='pickup_records')
    condition_at_collection = models.CharField(max_length=50)
    accessories_at_collection = models.TextField(blank=True)

    def __str__(self):
        return f"Pickup #{self.pickup.id} - {self.device.asset_id}"


class Assignment(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('RETURNED', 'Returned'),
        ('REPLACED', 'Replaced'),
        ('TERMINATED', 'Terminated'),
    ]

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name='assignments')
    worker = models.ForeignKey(Worker, on_delete=models.PROTECT, related_name='device_assignments')
    delivering_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_assignments')
    assignment_time = models.DateTimeField(default=timezone.now)
    condition = models.CharField(max_length=50)
    accessories = models.TextField(blank=True)
    acknowledgement = models.TextField(blank=True, help_text="Handover confirmation notes / digital signature acknowledgement")
    expected_return_date = models.DateField(null=True, blank=True)
    closed_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    notes = models.TextField(blank=True)

    # Dynamic location coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-assignment_time']

    def __str__(self):
        return f"Assignment {self.device.asset_id} -> {self.worker.name} ({self.status})"


class Transfer(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Acceptance'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name='transfers')
    sender = models.ForeignKey(User, on_delete=models.PROTECT, related_name='sent_transfers')
    receiver = models.ForeignKey(User, on_delete=models.PROTECT, related_name='received_transfers')
    condition = models.CharField(max_length=50)
    initiated_at = models.DateTimeField(default=timezone.now)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)

    # Dynamic location coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-initiated_at']

    def __str__(self):
        return f"Transfer #{self.id}: {self.device.asset_id} ({self.sender.display_name} -> {self.receiver.display_name})"


class DeviceReturn(models.Model):
    INSPECTION_RESULT_CHOICES = [
        ('PASSED', 'Passed (All functional, ready for storage)'),
        ('NEEDS_REPAIR', 'Needs Repair'),
        ('DAMAGED', 'Physical Damage Detected'),
        ('MISSING_ACCESSORIES', 'Accessories Missing / Incomplete'),
    ]

    OUTCOME_CHOICES = [
        ('AVAILABLE_STORAGE', 'Move to Company Storage (Available)'),
        ('RETURNED_CLIENT', 'Return to Source Client'),
        ('UNDER_REPAIR', 'Send to Repair'),
        ('DAMAGED', 'Mark as Damaged'),
        ('RETIRED', 'Retire Device'),
    ]

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name='returns')
    worker = models.ForeignKey(Worker, on_delete=models.PROTECT, related_name='device_returns')
    receiving_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='received_returns')
    return_time = models.DateTimeField(default=timezone.now)
    condition = models.CharField(max_length=50)
    accessories = models.TextField(blank=True)
    evidence = models.ImageField(upload_to='returns/evidence/', blank=True, null=True)
    
    # Dynamic location coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True, default='')

    # Inspection process
    inspection_completed = models.BooleanField(default=False)
    inspection_time = models.DateTimeField(null=True, blank=True)
    inspector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections')
    inspection_result = models.CharField(max_length=50, choices=INSPECTION_RESULT_CHOICES, blank=True)
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-return_time']

    def __str__(self):
        status_txt = "Inspected" if self.inspection_completed else "Awaiting Inspection"
        return f"Return #{self.id}: {self.device.asset_id} from {self.worker.name} ({status_txt})"


class DeviceMovement(models.Model):
    """
    Append-only audit ledger of every custody or status change for every device.
    """
    TRANSACTION_CHOICES = [
        ('INTAKE', 'Client Pickup / Intake'),
        ('ASSIGNMENT', 'Worker Handover / Assignment'),
        ('TRANSFER', 'Staff Transfer Accepted'),
        ('RETURN', 'Worker Return Collected'),
        ('INSPECTION', 'Inspection Completed'),
        ('ADJUSTMENT', 'Audited Admin Adjustment'),
        ('INCIDENT', 'Incident Report / Status Change'),
    ]

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name='movements')
    from_custodian_type = models.CharField(max_length=50)
    from_custodian_name = models.CharField(max_length=150)
    to_custodian_type = models.CharField(max_length=50)
    to_custodian_name = models.CharField(max_length=150)
    from_status = models.CharField(max_length=50)
    to_status = models.CharField(max_length=50)
    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='device_movements')
    timestamp = models.DateTimeField(default=timezone.now)
    related_transaction_type = models.CharField(max_length=50, choices=TRANSACTION_CHOICES)
    related_transaction_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.device.asset_id}: {self.from_custodian_name} -> {self.to_custodian_name} ({self.to_status})"


class DeviceActivityLog(models.Model):
    """
    Separate timestamped activity log for each device tracking its entire lifecycle:
    registration, client collection, worker assignment, transfers, return, inspection,
    condition changes, and location.
    """
    ACTION_CHOICES = [
        ('DEVICE_REGISTRATION', 'Device Registered / Added to System'),
        ('COLLECTED_FROM_CLIENT', 'Collected from Client Company'),
        ('ASSIGNED_TO_COLLECTOR', 'Custody Assigned to Field Staff'),
        ('ASSIGNED_TO_WORKER', 'Equipment Assigned to Worker'),
        ('TRANSFER_INITIATED', 'Peer Transfer Initiated'),
        ('TRANSFER_ACCEPTED', 'Peer Transfer Accepted'),
        ('TRANSFER_REJECTED', 'Peer Transfer Rejected'),
        ('RETURN_COLLECTED', 'Device Return Collected from Worker'),
        ('INSPECTION_COMPLETED', 'Technical Inspection Finalized'),
        ('CONDITION_CHANGED', 'Condition Updated'),
        ('AUDITED_ADJUSTMENT', 'Audited Administrative Correction'),
        ('INCIDENT_REPORTED', 'Incident / Damage Reported'),
    ]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=60, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='device_activity_logs')
    actor_name = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=50, blank=True)
    details = models.TextField(blank=True)

    # Dynamic location coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_address = models.TextField(blank=True, default='')

    related_transaction_type = models.CharField(max_length=50, blank=True)
    related_transaction_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.device.asset_id} - {self.get_action_display()}"


class ScannerSession(models.Model):
    """
    Desktop-to-Mobile remote QR scanner session.
    Allows desktop scanning without re-login on mobile.
    """
    STATUS_CHOICES = [
        ('WAITING', 'Waiting for Mobile Connection'),
        ('PAIRED', 'Mobile Connected & Ready'),
        ('SCANNED', 'Scan Received'),
        ('DISCONNECTED', 'Session Closed'),
        ('EXPIRED', 'Session Expired'),
    ]

    session_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    pairing_token = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scanner_sessions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    paired_at = models.DateTimeField(null=True, blank=True)
    
    last_scanned_device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True)
    last_scanned_token = models.CharField(max_length=100, blank=True)
    last_scanned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_valid(self):
        return timezone.now() < self.expires_at and self.status != 'DISCONNECTED'

    def __str__(self):
        return f"Scanner Session {self.session_id} ({self.status}) for {self.user.username}"


class Task(models.Model):
    TASK_TYPE_CHOICES = [
        ('PICKUP', 'Client Pickup'),
        ('DELIVERY', 'Worker Handover'),
        ('RETURN', 'Worker Return Collection'),
        ('INSPECTION', 'Device Inspection'),
        ('TRANSFER', 'Operational Transfer'),
        ('MAINTENANCE', 'Repair / Maintenance'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]

    task_type = models.CharField(max_length=30, choices=TASK_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    assigned_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='assigned_tasks')
    client = models.ForeignKey(ClientCompany, on_delete=models.SET_NULL, null=True, blank=True)
    worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True)
    device = models.ForeignKey(Device, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_time = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    outcome = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_time']

    def __str__(self):
        return f"Task #{self.id}: {self.title} ({self.get_status_display()})"


class Incident(models.Model):
    INCIDENT_TYPE_CHOICES = [
        ('DAMAGE', 'Physical Damage'),
        ('LOSS', 'Device Lost / Missing'),
        ('DISCREPANCY', 'Inventory Discrepancy'),
        ('THEFT', 'Suspected Theft'),
        ('OTHER', 'Other Operational Issue'),
    ]

    STATUS_CHOICES = [
        ('REPORTED', 'Reported'),
        ('INVESTIGATING', 'Investigating'),
        ('RESOLVED', 'Resolved'),
    ]

    device = models.ForeignKey(Device, on_delete=models.PROTECT, related_name='incidents')
    incident_type = models.CharField(max_length=30, choices=INCIDENT_TYPE_CHOICES)
    reporter = models.ForeignKey(User, on_delete=models.PROTECT, related_name='reported_incidents')
    timestamp = models.DateTimeField(default=timezone.now)
    notes = models.TextField()
    evidence = models.ImageField(upload_to='incidents/evidence/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REPORTED')
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Incident #{self.id} on {self.device.asset_id}: {self.get_incident_type_display()}"


class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=100)
    record_type = models.CharField(max_length=100)
    record_id = models.CharField(max_length=100)
    timestamp = models.DateTimeField(default=timezone.now)
    safe_metadata = models.TextField(blank=True)
    ip_address = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        actor_name = self.actor.display_name if self.actor else "System"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {actor_name} - {self.action} on {self.record_type} #{self.record_id}"


# =====================================================================
# DYNAMIC OBJECT & FIELD BUILDER MODELS (METADATA-DRIVEN FORM BUILDER)
# =====================================================================

class ObjectDefinition(models.Model):
    """
    Metadata definition for a configurable business entity (e.g. Client, Worker, Client Contact).
    Admins can create new objects or configure fields on existing system objects.
    """
    name = models.CharField(max_length=100, help_text="Human-readable object name (e.g. Client Contact)")
    api_name = models.CharField(max_length=100, unique=True, db_index=True, help_text="Stable unique API identifier (e.g. client_contact)")
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='fa-cube', help_text="FontAwesome icon class")
    is_system = models.BooleanField(default=False, help_text="True if backed by core inventory system entities")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        ordering = ['name']
        verbose_name = "Object Definition"
        verbose_name_plural = "Object Definitions"

    def __str__(self):
        return f"{self.name} ({self.api_name})"

    @property
    def active_fields(self):
        return self.fields.filter(is_active=True).order_by('display_order', 'id')

    @property
    def field_count(self):
        return self.fields.count()

    @property
    def active_field_count(self):
        return self.fields.filter(is_active=True).count()


class FieldDefinition(models.Model):
    """
    Metadata definition for a configurable field belonging to an ObjectDefinition.
    Supports Salesforce-style attributes: type, required, choices, ordering, visibility, etc.
    """
    FIELD_TYPE_CHOICES = [
        ('text', 'Short Text'),
        ('textarea', 'Long Text / Textarea'),
        ('number', 'Number'),
        ('email', 'Email Address'),
        ('phone', 'Phone (Indian 10-Digit Mobile)'),
        ('date', 'Date'),
        ('datetime', 'Date & Time'),
        ('boolean', 'Checkbox / Boolean'),
        ('select', 'Picklist / Dropdown'),
        ('radio', 'Radio Buttons'),
        ('multiselect', 'Multi-Select Picklist'),
        ('file', 'File / Document Upload'),
        ('lookup', 'Lookup / Relationship'),
        ('readonly', 'Read-Only / System Generated'),
    ]

    object_definition = models.ForeignKey(ObjectDefinition, on_delete=models.CASCADE, related_name='fields')
    label = models.CharField(max_length=100, help_text="Display label shown on forms and tables")
    api_name = models.CharField(max_length=100, help_text="Internal key (e.g. secondary_phone). Cannot be changed once created if data exists.")
    field_type = models.CharField(max_length=30, choices=FIELD_TYPE_CHOICES, default='text')
    is_required = models.BooleanField(default=False, help_text="Whether this field must be filled before submission")
    help_text = models.CharField(max_length=255, blank=True, help_text="Contextual guidance shown below input")
    placeholder = models.CharField(max_length=255, blank=True, help_text="Placeholder inside input box")
    default_value = models.CharField(max_length=255, blank=True, help_text="Default pre-populated value")
    display_order = models.PositiveIntegerField(default=10, help_text="Order in form rendering")
    is_active = models.BooleanField(default=True, db_index=True, help_text="Deactivated fields are hidden without deleting historical data")
    is_searchable = models.BooleanField(default=False, help_text="Whether this field is included in text searches")
    show_in_list = models.BooleanField(default=False, help_text="Whether this field is displayed as a column in record list views")
    is_sensitive = models.BooleanField(default=False, help_text="Mask value for non-admin viewers (e.g. Aadhaar, bank details)")
    
    # Validation constraints
    min_value = models.FloatField(null=True, blank=True, help_text="Minimum numeric value or minimum text length")
    max_value = models.FloatField(null=True, blank=True, help_text="Maximum numeric value or maximum text length")
    validation_regex = models.CharField(max_length=255, blank=True, help_text="Optional regular expression for format validation")
    
    # Relationship / Lookup
    lookup_object = models.ForeignKey(ObjectDefinition, null=True, blank=True, on_delete=models.SET_NULL, related_name='+', help_text="Target object when field_type='lookup'")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'id']
        unique_together = ('object_definition', 'api_name')
        verbose_name = "Field Definition"
        verbose_name_plural = "Field Definitions"

    def __str__(self):
        return f"{self.object_definition.name} ➔ {self.label} ({self.api_name})"

    @property
    def active_choices(self):
        return self.choices.filter(is_active=True).order_by('display_order', 'id')

    @property
    def has_stored_data(self):
        """Checks whether this field has any stored values in records."""
        obj_key = self.object_definition.api_name
        key = self.api_name
        try:
            if obj_key == 'client':
                return ClientCompany.objects.filter(**{f"custom_fields__{key}__isnull": False}).exclude(**{f"custom_fields__{key}": ""}).exists()
            elif obj_key == 'client_contact':
                return ClientContact.objects.filter(**{f"custom_fields__{key}__isnull": False}).exclude(**{f"custom_fields__{key}": ""}).exists()
            elif obj_key == 'worker':
                return Worker.objects.filter(**{f"custom_fields__{key}__isnull": False}).exclude(**{f"custom_fields__{key}": ""}).exists()
            elif obj_key == 'employer_company':
                return EmployerCompany.objects.filter(**{f"custom_fields__{key}__isnull": False}).exclude(**{f"custom_fields__{key}": ""}).exists()
            elif obj_key == 'postman':
                return User.objects.filter(**{f"custom_fields__{key}__isnull": False}).exclude(**{f"custom_fields__{key}": ""}).exists()
            elif obj_key == 'mass_camera_assignment':
                return MassCameraAssignmentBatch.objects.filter(**{f"custom_fields__{key}__isnull": False}).exclude(**{f"custom_fields__{key}": ""}).exists()
            else:
                return DynamicRecord.objects.filter(object_definition=self.object_definition, **{f"data__{key}__isnull": False}).exclude(**{f"data__{key}": ""}).exists()
        except Exception:
            return False


class FieldChoice(models.Model):
    """
    Picklist or Radio choice option for select/radio/multiselect fields.
    Maintains a stable database value separate from its display label.
    """
    field_definition = models.ForeignKey(FieldDefinition, on_delete=models.CASCADE, related_name='choices')
    value = models.CharField(max_length=100, help_text="Stable stored value (e.g. 'high_priority')")
    label = models.CharField(max_length=150, help_text="User-facing display text (e.g. 'High Priority')")
    display_order = models.PositiveIntegerField(default=10)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['display_order', 'id']
        unique_together = ('field_definition', 'value')

    def __str__(self):
        return f"{self.label} ({self.value})"


class DynamicRecord(models.Model):
    """
    Generic record container for custom dynamic objects, or unified search/indexing over entities.
    """
    object_definition = models.ForeignKey(ObjectDefinition, on_delete=models.CASCADE, related_name='records')
    record_id = models.CharField(max_length=64, unique=True, db_index=True)
    name = models.CharField(max_length=255, help_text="Primary record title/name for identification")
    data = models.JSONField(default=dict, blank=True, help_text="Map of field api_name -> value")
    related_model = models.CharField(max_length=50, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='dynamic_records_created')
    updated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='dynamic_records_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.object_definition.name}] {self.name} (#{self.record_id})"


class MassCameraAssignmentBatch(models.Model):
    """
    Tracks a mass assignment batch execution where multiple devices are simultaneously assigned
    to target workers. Retains explicit individual Device, Assignment, and Movement history.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('COMPLETED', 'Completed Successfully'),
        ('PARTIAL', 'Completed with Exceptions'),
        ('FAILED', 'Failed / Rolled Back'),
    ]

    batch_id = models.CharField(max_length=64, unique=True, db_index=True)
    actor = models.ForeignKey(User, on_delete=models.PROTECT, related_name='mass_assignments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COMPLETED')
    total_devices = models.PositiveIntegerField(default=0)
    successful_assignments = models.PositiveIntegerField(default=0)
    failed_assignments = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)
    summary_report = models.JSONField(default=list, blank=True, help_text="Detailed row-by-row assignment outcomes")
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Mass Batch #{self.batch_id} ({self.successful_assignments}/{self.total_devices} devices) by {self.actor.display_name}"
