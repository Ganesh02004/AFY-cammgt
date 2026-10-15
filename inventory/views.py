import csv
import json
import os
import shutil
import socket
import time
from io import BytesIO
import qrcode
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout, authenticate, update_session_auth_hash
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile

from .models import (
    User, ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Pickup, PickupDevice, Assignment, Transfer,
    DeviceReturn, DeviceMovement, DeviceActivityLog, ScannerSession,
    Task, Incident, AuditLog
)
from .forms import (
    PickupHeaderForm, DeviceIntakeRowForm, AssignmentForm,
    TransferInitiateForm, ReturnProcessForm, InspectionCompleteForm,
    AuditedAdjustmentForm, IncidentReportForm, IncidentResolveForm,
    TaskForm, ClientCompanyForm, ClientContactForm,
    EmployerCompanyForm, WorkerForm, UserManagementForm,
    UserRegistrationForm, ChangePasswordForm, DataPurgeForm,
    UserProfileCompletionForm, UserProfileUpdateForm
)
from .validators import clean_indian_phone, validate_indian_mobile
from .services import (
    intake_devices, assign_device_to_worker, initiate_transfer,
    accept_transfer, reject_transfer, cancel_transfer,
    process_return, complete_inspection, audited_adjustment,
    record_audit_log, create_remote_scanner_session,
    pair_remote_scanner, record_remote_scan_result
)
from .firebase_service import (
    verify_firebase_id_token, delete_device_from_rtdb,
    sync_client_to_rtdb, sync_contact_to_rtdb, sync_worker_to_rtdb
)
from .decorators import admin_required, management_or_admin_required


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def get_server_lan_ip():
    """Detects local network IP for mobile-to-desktop pairing QR code."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


# ==========================================
# AUTHENTICATION
# ==========================================

def login_view(request):
    if request.user.is_authenticated:
        if not request.user.is_profile_completed:
            return redirect('complete_profile')
        if request.user.is_pending:
            return redirect('pending_approval')
        return redirect('dashboard')

    if request.method == 'POST':
        username_input = request.POST.get('username', '').strip()
        password_input = request.POST.get('password', '')

        user_candidate = User.objects.filter(
            Q(username__iexact=username_input) | Q(email__iexact=username_input)
        ).first()

        if user_candidate and user_candidate.check_password(password_input):
            if user_candidate.is_pending:
                messages.warning(request, "Your account registration is currently pending Administrator Approval.")
                return render(request, 'inventory/login.html')

            if user_candidate.is_deactivated:
                messages.error(request, "Your account has been deactivated or rejected by an Administrator.")
                return render(request, 'inventory/login.html')

            login(request, user_candidate)
            request.session['last_activity'] = time.time()
            record_audit_log(user_candidate, "LOGIN", "User", user_candidate.id, f"User {user_candidate.username} logged in", get_client_ip(request))

            if not user_candidate.is_profile_completed:
                return redirect('complete_profile')
            if user_candidate.is_pending:
                return redirect('pending_approval')

            messages.success(request, f"Welcome to AFY Camera Inventory Management, {user_candidate.display_name}!")
            next_url = request.GET.get('next')
            return redirect(next_url or 'dashboard')
        else:
            messages.error(request, "Invalid username or password. Please try again.")

    expired = request.GET.get('expired') == '1'
    return render(request, 'inventory/login.html', {'session_expired': expired})


def register_view(request):
    """
    Self-registration portal allowing new staff members to sign up with Email & Password.
    Stores requested role and marks account as pending Administrator approval.
    """
    if request.user.is_authenticated:
        return redirect('dashboard')

    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            new_user = form.save(commit=False)
            firebase_token = request.POST.get('firebase_token')
            if firebase_token:
                decoded = verify_firebase_id_token(firebase_token)
                if decoded and decoded.get('uid'):
                    new_user.firebase_uid = decoded.get('uid')
                    new_user.email_verified = decoded.get('email_verified', False)
            new_user.save()
            record_audit_log(new_user, "USER_REGISTERED", "User", new_user.id, f"Self-registered user pending approval ({new_user.username}, Role: {new_user.role})", get_client_ip(request))
            login(request, new_user)
            request.session['last_activity'] = time.time()
            return redirect('complete_profile')
    else:
        form = UserRegistrationForm()
    return render(request, 'inventory/register.html', {'form': form})


@csrf_exempt
def firebase_login_api(request):
    """
    Handles Firebase client-side Authentication login & registration for both
    Google Sign-In and Email/Password Sign-In.
    Verifies Firebase ID Token authoritatively with Google backend, establishes
    the authenticated session, and enforces profile completion and admin approval.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        id_token = data.get('idToken')
        if not id_token:
            return JsonResponse({'error': 'Missing idToken'}, status=400)

        decoded = verify_firebase_id_token(id_token)
        if not decoded:
            return JsonResponse({'error': 'Invalid or expired Firebase token. Please re-authenticate.'}, status=401)

        email = decoded.get('email', '').strip()
        uid = decoded.get('uid')
        name = decoded.get('name', '').strip()
        email_verified = decoded.get('email_verified', False)

        # Match existing user by firebase_uid or email
        user = None
        if uid:
            user = User.objects.filter(firebase_uid=uid).first()
        if not user and email:
            user = User.objects.filter(email__iexact=email).first()

        if user:
            # Update firebase_uid and email_verified if needed
            if not user.firebase_uid and uid:
                user.firebase_uid = uid
            if email_verified:
                user.email_verified = True
            user.save()

            if user.is_deactivated:
                return JsonResponse({
                    'success': False,
                    'error': "Your account is not active or has been deactivated by an Administrator."
                }, status=403)

            login(request, user)
            request.session['last_activity'] = time.time()
            record_audit_log(user, "FIREBASE_LOGIN", "User", user.id, f"Firebase Auth Login ({user.email})", get_client_ip(request))

            if not user.is_profile_completed:
                return JsonResponse({
                    'success': True,
                    'needs_profile_completion': True,
                    'redirectUrl': '/complete-profile/',
                    'user': {'username': user.username, 'displayName': user.display_name}
                })

            if user.is_pending:
                return JsonResponse({
                    'success': True,
                    'pending_approval': True,
                    'redirectUrl': '/pending-approval/',
                    'user': {'username': user.username, 'displayName': user.display_name}
                })

            return JsonResponse({
                'success': True,
                'redirectUrl': '/dashboard/',
                'user': {
                    'username': user.username,
                    'displayName': user.display_name,
                    'role': user.get_role_display()
                }
            })

        # New user via Firebase Google or Email/Password Auth
        base_username = (email.split('@')[0] if email else uid)[:25]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        first_name = name.split()[0] if name else 'User'
        last_name = ' '.join(name.split()[1:]) if name and len(name.split()) > 1 else ''

        new_user = User.objects.create(
            username=username,
            email=email or f"{uid}@firebase.afy.local",
            firebase_uid=uid,
            first_name=first_name,
            last_name=last_name,
            role='POSTMAN',
            requested_role='POSTMAN',
            approval_status='PENDING',
            is_active=True,
            is_profile_completed=False,
            email_verified=email_verified
        )
        record_audit_log(new_user, "USER_REGISTERED", "User", new_user.id, f"Firebase Signup ({new_user.email})", get_client_ip(request))

        login(request, new_user)
        request.session['last_activity'] = time.time()

        return JsonResponse({
            'success': True,
            'needs_profile_completion': True,
            'redirectUrl': '/complete-profile/',
            'user': {
                'username': new_user.username,
                'displayName': new_user.display_name,
            }
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def complete_profile_view(request):
    """
    Mandatory profile completion for first-time authenticated users.
    Collects full name, profile photo, Indian mobile, requested role, address,
    and work location before submitting for Administrator approval.
    """
    user = request.user
    if user.is_profile_completed:
        if user.is_pending:
            return redirect('pending_approval')
        return redirect('dashboard')

    if request.method == 'POST':
        form = UserProfileCompletionForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            u = form.save(commit=False)
            u.role = u.requested_role
            u.is_profile_completed = True
            u.approval_status = 'PENDING'
            u.save()

            record_audit_log(
                u, "PROFILE_COMPLETED", "User", u.id,
                f"User completed profile: {u.display_name}, requested role {u.get_requested_role_display()}",
                get_client_ip(request)
            )

            # Sync updated profile to Firebase Realtime Database
            try:
                from .firebase_service import rtdb_rest_call
                rtdb_rest_call('PATCH', f"users/{u.id}", {
                    'username': u.username,
                    'displayName': u.display_name,
                    'email': u.email,
                    'phone': u.phone,
                    'requested_role': u.requested_role,
                    'approval_status': u.approval_status,
                    'work_location': u.work_location,
                })
            except Exception:
                pass

            messages.success(request, f"Thank you, {u.display_name}! Your profile has been completed and submitted for Administrator approval.")
            return redirect('pending_approval')
        else:
            messages.error(request, "Please fix the errors in your profile form below.")
    else:
        form = UserProfileCompletionForm(instance=user)

    return render(request, 'inventory/complete_profile.html', {
        'form': form,
        'user': user,
    })


@login_required
def pending_approval_view(request):
    """
    Status screen displayed to users whose accounts are awaiting Administrator approval.
    Prevents access to inventory features while informing the user of their status.
    """
    user = request.user
    if user.is_approved:
        return redirect('dashboard')
    if not user.is_profile_completed:
        return redirect('complete_profile')

    return render(request, 'inventory/pending_approval.html', {
        'user': user,
    })


@login_required
def profile_view(request):
    """
    Allows approved staff members to view and update their personal details and photograph.
    Cannot modify approved role or approval status.
    """
    user = request.user
    if request.method == 'POST':
        form = UserProfileUpdateForm(request.POST, request.FILES, instance=user)
        if form.is_valid():
            form.save()
            messages.success(request, "Your profile details have been updated successfully.")
            return redirect('profile')
        else:
            messages.error(request, "Please correct the errors in the form.")
    else:
        form = UserProfileUpdateForm(instance=user)

    return render(request, 'inventory/profile.html', {
        'form': form,
        'user': user,
    })


@login_required
def logout_view(request):
    record_audit_log(request.user, "LOGOUT", "User", request.user.id, "User logged out", get_client_ip(request))
    logout(request)
    request.session.flush()
    messages.info(request, "You have been securely logged out.")
    return redirect('login')


@login_required
def session_keepalive_api(request):
    """
    Heartbeat endpoint called by user activity or 'I'm Still Working' action.
    SessionInactivityMiddleware automatically updates request.session['last_activity'].
    """
    return JsonResponse({'status': 'ok', 'active': True, 'expires_in': 300})


# ==========================================
# DASHBOARD
# ==========================================

@login_required
def dashboard_view(request):
    user = request.user

    # Real-time database metrics
    total_devices = Device.objects.count()
    available_stock = Device.objects.filter(current_status='AVAILABLE_STORAGE', current_custodian_type='STORAGE').count()
    with_collectors = Device.objects.filter(current_custodian_type='USER').count()
    assigned_workers = Device.objects.filter(current_status='ASSIGNED_WORKER').count()
    awaiting_inspection = Device.objects.filter(current_status='AWAITING_INSPECTION').count()
    damaged_or_lost = Device.objects.filter(current_status__in=['DAMAGED', 'LOST']).count()

    pending_pickups = Pickup.objects.filter(status__in=['SCHEDULED', 'IN_PROGRESS']).count()
    pending_transfers = Transfer.objects.filter(status='PENDING').count()
    
    today = timezone.now().date()
    overdue_returns = Assignment.objects.filter(status='ACTIVE', expected_return_date__lt=today).count()

    active_clients = ClientCompany.objects.filter(status='ACTIVE').count()
    active_workers = Worker.objects.count()
    active_users = User.objects.filter(is_active=True).count()

    # User personal inventory quick stat
    my_inventory_count = Device.objects.filter(current_custodian_type='USER', current_custodian_user=user).count()
    my_pending_transfers = Transfer.objects.filter(receiver=user, status='PENDING').count()

    # Recent activity
    if user.is_admin:
        recent_movements = DeviceMovement.objects.select_related('device', 'actor')[:8]
    else:
        recent_movements = DeviceMovement.objects.filter(
            Q(actor=user) | Q(device__current_custodian_user=user)
        ).select_related('device', 'actor')[:8]

    # User tasks
    my_tasks = Task.objects.filter(assigned_user=user, status__in=['PENDING', 'IN_PROGRESS'])[:5]

    context = {
        'total_devices': total_devices,
        'available_stock': available_stock,
        'with_collectors': with_collectors,
        'assigned_workers': assigned_workers,
        'awaiting_inspection': awaiting_inspection,
        'damaged_or_lost': damaged_or_lost,
        'pending_pickups': pending_pickups,
        'pending_transfers': pending_transfers,
        'overdue_returns': overdue_returns,
        'active_clients': active_clients,
        'active_workers': active_workers,
        'active_users': active_users,
        'my_inventory_count': my_inventory_count,
        'my_pending_transfers': my_pending_transfers,
        'recent_movements': recent_movements,
        'my_tasks': my_tasks,
    }
    return render(request, 'inventory/dashboard.html', context)


# ==========================================
# INVENTORIES (MY INVENTORY & MASTER INVENTORY)
# ==========================================

@login_required
def my_inventory_view(request):
    user = request.user

    # Only devices where the logged in user is the current custodian
    devices = Device.objects.filter(
        current_custodian_type='USER',
        current_custodian_user=user
    ).select_related('source_client')

    # Pending incoming transfers waiting for acceptance by current user
    incoming_transfers = Transfer.objects.filter(
        receiver=user,
        status='PENDING'
    ).select_related('device', 'sender')

    # Outgoing pending transfers sent by current user
    outgoing_transfers = Transfer.objects.filter(
        sender=user,
        status='PENDING'
    ).select_related('device', 'receiver')

    context = {
        'devices': devices,
        'incoming_transfers': incoming_transfers,
        'outgoing_transfers': outgoing_transfers,
        'devices_count': devices.count(),
    }
    return render(request, 'inventory/my_inventory.html', context)


@login_required
@admin_required
def company_master_inventory_view(request):
    """Admin-only master inventory showing all devices across the enterprise."""
    query = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', '').strip()
    custodian_type_filter = request.GET.get('custodian_type', '').strip()
    client_filter = request.GET.get('client', '').strip()
    device_type_filter = request.GET.get('device_type', '').strip()

    devices = Device.objects.select_related(
        'source_client', 'current_custodian_user', 'current_custodian_worker'
    ).all()

    if query:
        devices = devices.filter(
            Q(asset_id__icontains=query) |
            Q(brand_and_model__icontains=query) |
            Q(imei_or_serial__icontains=query) |
            Q(notes__icontains=query)
        )

    if status_filter:
        devices = devices.filter(current_status=status_filter)

    if custodian_type_filter:
        devices = devices.filter(current_custodian_type=custodian_type_filter)

    if client_filter:
        devices = devices.filter(source_client_id=client_filter)

    if device_type_filter:
        devices = devices.filter(device_type=device_type_filter)

    clients = ClientCompany.objects.filter(status='ACTIVE')

    context = {
        'devices': devices,
        'total_count': devices.count(),
        'clients': clients,
        'query': query,
        'status_filter': status_filter,
        'custodian_type_filter': custodian_type_filter,
        'client_filter': client_filter,
        'device_type_filter': device_type_filter,
        'status_choices': Device.STATUS_CHOICES,
        'custodian_choices': Device.CUSTODIAN_TYPE_CHOICES,
        'device_type_choices': Device.DEVICE_TYPE_CHOICES,
    }
    return render(request, 'inventory/master_inventory.html', context)


# ==========================================
# DEVICE DETAILS, QR & LABELS
# ==========================================

@login_required
def device_detail_view(request, device_id):
    device = get_object_or_404(
        Device.objects.select_related(
            'source_client', 'initial_poc', 'current_custodian_user', 'current_custodian_worker'
        ),
        id=device_id
    )

    user = request.user
    if user.is_postman and not (
        device.current_custodian_user == user or
        device.movements.filter(actor=user).exists() or
        request.GET.get('via_qr') == '1'
    ):
        messages.error(request, "You do not have access to view this device record.")
        return redirect('my_inventory')

    movements = device.movements.select_related('actor').all()
    activity_logs = device.activity_logs.select_related('actor').all()
    assignments = device.assignments.select_related('worker', 'delivering_user').all()
    transfers = device.transfers.select_related('sender', 'receiver').all()
    returns = device.returns.select_related('worker', 'receiving_user', 'inspector').all()
    incidents = device.incidents.select_related('reporter').all()

    # Determine permitted actions
    can_assign = (user.is_admin or (device.current_custodian_type == 'USER' and device.current_custodian_user == user)) and device.current_status not in ['ASSIGNED_WORKER', 'DAMAGED', 'LOST', 'RETIRED', 'RETURNED_TO_CLIENT']
    can_transfer = (user.is_admin or (device.current_custodian_type == 'USER' and device.current_custodian_user == user))
    can_return = device.current_status == 'ASSIGNED_WORKER'
    can_inspect = device.current_status == 'AWAITING_INSPECTION'
    can_adjust = user.is_admin

    active_assignment = device.assignments.filter(status='ACTIVE').first()

    context = {
        'device': device,
        'movements': movements,
        'activity_logs': activity_logs,
        'assignments': assignments,
        'active_assignment': active_assignment,
        'transfers': transfers,
        'returns': returns,
        'incidents': incidents,
        'can_assign': can_assign,
        'can_transfer': can_transfer,
        'can_return': can_return,
        'can_inspect': can_inspect,
        'can_adjust': can_adjust,
    }
    return render(request, 'inventory/device_detail.html', context)


@login_required
def device_qr_lookup_view(request, qr_token):
    """
    Public-safe URL endpoint encoded in QR codes: /device/qr/<uuid>/
    Never changes custody automatically upon scan.
    Opens authenticated device record with ?via_qr=1.
    """
    device = get_object_or_404(Device, qr_token=qr_token)
    return redirect(f"/device/{device.id}/?via_qr=1")


@login_required
@admin_required
def device_delete_view(request, device_id):
    """
    Allows an administrator to permanently delete an individual device
    from inventory by verifying their administrator password.
    """
    device = get_object_or_404(Device, id=device_id)

    if request.method != 'POST':
        return redirect('device_detail', device_id=device.id)

    admin_password = request.POST.get('admin_password', '').strip()
    reason = request.POST.get('deletion_reason', '').strip()

    if not admin_password:
        messages.error(request, "Administrator password is required to delete a device.")
        return redirect('device_detail', device_id=device.id)

    if not request.user.check_password(admin_password):
        messages.error(request, "Incorrect administrator password. Device deletion rejected.")
        return redirect('device_detail', device_id=device.id)

    asset_id = device.asset_id
    brand_model = device.brand_and_model

    # Remove QR code file if exists on disk
    if device.qr_code_image:
        try:
            if os.path.isfile(device.qr_code_image.path):
                os.remove(device.qr_code_image.path)
        except Exception:
            pass

    # Permanently delete device and its associated records atomically
    with transaction.atomic():
        device.activity_logs.all().delete()
        device.movements.all().delete()
        device.assignments.all().delete()
        device.transfers.all().delete()
        device.returns.all().delete()
        device.incidents.all().delete()
        device.pickup_records.all().delete()
        device.delete()

    # Synchronize deletion to Firebase Realtime Database
    try:
        delete_device_from_rtdb(asset_id)
    except Exception:
        pass

    record_audit_log(
        request.user,
        "DEVICE_DELETED",
        "Device",
        str(device_id),
        f"Admin {request.user.username} deleted device {asset_id} ({brand_model}). Reason: {reason or 'Not specified'}",
        get_client_ip(request)
    )

    messages.success(request, f"Device '{asset_id}' ({brand_model}) has been permanently deleted from inventory.")
    return redirect('master_inventory')


# ==========================================
# QR SCANNER & REMOTE DESKTOP-TO-MOBILE PAIRING
# ==========================================

@login_required
def qr_scanner_view(request):
    """
    Desktop & Mobile QR Scanner.
    On Desktop, generates a temporary pairing token and QR code allowing the user
    to scan via their mobile camera without logging in again!
    """
    user = request.user

    # Handle manual fallback search POST
    if request.method == 'POST':
        search_term = request.POST.get('search_term', '').strip()
        if search_term:
            device = Device.objects.filter(
                Q(asset_id__iexact=search_term) |
                Q(imei_or_serial__iexact=search_term) |
                Q(qr_token__iexact=search_term)
            ).first()
            if device:
                return redirect(f"/device/{device.id}/?via_qr=1")
            else:
                messages.error(request, f"No device found matching '{search_term}'.")

    # Generate or retrieve active desktop remote scanner session
    session = create_remote_scanner_session(user)

    # Determine server host IP so mobile can access from local Wi-Fi / network
    lan_ip = get_server_lan_ip()
    host_port = request.get_host().split(':')[-1] if ':' in request.get_host() else '8000'
    pairing_url = f"http://{lan_ip}:{host_port}/scan/remote/{session.pairing_token}/"

    # Generate QR Code for Mobile Pairing
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=6,
        border=2,
    )
    qr.add_data(pairing_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    import base64
    buf = BytesIO()
    img.save(buf, format="PNG")
    pairing_qr_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')

    context = {
        'scanner_session': session,
        'pairing_url': pairing_url,
        'pairing_qr_base64': pairing_qr_base64,
        'lan_ip': lan_ip,
    }
    return render(request, 'inventory/qr_scanner.html', context)


def remote_scanner_view(request, pairing_token):
    """
    Mobile scanner page opened on the phone when scanning the desktop's pairing QR code.
    Does NOT require the user to log in again on the mobile phone!
    Allows continuous scanning of physical device QR stickers directly to the desktop session.
    """
    session, error = pair_remote_scanner(pairing_token)
    if error:
        return render(request, 'inventory/remote_scanner_error.html', {'error_message': error})

    context = {
        'session': session,
        'pairing_token': pairing_token,
        'desktop_user': session.user,
    }
    return render(request, 'inventory/remote_scanner_mobile.html', context)


@csrf_exempt
def scanner_session_scan_api(request, pairing_token):
    """
    API endpoint called by the paired mobile phone when it scans a physical device QR code.
    Updates the session and broadcasts to the desktop in real time.
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        scanned_value = data.get('scanned_value', '').strip()
        if not scanned_value:
            return JsonResponse({'error': 'Empty scan value'}, status=400)

        session, error = record_remote_scan_result(pairing_token, scanned_value)
        if error:
            return JsonResponse({'error': error}, status=400)

        device = session.last_scanned_device
        device_data = None
        if device:
            device_data = {
                'id': device.id,
                'asset_id': device.asset_id,
                'brand_and_model': device.brand_and_model,
                'current_status': device.get_current_status_display(),
                'custodian': device.custodian_display,
                'is_assigned': device.current_status == 'ASSIGNED_WORKER',
                'worker_name': device.current_custodian_worker.name if device.current_custodian_worker else '',
            }

        return JsonResponse({
            'success': True,
            'device': device_data,
            'raw_value': scanned_value,
            'message': f"Scanned: {device.asset_id if device else scanned_value}"
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
def scanner_session_status_api(request, session_id):
    """
    API polled by the desktop scanning interface (or listened via Firestore).
    Returns latest mobile scanner status and last scanned device.
    """
    try:
        session = ScannerSession.objects.select_related('last_scanned_device', 'last_scanned_device__current_custodian_worker').get(
            session_id=session_id, user=request.user
        )
    except ScannerSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)

    device = session.last_scanned_device
    device_data = None
    if device:
        active_assignment = device.assignments.filter(status='ACTIVE').select_related('worker').first()
        device_data = {
            'id': device.id,
            'asset_id': device.asset_id,
            'brand_and_model': device.brand_and_model,
            'device_type': device.get_device_type_display(),
            'imei_or_serial': device.imei_or_serial or 'N/A',
            'condition': device.get_condition_display(),
            'current_status': device.get_current_status_display(),
            'status_badge_class': device.status_badge_class,
            'custodian': device.custodian_display,
            'is_assigned': device.current_status == 'ASSIGNED_WORKER',
            'worker_name': active_assignment.worker.name if active_assignment else '',
            'worker_id': active_assignment.worker.worker_id if active_assignment else '',
            'client_name': device.source_client.name if device.source_client else '',
            'detail_url': f"/device/{device.id}/?via_qr=1",
            'assign_url': f"/assign/{device.id}/",
            'transfer_url': f"/transfer/{device.id}/",
            'return_url': f"/returns/quick/{device.id}/",
        }

    return JsonResponse({
        'session_id': str(session.session_id),
        'status': session.status,
        'status_display': session.get_status_display(),
        'paired_at': session.paired_at.isoformat() if session.paired_at else None,
        'last_scanned_at': session.last_scanned_at.isoformat() if session.last_scanned_at else None,
        'device': device_data,
        'is_valid': session.is_valid,
    })


@csrf_exempt
@login_required
def scanner_session_disconnect_api(request, session_id):
    """Closes and disconnects a desktop remote scanner session."""
    ScannerSession.objects.filter(session_id=session_id, user=request.user).update(status='DISCONNECTED')
    return JsonResponse({'success': True})


# ==========================================
# DYNAMIC CLIENT POC API (REQUIREMENT 6)
# ==========================================

@login_required
def client_contacts_api_view(request, client_id):
    """
    Returns only the active Contacts (POCs) for a selected Client Company.
    Allows dynamic filtering of the Contact Person dropdown upon client selection.
    """
    contacts = ClientContact.objects.filter(client_id=client_id, is_active=True).values(
        'id', 'name', 'designation', 'phone', 'email'
    )
    return JsonResponse({'contacts': list(contacts)})


@login_required
def device_label_print_view(request, device_id):
    """Printable barcode/QR label template designed for thermal or standard sticker paper."""
    device = get_object_or_404(Device, id=device_id)
    return render(request, 'inventory/device_label_print.html', {'device': device})


# ==========================================
# WORKFLOW: INTAKE / COLLECT FROM CLIENT
# ==========================================

@login_required
def collect_from_client_view(request):
    user = request.user

    if request.method == 'POST':
        header_form = PickupHeaderForm(request.POST)
        if header_form.is_valid():
            client = header_form.cleaned_data['client']
            actual_poc = header_form.cleaned_data['actual_poc']
            collecting_user = header_form.cleaned_data['collecting_user']
            scheduled_time = header_form.cleaned_data['scheduled_time']
            location = header_form.cleaned_data['location']
            location_address = header_form.cleaned_data.get('location_address') or location
            latitude = header_form.cleaned_data.get('latitude')
            longitude = header_form.cleaned_data.get('longitude')
            notes = header_form.cleaned_data['pickup_notes']

            if user.is_postman and collecting_user != user:
                collecting_user = user

            types = request.POST.getlist('device_type[]')
            models_list = request.POST.getlist('brand_and_model[]')
            serials = request.POST.getlist('imei_or_serial[]')
            conditions = request.POST.getlist('condition[]')
            accessories_list = request.POST.getlist('accessories[]')
            notes_list = request.POST.getlist('notes[]')

            devices_data = []
            for i in range(len(models_list)):
                b_model = models_list[i].strip()
                if not b_model:
                    continue
                devices_data.append({
                    'device_type': types[i] if i < len(types) else 'CAMERA',
                    'brand_and_model': b_model,
                    'imei_or_serial': serials[i].strip() if i < len(serials) else '',
                    'condition': conditions[i] if i < len(conditions) else 'GOOD',
                    'accessories': accessories_list[i].strip() if i < len(accessories_list) else '',
                    'notes': notes_list[i].strip() if i < len(notes_list) else '',
                })

            if not devices_data:
                messages.error(request, "Please add at least one physical device to complete intake.")
            else:
                try:
                    pickup, created_devices = intake_devices(
                        client=client,
                        collecting_user=collecting_user,
                        devices_data=devices_data,
                        actual_poc=actual_poc,
                        scheduled_time=scheduled_time,
                        notes=notes,
                        location=location_address or location,
                        latitude=latitude,
                        longitude=longitude
                    )
                    messages.success(
                        request,
                        f"Successfully completed pickup #{pickup.id}. Added {len(created_devices)} devices to {collecting_user.display_name}'s custody inventory!"
                    )
                    return redirect('my_inventory' if user.is_postman else 'pickup_detail', pickup_id=pickup.id)
                except ValidationError as e:
                    messages.error(request, str(e.message if hasattr(e, 'message') else e))
                except Exception as ex:
                    messages.error(request, f"Intake error: {str(ex)}")
        else:
            messages.error(request, "Please fill in all required pickup details correctly.")
    else:
        initial_user = user
        header_form = PickupHeaderForm(initial={'collecting_user': initial_user})

    return render(request, 'inventory/collect_from_client.html', {
        'header_form': header_form,
        'device_type_choices': Device.DEVICE_TYPE_CHOICES,
        'condition_choices': Device.CONDITION_CHOICES,
    })


@login_required
def pickup_detail_view(request, pickup_id):
    pickup = get_object_or_404(
        Pickup.objects.select_related('client', 'actual_poc', 'collecting_user'),
        id=pickup_id
    )
    items = pickup.pickup_devices.select_related('device').all()
    return render(request, 'inventory/pickup_detail.html', {'pickup': pickup, 'items': items})


# ==========================================
# WORKFLOW: ASSIGN TO WORKER
# ==========================================

@login_required
def assign_to_worker_view(request, device_id=None):
    user = request.user
    device = None

    if device_id:
        device = get_object_or_404(Device, id=device_id)
        if not user.is_admin and (device.current_custodian_type != 'USER' or device.current_custodian_user != user):
            messages.error(request, f"Device {device.asset_id} is not in your custody. You cannot assign it.")
            return redirect('my_inventory')

    if request.method == 'POST':
        if not device:
            selected_device_id = request.POST.get('device_id')
            device = get_object_or_404(Device, id=selected_device_id)

        form = AssignmentForm(request.POST)
        if form.is_valid():
            worker = form.cleaned_data['worker']
            condition = form.cleaned_data['condition']
            accessories = form.cleaned_data['accessories']
            acknowledgement = form.cleaned_data['acknowledgement']
            expected_return_date = form.cleaned_data['expected_return_date']
            notes = form.cleaned_data['notes']
            latitude = form.cleaned_data.get('latitude')
            longitude = form.cleaned_data.get('longitude')
            location_address = form.cleaned_data.get('location_address')

            try:
                assignment = assign_device_to_worker(
                    device=device,
                    worker=worker,
                    delivering_user=user,
                    condition=condition,
                    accessories=accessories,
                    acknowledgement=acknowledgement,
                    expected_return_date=expected_return_date,
                    notes=notes,
                    latitude=latitude,
                    longitude=longitude,
                    location_address=location_address
                )
                messages.success(
                    request,
                    f"Device {device.asset_id} successfully assigned to worker {worker.name} ({worker.worker_id}). Removed from your custody inventory."
                )
                return redirect('device_detail', device_id=device.id)
            except ValidationError as err:
                messages.error(request, str(err.message if hasattr(err, 'message') else err))
            except Exception as e:
                messages.error(request, f"Assignment failed: {str(e)}")
    else:
        initial_data = {}
        if device:
            initial_data['condition'] = device.condition
            initial_data['accessories'] = device.accessories
        form = AssignmentForm(initial=initial_data)

    if user.is_admin:
        eligible_devices = Device.objects.filter(
            current_status__in=['WITH_COLLECTOR', 'AVAILABLE_STORAGE']
        )
    else:
        eligible_devices = Device.objects.filter(
            current_custodian_type='USER',
            current_custodian_user=user,
            current_status='WITH_COLLECTOR'
        )

    return render(request, 'inventory/assign_to_worker.html', {
        'form': form,
        'device': device,
        'eligible_devices': eligible_devices,
    })


# ==========================================
# WORKFLOW: TRANSFER BETWEEN USERS
# ==========================================

@login_required
def transfer_initiate_view(request, device_id):
    user = request.user
    device = get_object_or_404(Device, id=device_id)

    if not user.is_admin and (device.current_custodian_type != 'USER' or device.current_custodian_user != user):
        messages.error(request, f"Device {device.asset_id} is not in your custody.")
        return redirect('my_inventory')

    if request.method == 'POST':
        form = TransferInitiateForm(request.POST)
        if form.is_valid():
            receiver = form.cleaned_data['receiver']
            condition = form.cleaned_data['condition']
            notes = form.cleaned_data['notes']
            latitude = form.cleaned_data.get('latitude')
            longitude = form.cleaned_data.get('longitude')
            location_address = form.cleaned_data.get('location_address')

            try:
                transfer = initiate_transfer(
                    device=device,
                    sender=user,
                    receiver=receiver,
                    condition=condition,
                    notes=notes,
                    latitude=latitude,
                    longitude=longitude,
                    location_address=location_address
                )
                messages.success(
                    request,
                    f"Transfer initiated! Device {device.asset_id} is awaiting acceptance by {receiver.display_name}. Custody remains with you until accepted."
                )
                return redirect('transfer_list')
            except ValidationError as err:
                messages.error(request, str(err.message if hasattr(err, 'message') else err))
            except Exception as e:
                messages.error(request, f"Transfer initiation failed: {str(e)}")
    else:
        form = TransferInitiateForm(initial={'condition': device.condition})
        form.fields['receiver'].queryset = User.objects.filter(is_active=True).exclude(id=user.id)

    return render(request, 'inventory/transfer_initiate.html', {'form': form, 'device': device})


@login_required
def transfer_list_view(request):
    user = request.user

    incoming = Transfer.objects.filter(receiver=user, status='PENDING').select_related('device', 'sender')
    outgoing = Transfer.objects.filter(sender=user, status='PENDING').select_related('device', 'receiver')
    
    if user.is_admin:
        history = Transfer.objects.exclude(status='PENDING').select_related('device', 'sender', 'receiver')[:20]
    else:
        history = Transfer.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).exclude(status='PENDING').select_related('device', 'sender', 'receiver')[:20]

    return render(request, 'inventory/transfer_list.html', {
        'incoming': incoming,
        'outgoing': outgoing,
        'history': history,
    })


@login_required
def transfer_action_view(request, transfer_id, action):
    transfer = get_object_or_404(Transfer, id=transfer_id)
    user = request.user

    try:
        if action == 'accept':
            lat = request.POST.get('latitude')
            lng = request.POST.get('longitude')
            addr = request.POST.get('location_address', '')
            accept_transfer(transfer, user, latitude=lat, longitude=lng, location_address=addr)
            messages.success(request, f"Transfer accepted! Custody of {transfer.device.asset_id} has been moved to your inventory.")
        elif action == 'reject':
            reason = request.POST.get('reason', '')
            reject_transfer(transfer, user, reason)
            messages.info(request, f"Transfer for {transfer.device.asset_id} was rejected.")
        elif action == 'cancel':
            cancel_transfer(transfer, user)
            messages.info(request, f"Transfer for {transfer.device.asset_id} was cancelled.")
        else:
            messages.error(request, "Unknown action.")
    except ValidationError as err:
        messages.error(request, str(err.message if hasattr(err, 'message') else err))
    except Exception as e:
        messages.error(request, f"Action failed: {str(e)}")

    return redirect('transfer_list')


# ==========================================
# WORKFLOW: RETURN & INSPECTIONS (QR-BASED)
# ==========================================

@login_required
def return_process_view(request, device_id=None):
    user = request.user
    device = None

    if device_id:
        device = get_object_or_404(Device, id=device_id)

    if request.method == 'POST':
        if not device:
            selected_device_id = request.POST.get('device_id')
            device = get_object_or_404(Device, id=selected_device_id)

        form = ReturnProcessForm(request.POST, request.FILES)
        if form.is_valid():
            worker = form.cleaned_data['worker']
            condition = form.cleaned_data['condition']
            accessories = form.cleaned_data['accessories']
            notes = form.cleaned_data['notes']
            evidence = form.cleaned_data.get('evidence')
            latitude = form.cleaned_data.get('latitude')
            longitude = form.cleaned_data.get('longitude')
            location_address = form.cleaned_data.get('location_address')

            try:
                ret = process_return(
                    device=device,
                    worker=worker,
                    receiving_user=user,
                    condition=condition,
                    accessories=accessories,
                    notes=notes,
                    evidence=evidence,
                    latitude=latitude,
                    longitude=longitude,
                    location_address=location_address
                )
                messages.success(
                    request,
                    f"Return collected for {device.asset_id}. Device is now in status 'Awaiting Inspection' and held in your custody until verified."
                )
                return redirect('inspection_queue')
            except ValidationError as err:
                messages.error(request, str(err.message if hasattr(err, 'message') else err))
            except Exception as e:
                messages.error(request, f"Return failed: {str(e)}")
    else:
        initial = {}
        if device:
            initial['condition'] = device.condition
            initial['accessories'] = device.accessories
            if device.current_custodian_worker:
                initial['worker'] = device.current_custodian_worker
        form = ReturnProcessForm(initial=initial)

    assigned_devices = Device.objects.filter(current_status='ASSIGNED_WORKER').select_related('current_custodian_worker')

    return render(request, 'inventory/return_process.html', {
        'form': form,
        'device': device,
        'assigned_devices': assigned_devices,
    })


@login_required
def qr_quick_return_view(request, device_id):
    """
    Dedicated QR-Based Device Return Collection (Requirement 7):
    Directly opens from QR scan on assigned device, automatically identifies
    the worker & current assignment, and allows one-click return confirmation
    with location capture and condition checks.
    """
    device = get_object_or_404(Device, id=device_id)
    user = request.user

    active_assignment = device.assignments.filter(status='ACTIVE').select_related('worker').first()
    if not active_assignment or device.current_status != 'ASSIGNED_WORKER':
        messages.warning(request, f"Device {device.asset_id} is not currently assigned to a worker.")
        return redirect('device_detail', device_id=device.id)

    if request.method == 'POST':
        condition = request.POST.get('condition', device.condition)
        accessories = request.POST.get('accessories', device.accessories)
        notes = request.POST.get('notes', '')
        latitude = request.POST.get('latitude') or None
        longitude = request.POST.get('longitude') or None
        location_address = request.POST.get('location_address', '')
        evidence = request.FILES.get('evidence')

        try:
            ret = process_return(
                device=device,
                worker=active_assignment.worker,
                receiving_user=user,
                condition=condition,
                accessories=accessories,
                notes=notes,
                evidence=evidence,
                latitude=latitude,
                longitude=longitude,
                location_address=location_address
            )
            messages.success(
                request,
                f"QR Return Verified! Custody of {device.asset_id} collected from {active_assignment.worker.name}. Routed to inspection queue."
            )
            return redirect('device_detail', device_id=device.id)
        except ValidationError as e:
            messages.error(request, str(e.message if hasattr(e, 'message') else e))
        except Exception as e:
            messages.error(request, f"Return failed: {str(e)}")

    context = {
        'device': device,
        'assignment': active_assignment,
        'worker': active_assignment.worker,
        'condition_choices': Device.CONDITION_CHOICES,
    }
    return render(request, 'inventory/qr_quick_return.html', context)


@login_required
def inspection_queue_view(request):
    """List devices currently awaiting technical inspection."""
    pending_returns = DeviceReturn.objects.filter(
        inspection_completed=False
    ).select_related('device', 'worker', 'receiving_user')

    return render(request, 'inventory/inspection_queue.html', {'pending_returns': pending_returns})


@login_required
def inspection_complete_view(request, return_id):
    return_record = get_object_or_404(
        DeviceReturn.objects.select_related('device', 'worker'),
        id=return_id
    )

    if request.method == 'POST':
        form = InspectionCompleteForm(request.POST)
        if form.is_valid():
            result = form.cleaned_data['inspection_result']
            outcome = form.cleaned_data['outcome']
            notes = form.cleaned_data['notes']

            try:
                complete_inspection(
                    return_record=return_record,
                    inspector=request.user,
                    inspection_result=result,
                    outcome=outcome,
                    notes=notes
                )
                messages.success(
                    request,
                    f"Inspection completed for {return_record.device.asset_id}! Device outcome set to: {outcome}."
                )
                return redirect('inspection_queue')
            except ValidationError as err:
                messages.error(request, str(err.message if hasattr(err, 'message') else err))
            except Exception as e:
                messages.error(request, f"Inspection failed: {str(e)}")
    else:
        form = InspectionCompleteForm()

    return render(request, 'inventory/inspection_complete.html', {
        'form': form,
        'return_record': return_record,
        'device': return_record.device,
    })


# ==========================================
# AUDITED ADJUSTMENTS (ADMIN ONLY)
# ==========================================

@login_required
@admin_required
def audited_adjustment_view(request, device_id):
    device = get_object_or_404(Device, id=device_id)

    if request.method == 'POST':
        form = AuditedAdjustmentForm(request.POST)
        if form.is_valid():
            new_status = form.cleaned_data['new_status']
            new_custodian_type = form.cleaned_data['new_custodian_type']
            new_user = form.cleaned_data['new_custodian_user']
            new_worker = form.cleaned_data['new_custodian_worker']
            reason = form.cleaned_data['reason']

            try:
                audited_adjustment(
                    device=device,
                    actor=request.user,
                    new_status=new_status,
                    new_custodian_type=new_custodian_type,
                    new_custodian_user=new_user,
                    new_custodian_worker=new_worker,
                    reason=reason
                )
                messages.success(request, f"Audited adjustment applied to {device.asset_id} with logged justification.")
                return redirect('device_detail', device_id=device.id)
            except ValidationError as err:
                messages.error(request, str(err.message if hasattr(err, 'message') else err))
            except Exception as e:
                messages.error(request, f"Adjustment failed: {str(e)}")
    else:
        form = AuditedAdjustmentForm(initial={
            'new_status': device.current_status,
            'new_custodian_type': device.current_custodian_type,
            'new_custodian_user': device.current_custodian_user,
            'new_custodian_worker': device.current_custodian_worker,
        })

    return render(request, 'inventory/audited_adjustment.html', {'form': form, 'device': device})


# ==========================================
# INCIDENTS
# ==========================================

@login_required
def incident_list_view(request):
    incidents = Incident.objects.select_related('device', 'reporter').all()
    return render(request, 'inventory/incident_list.html', {'incidents': incidents})


@login_required
def incident_report_view(request, device_id=None):
    device = None
    if device_id:
        device = get_object_or_404(Device, id=device_id)

    if request.method == 'POST':
        form = IncidentReportForm(request.POST, request.FILES)
        if form.is_valid():
            incident = form.save(commit=False)
            incident.reporter = request.user
            incident.save()

            dev = incident.device
            if incident.incident_type == 'DAMAGE':
                dev.current_status = 'DAMAGED'
                dev.save()
            elif incident.incident_type in ['LOSS', 'THEFT']:
                dev.current_status = 'LOST'
                dev.save()

            messages.success(request, f"Incident #{incident.id} recorded successfully.")
            return redirect('incident_list')
    else:
        form = IncidentReportForm(initial={'device': device} if device else {})

    return render(request, 'inventory/incident_report.html', {'form': form, 'device': device})


@login_required
def incident_resolve_view(request, incident_id):
    incident = get_object_or_404(Incident, id=incident_id)

    if request.method == 'POST':
        form = IncidentResolveForm(request.POST)
        if form.is_valid():
            incident.status = form.cleaned_data['status']
            incident.resolution_notes = form.cleaned_data['resolution_notes']
            incident.save()
            messages.success(request, f"Incident #{incident.id} updated.")
            return redirect('incident_list')
    else:
        form = IncidentResolveForm(initial={
            'status': incident.status,
            'resolution_notes': incident.resolution_notes
        })

    return render(request, 'inventory/incident_resolve.html', {'form': form, 'incident': incident})


# ==========================================
# CLIENTS & EMPLOYER COMPANIES & WORKERS
# ==========================================

@login_required
def clients_list_view(request):
    clients = ClientCompany.objects.annotate(
        devices_count=Count('devices'),
        contacts_count=Count('contacts')
    ).all()
    return render(request, 'inventory/clients_list.html', {'clients': clients})


@login_required
def client_create_view(request):
    if request.method == 'POST':
        form = ClientCompanyForm(request.POST)
        if form.is_valid():
            client = form.save()
            try:
                sync_client_to_rtdb(client)
            except Exception:
                pass

            poc_name = form.cleaned_data.get('poc_name', '').strip()
            poc_phone = form.cleaned_data.get('poc_phone', '').strip()
            poc_email = form.cleaned_data.get('poc_email', '').strip()
            poc_desig = form.cleaned_data.get('poc_designation', '').strip()
            if poc_name and poc_phone:
                contact = ClientContact.objects.create(
                    client=client,
                    name=poc_name,
                    phone=poc_phone,
                    email=poc_email,
                    designation=poc_desig,
                    is_active=True
                )
                try:
                    sync_contact_to_rtdb(contact)
                except Exception:
                    pass
                messages.success(request, f"Client '{client.name}' and primary contact '{contact.name}' were successfully registered!")
            else:
                messages.success(request, f"Client '{client.name}' created.")
            return redirect('client_detail', client_id=client.id)
        else:
            messages.error(request, "Please correct the errors in the form below.")
    else:
        form = ClientCompanyForm()
    return render(request, 'inventory/client_form.html', {'form': form, 'title': 'Add New Client'})


@login_required
def client_detail_view(request, client_id):
    client = get_object_or_404(ClientCompany, id=client_id)
    contacts = client.contacts.all().order_by('-created_at')
    pickups = client.pickups.select_related('collecting_user').all()[:10]
    devices = client.devices.all()[:20]

    contact_form = None
    if request.method == 'POST' and 'add_contact' in request.POST:
        contact_form = ClientContactForm(request.POST)
        if contact_form.is_valid():
            c = contact_form.save(commit=False)
            c.client = client
            if 'is_active' not in request.POST:
                c.is_active = True
            c.save()
            try:
                sync_contact_to_rtdb(c)
            except Exception:
                pass
            messages.success(request, f"Point of Contact (POC) '{c.name}' successfully added to {client.name}!")
            return redirect('client_detail', client_id=client.id)
        else:
            err_msg = "; ".join([f"{f}: {', '.join(errs)}" for f, errs in contact_form.errors.items()])
            messages.error(request, f"Failed to add contact: {err_msg}")

    if contact_form is None:
        contact_form = ClientContactForm(initial={'client': client})

    return render(request, 'inventory/client_detail.html', {
        'client': client,
        'contacts': contacts,
        'pickups': pickups,
        'devices': devices,
        'contact_form': contact_form,
    })


@login_required
def client_contact_delete_view(request, contact_id):
    if request.method != 'POST':
        return redirect('clients_list')
    contact = get_object_or_404(ClientContact, id=contact_id)
    client_id = contact.client_id
    cname = contact.name
    contact.delete()
    messages.info(request, f"Contact person '{cname}' was removed.")
    return redirect('client_detail', client_id=client_id)


@csrf_exempt
@login_required
def client_contact_create_api(request, client_id):
    """
    API endpoint to quickly add a new Contact Person for a client from anywhere (e.g. Intake page).
    Returns JSON {success: True, contact: {...}}
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    client = get_object_or_404(ClientCompany, id=client_id)

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body.decode('utf-8'))
        except Exception:
            data = {}
    else:
        data = request.POST

    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    designation = data.get('designation', '').strip()
    email = data.get('email', '').strip()

    if not name:
        return JsonResponse({'success': False, 'error': 'Contact name is required.'}, status=400)
    if not phone:
        return JsonResponse({'success': False, 'error': 'Contact mobile phone is required.'}, status=400)

    cleaned_phone = clean_indian_phone(phone)
    try:
        validate_indian_mobile(cleaned_phone)
    except ValidationError as ve:
        return JsonResponse({'success': False, 'error': str(ve.message if hasattr(ve, 'message') else ve)}, status=400)

    contact = ClientContact.objects.create(
        client=client,
        name=name,
        phone=cleaned_phone,
        designation=designation,
        email=email,
        is_active=True
    )
    try:
        sync_contact_to_rtdb(contact)
    except Exception:
        pass

    return JsonResponse({
        'success': True,
        'contact': {
            'id': contact.id,
            'name': contact.name,
            'designation': contact.designation,
            'phone': contact.phone,
            'email': contact.email,
        }
    })



@login_required
def workers_list_view(request):
    workers = Worker.objects.select_related('employer_company').annotate(
        active_assignments_count=Count('device_assignments', filter=Q(device_assignments__status='ACTIVE'))
    ).all()
    return render(request, 'inventory/workers_list.html', {'workers': workers})


@login_required
def worker_create_view(request):
    if request.method == 'POST':
        form = WorkerForm(request.POST)
        if form.is_valid():
            worker = form.save()
            try:
                sync_worker_to_rtdb(worker)
            except Exception:
                pass
            messages.success(request, f"Worker '{worker.name}' registered.")
            return redirect('worker_detail', worker_id=worker.id)
    else:
        form = WorkerForm()
    return render(request, 'inventory/worker_form.html', {'form': form, 'title': 'Register New Worker'})


@login_required
def worker_detail_view(request, worker_id):
    worker = get_object_or_404(Worker.objects.select_related('employer_company'), id=worker_id)
    active_assignments = worker.device_assignments.filter(status='ACTIVE').select_related('device')
    assignment_history = worker.device_assignments.exclude(status='ACTIVE').select_related('device')[:15]
    return_history = worker.device_returns.select_related('device')[:10]

    show_sensitive = False
    if request.GET.get('reveal') == '1':
        if request.user.is_admin:
            show_sensitive = True
            record_audit_log(
                request.user,
                "VIEW_SENSITIVE_WORKER_DATA",
                "Worker",
                worker.worker_id,
                f"Admin revealed Aadhaar and Bank account for worker {worker.name}",
                get_client_ip(request)
            )
        else:
            messages.error(request, "Permission denied: You cannot view unmasked sensitive identity or payment data.")

    return render(request, 'inventory/worker_detail.html', {
        'worker': worker,
        'active_assignments': active_assignments,
        'assignment_history': assignment_history,
        'return_history': return_history,
        'show_sensitive': show_sensitive,
    })


@login_required
def employer_companies_list_view(request):
    employers = EmployerCompany.objects.annotate(workers_count=Count('workers')).all()
    if request.method == 'POST':
        form = EmployerCompanyForm(request.POST)
        if form.is_valid():
            emp = form.save()
            messages.success(request, f"Employer company '{emp.name}' created.")
            return redirect('employer_companies_list')
    else:
        form = EmployerCompanyForm()

    return render(request, 'inventory/employer_companies.html', {'employers': employers, 'form': form})


# ==========================================
# TASKS
# ==========================================

@login_required
def tasks_list_view(request):
    user = request.user
    if user.is_admin:
        tasks = Task.objects.select_related('assigned_user', 'client', 'worker', 'device').all()
    else:
        tasks = Task.objects.filter(assigned_user=user).select_related('client', 'worker', 'device')

    status_filter = request.GET.get('status')
    if status_filter:
        tasks = tasks.filter(status=status_filter)

    return render(request, 'inventory/tasks_list.html', {'tasks': tasks, 'status_filter': status_filter})


@login_required
def task_create_view(request):
    if request.method == 'POST':
        form = TaskForm(request.POST)
        if form.is_valid():
            task = form.save()
            messages.success(request, f"Task '{task.title}' assigned to {task.assigned_user.display_name}.")
            return redirect('tasks_list')
    else:
        form = TaskForm()
    return render(request, 'inventory/task_form.html', {'form': form})


@login_required
def task_update_status_view(request, task_id):
    task = get_object_or_404(Task, id=task_id)
    if not request.user.is_admin and task.assigned_user != request.user:
        messages.error(request, "You can only update tasks assigned to you.")
        return redirect('tasks_list')

    if request.method == 'POST':
        new_status = request.POST.get('status')
        outcome = request.POST.get('outcome', '')
        if new_status in dict(Task.STATUS_CHOICES):
            task.status = new_status
            if outcome:
                task.outcome = outcome
            task.save()
            messages.success(request, f"Task status updated to {task.get_status_display()}.")
    return redirect('tasks_list')


# ==========================================
# REPORTS & CSV EXPORTS
# ==========================================

@login_required
def reports_view(request):
    return render(request, 'inventory/reports.html', {
        'total_devices': Device.objects.count(),
        'total_movements': DeviceMovement.objects.count(),
        'total_assignments': Assignment.objects.count(),
    })


@login_required
def export_csv_view(request, report_type):
    record_audit_log(
        request.user,
        "EXPORT_REPORT",
        "Report",
        report_type,
        f"Exported CSV for {report_type}",
        get_client_ip(request)
    )

    response = HttpResponse(content_type='text/csv')
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')

    if report_type == 'master_inventory':
        if not request.user.is_admin:
            return HttpResponse("Unauthorized", status=403)
        response['Content-Disposition'] = f'attachment; filename="master_inventory_{timestamp}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Asset ID', 'Type', 'Brand & Model', 'IMEI/Serial', 'Condition', 'Client', 'Status', 'Custodian Type', 'Custodian Name', 'Received Date'])
        for d in Device.objects.select_related('source_client', 'current_custodian_user', 'current_custodian_worker'):
            writer.writerow([
                d.asset_id, d.get_device_type_display(), d.brand_and_model, d.imei_or_serial or '',
                d.get_condition_display(), d.source_client.name, d.get_current_status_display(),
                d.get_current_custodian_type_display(), d.custodian_display, d.received_date.strftime('%Y-%m-%d %H:%M')
            ])

    elif report_type == 'my_inventory':
        response['Content-Disposition'] = f'attachment; filename="my_inventory_{request.user.username}_{timestamp}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Asset ID', 'Type', 'Brand & Model', 'IMEI/Serial', 'Condition', 'Source Client', 'Status', 'Received Date'])
        for d in Device.objects.filter(current_custodian_type='USER', current_custodian_user=request.user).select_related('source_client'):
            writer.writerow([
                d.asset_id, d.get_device_type_display(), d.brand_and_model, d.imei_or_serial or '',
                d.get_condition_display(), d.source_client.name, d.get_current_status_display(),
                d.received_date.strftime('%Y-%m-%d %H:%M')
            ])

    elif report_type == 'movement_ledger':
        if not request.user.is_admin:
            return HttpResponse("Unauthorized", status=403)
        response['Content-Disposition'] = f'attachment; filename="movement_ledger_{timestamp}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'Device Asset ID', 'Transaction Type', 'From Custodian', 'To Custodian', 'New Status', 'Actor', 'Notes'])
        for m in DeviceMovement.objects.select_related('device', 'actor').all():
            writer.writerow([
                m.timestamp.strftime('%Y-%m-%d %H:%M:%S'), m.device.asset_id, m.get_related_transaction_type_display(),
                m.from_custodian_name, m.to_custodian_name, m.to_status, m.actor.display_name, m.notes
            ])

    elif report_type == 'worker_assignments':
        response['Content-Disposition'] = f'attachment; filename="worker_assignments_{timestamp}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Assignment Date', 'Device Asset ID', 'Worker Name', 'Worker ID', 'Employer Company', 'Delivering Staff', 'Status', 'Expected Return'])
        for a in Assignment.objects.select_related('device', 'worker', 'worker__employer_company', 'delivering_user'):
            writer.writerow([
                a.assignment_time.strftime('%Y-%m-%d %H:%M'), a.device.asset_id, a.worker.name, a.worker.worker_id,
                a.worker.employer_company.name, a.delivering_user.display_name, a.get_status_display(),
                a.expected_return_date.strftime('%Y-%m-%d') if a.expected_return_date else ''
            ])
    else:
        return HttpResponse("Invalid report type", status=400)

    return response


# ==========================================
# ADMIN: USER MANAGEMENT & AUDIT LOGS
# ==========================================

@login_required
@admin_required
def user_management_view(request):
    pending_users = User.objects.filter(approval_status='PENDING').order_by('-date_joined')
    active_users = User.objects.filter(approval_status='APPROVED').order_by('username')
    deactivated_users = User.objects.filter(approval_status__in=['DEACTIVATED', 'REJECTED']).order_by('-date_joined')
    users = User.objects.all().order_by('-date_joined')
    return render(request, 'inventory/user_management.html', {
        'users': users,
        'pending_users': pending_users,
        'active_users': active_users,
        'deactivated_users': deactivated_users,
    })


@login_required
@admin_required
def user_approve_view(request, user_id):
    if request.method != 'POST':
        return redirect('user_management')
    target_user = get_object_or_404(User, id=user_id)
    
    assigned_role = request.POST.get('role', target_user.requested_role or target_user.role)
    if assigned_role in ['MANAGEMENT', 'POSTMAN', 'ADMIN']:
        target_user.role = assigned_role

    target_user.approval_status = 'APPROVED'
    target_user.is_active = True
    target_user.is_profile_completed = True
    target_user.approved_at = timezone.now()
    target_user.approved_by = request.user
    target_user.save()

    record_audit_log(
        request.user, "USER_APPROVED", "User", target_user.id,
        f"Admin approved user {target_user.username} with role {target_user.get_role_display()}",
        get_client_ip(request)
    )
    messages.success(request, f"User account '{target_user.display_name}' ({target_user.username}) approved as {target_user.get_role_display()}!")
    return redirect('user_management')


@login_required
@admin_required
def user_reject_view(request, user_id):
    if request.method != 'POST':
        return redirect('user_management')
    target_user = get_object_or_404(User, id=user_id)
    if target_user.is_admin or target_user.is_superuser:
        messages.error(request, "Cannot delete or reject an administrator account.")
        return redirect('user_management')

    username = target_user.username
    uid = target_user.id
    record_audit_log(request.user, "USER_REJECTED", "User", uid, f"Admin rejected registration for {username}", get_client_ip(request))
    target_user.delete()
    messages.info(request, f"Application for '{username}' was rejected.")
    return redirect('user_management')


@login_required
@admin_required
def user_toggle_status_view(request, user_id):
    if request.method != 'POST':
        return redirect('user_management')
    target_user = get_object_or_404(User, id=user_id)
    if target_user.id == request.user.id or target_user.is_admin:
        messages.error(request, "Cannot deactivate your own account or another administrator.")
        return redirect('user_management')

    if target_user.approval_status == 'APPROVED' and target_user.is_active:
        target_user.approval_status = 'DEACTIVATED'
        target_user.is_active = False
        msg = f"User '{target_user.display_name}' has been deactivated."
        act = "USER_DEACTIVATED"
    else:
        target_user.approval_status = 'APPROVED'
        target_user.is_active = True
        msg = f"User '{target_user.display_name}' has been reactivated."
        act = "USER_REACTIVATED"

    target_user.save()
    record_audit_log(request.user, act, "User", target_user.id, msg, get_client_ip(request))
    messages.success(request, msg)
    return redirect('user_management')


@login_required
@admin_required
def user_create_view(request):
    if request.method == 'POST':
        form = UserManagementForm(request.POST)
        if form.is_valid():
            u = form.save(commit=False)
            pwd = form.cleaned_data.get('password')
            if pwd:
                u.set_password(pwd)
            else:
                u.set_password("defaultPassword123")
            if u.role == 'ADMIN':
                u.is_staff = True
            u.save()
            messages.success(request, f"User account '{u.username}' created.")
            return redirect('user_management')
    else:
        form = UserManagementForm()
    return render(request, 'inventory/user_form.html', {'form': form, 'title': 'Create New User'})


@login_required
@admin_required
def user_edit_view(request, user_id):
    target_user = get_object_or_404(User, id=user_id)
    if request.method == 'POST':
        form = UserManagementForm(request.POST, instance=target_user)
        if form.is_valid():
            u = form.save(commit=False)
            pwd = form.cleaned_data.get('password')
            if pwd:
                u.set_password(pwd)
            if u.role == 'ADMIN':
                u.is_staff = True
            u.save()
            messages.success(request, f"User account '{u.username}' updated.")
            return redirect('user_management')
    else:
        form = UserManagementForm(instance=target_user)
    return render(request, 'inventory/user_form.html', {'form': form, 'title': f'Edit User: {target_user.username}'})


@login_required
@admin_required
def audit_logs_view(request):
    query = request.GET.get('q', '').strip()
    action_filter = request.GET.get('action', '').strip()

    logs = AuditLog.objects.select_related('actor').all()
    if query:
        logs = logs.filter(
            Q(record_id__icontains=query) |
            Q(record_type__icontains=query) |
            Q(safe_metadata__icontains=query) |
            Q(actor__username__icontains=query)
        )
    if action_filter:
        logs = logs.filter(action=action_filter)

    distinct_actions = AuditLog.objects.values_list('action', flat=True).distinct()

    return render(request, 'inventory/audit_logs.html', {
        'logs': logs[:100],
        'distinct_actions': distinct_actions,
        'query': query,
        'action_filter': action_filter,
    })


# ==========================================
# USER PROFILE & PASSWORD RESET
# ==========================================

@login_required
def change_password_view(request):
    """
    Enables authenticated users (including Administrator) to securely change their password.
    Enforces previous password validation, minimum length, and session persistence.
    """
    if request.method == 'POST':
        form = ChangePasswordForm(request.user, request.POST)
        if form.is_valid():
            new_pwd = form.cleaned_data['new_password']
            request.user.set_password(new_pwd)
            request.user.save()
            update_session_auth_hash(request, request.user)
            record_audit_log(
                request.user, "PASSWORD_CHANGED", "User", request.user.id,
                f"User {request.user.username} updated their password", get_client_ip(request)
            )
            messages.success(request, "Your password has been changed successfully! Your active session has been preserved.")
            return redirect('dashboard')
        else:
            messages.error(request, "Please correct the errors in the form below.")
    else:
        form = ChangePasswordForm(request.user)

    return render(request, 'inventory/change_password.html', {'form': form})


# ==========================================
# SYSTEM DATA PURGE / FACTORY RESET
# ==========================================

@login_required
@admin_required
def system_reset_data_view(request):
    """
    High-security administrative function to purge all operational inventory data or perform
    a complete factory reset. Requires administrator re-authentication and confirmation phrase.
    """
    counts = {
        'devices': Device.objects.count(),
        'pickups': Pickup.objects.count(),
        'assignments': Assignment.objects.count(),
        'transfers': Transfer.objects.count(),
        'returns': DeviceReturn.objects.count(),
        'movements': DeviceMovement.objects.count(),
        'incidents': Incident.objects.count(),
        'tasks': Task.objects.count(),
        'logs': DeviceActivityLog.objects.count(),
        'sessions': ScannerSession.objects.count(),
        'clients': ClientCompany.objects.count(),
        'contacts': ClientContact.objects.count(),
        'workers': Worker.objects.count(),
        'employers': EmployerCompany.objects.count(),
        'users': User.objects.exclude(id=request.user.id).count(),
    }

    if request.method == 'POST':
        form = DataPurgeForm(request.user, request.POST)
        if form.is_valid():
            scope = form.cleaned_data['purge_scope']

            with transaction.atomic():
                # Erase operational and device records
                DeviceActivityLog.objects.all().delete()
                DeviceMovement.objects.all().delete()
                DeviceReturn.objects.all().delete()
                Assignment.objects.all().delete()
                Transfer.objects.all().delete()
                PickupDevice.objects.all().delete()
                Pickup.objects.all().delete()
                Incident.objects.all().delete()
                Task.objects.all().delete()
                ScannerSession.objects.all().delete()
                Device.objects.all().delete()

                if scope == 'COMPLETE_FACTORY_RESET':
                    Worker.objects.all().delete()
                    EmployerCompany.objects.all().delete()
                    ClientContact.objects.all().delete()
                    ClientCompany.objects.all().delete()
                    # Delete all users except current admin
                    User.objects.exclude(id=request.user.id).delete()

            # Clean media upload directories safely
            media_subdirs = ['qr_codes', 'device_images', 'incident_photos', 'worker_photos']
            for sdir in media_subdirs:
                target_dir = os.path.join(settings.MEDIA_ROOT, sdir)
                if os.path.exists(target_dir):
                    for filename in os.listdir(target_dir):
                        file_path = os.path.join(target_dir, filename)
                        try:
                            if os.path.isfile(file_path) or os.path.islink(file_path):
                                os.unlink(file_path)
                            elif os.path.isdir(file_path):
                                shutil.rmtree(file_path)
                        except Exception:
                            pass
                else:
                    os.makedirs(target_dir, exist_ok=True)

            scope_display = "Complete Factory Reset" if scope == 'COMPLETE_FACTORY_RESET' else "Operational Inventory Purge"
            record_audit_log(
                request.user,
                "SYSTEM_DATA_PURGED",
                "System",
                request.user.id,
                f"Admin {request.user.username} executed data purge with scope: {scope_display}",
                get_client_ip(request)
            )

            messages.success(
                request,
                f"Data purge completed successfully! Applied scope: {scope_display}. All requested records and associated media have been permanently erased."
            )
            return redirect('dashboard')
        else:
            messages.error(request, "Data purge failed. Please re-check your administrator password and confirmation phrase.")
    else:
        form = DataPurgeForm(request.user)

    return render(request, 'inventory/system_reset_data.html', {
        'form': form,
        'counts': counts,
    })

