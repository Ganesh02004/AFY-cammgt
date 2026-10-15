import re
import json
import uuid
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q

from .models import (
    User, ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Assignment, DeviceMovement, DeviceActivityLog, AuditLog,
    ObjectDefinition, FieldDefinition, FieldChoice, DynamicRecord,
    MassCameraAssignmentBatch
)
from .validators import validate_indian_mobile, validate_email_address
from .services import record_audit_log, record_device_activity

# Fields that dynamic configuration is strictly forbidden to overwrite for system security
PROTECTED_SYSTEM_FIELDS = {
    'role', 'is_staff', 'is_superuser', 'approval_status', 'is_active',
    'current_status', 'current_custodian_type', 'current_custodian_user',
    'current_custodian_worker', 'asset_id', 'qr_token', 'password', 'id', 'pk'
}


def seed_initial_objects_and_fields():
    """
    Initializes the 6 standard business entities and their initial field definitions.
    Idempotent: will not duplicate existing objects or overwrite user configurations.
    """
    initial_objects = [
        {
            'api_name': 'client',
            'name': 'Client Company',
            'description': 'Organizations that provide camera assets and request inventory pickups.',
            'icon': 'fa-building',
            'is_system': True,
            'fields': [
                {'api_name': 'name', 'label': 'Company Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 10},
                {'api_name': 'code', 'label': 'Client Code', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 20, 'help_text': 'Unique business code (e.g. CLI-001)'},
                {'api_name': 'city', 'label': 'City', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 30},
                {'api_name': 'state', 'label': 'State', 'field_type': 'text', 'is_required': True, 'display_order': 40},
                {'api_name': 'pin_code', 'label': 'PIN Code', 'field_type': 'text', 'is_required': True, 'display_order': 50},
                {'api_name': 'address', 'label': 'Headquarters Address', 'field_type': 'textarea', 'is_required': True, 'display_order': 60},
                {
                    'api_name': 'status', 'label': 'Account Status', 'field_type': 'select', 'is_required': True, 'show_in_list': True, 'display_order': 70,
                    'choices': [('ACTIVE', 'Active Partner'), ('INACTIVE', 'Inactive / Paused')]
                },
            ]
        },
        {
            'api_name': 'client_contact',
            'name': 'Client Contact',
            'description': 'Point of contact (POC) representatives authorized to hand over devices at client sites.',
            'icon': 'fa-address-book',
            'is_system': True,
            'fields': [
                {'api_name': 'client', 'label': 'Client Company', 'field_type': 'lookup', 'lookup_object_key': 'client', 'is_required': True, 'show_in_list': True, 'display_order': 10},
                {'api_name': 'name', 'label': 'Contact Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 20},
                {'api_name': 'designation', 'label': 'Designation / Title', 'field_type': 'text', 'is_required': False, 'show_in_list': True, 'display_order': 30, 'placeholder': 'e.g. Warehouse Lead, Operations Head'},
                {'api_name': 'phone', 'label': 'Mobile Number', 'field_type': 'phone', 'is_required': True, 'show_in_list': True, 'display_order': 40, 'help_text': '10-digit Indian mobile number'},
                {'api_name': 'email', 'label': 'Email Address', 'field_type': 'email', 'is_required': False, 'show_in_list': True, 'display_order': 50},
                {'api_name': 'is_active', 'label': 'Active Status', 'field_type': 'boolean', 'is_required': False, 'display_order': 60, 'default_value': 'true'},
            ]
        },
        {
            'api_name': 'worker',
            'name': 'Worker',
            'description': 'Field personnel, security officers, and delivery staff assigned custody of cameras.',
            'icon': 'fa-id-card-clip',
            'is_system': True,
            'fields': [
                {'api_name': 'worker_id', 'label': 'Worker ID / Badge', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 10, 'help_text': 'Badge or Staffing ID (e.g. WRK-1001)'},
                {'api_name': 'name', 'label': 'Full Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 20},
                {'api_name': 'phone', 'label': 'Primary Mobile', 'field_type': 'phone', 'is_required': True, 'show_in_list': True, 'display_order': 30},
                {'api_name': 'email', 'label': 'Email Address', 'field_type': 'email', 'is_required': False, 'display_order': 40},
                {'api_name': 'employer_company', 'label': 'Employer / Staffing Agency', 'field_type': 'lookup', 'lookup_object_key': 'employer_company', 'is_required': True, 'show_in_list': True, 'display_order': 50},
                {'api_name': 'role_or_status', 'label': 'Operational Designation', 'field_type': 'text', 'is_required': False, 'show_in_list': True, 'display_order': 60, 'placeholder': 'e.g. Security Marshal, Guard'},
                {'api_name': 'address', 'label': 'Residential Address', 'field_type': 'textarea', 'is_required': False, 'display_order': 70},
                {'api_name': 'aadhaar_number', 'label': 'Aadhaar ID (Masked)', 'field_type': 'text', 'is_required': False, 'is_sensitive': True, 'display_order': 80, 'help_text': 'Masked for non-administrative viewers'},
                {'api_name': 'bank_account_number', 'label': 'Bank Account (Masked)', 'field_type': 'text', 'is_required': False, 'is_sensitive': True, 'display_order': 90, 'help_text': 'Masked for non-administrative viewers'},
            ]
        },
        {
            'api_name': 'employer_company',
            'name': 'Employer Company',
            'description': 'Staffing agencies, security firms, and contract employers that deploy field workers.',
            'icon': 'fa-briefcase',
            'is_system': True,
            'fields': [
                {'api_name': 'name', 'label': 'Agency / Company Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 10},
                {'api_name': 'code', 'label': 'Employer Code', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 20, 'help_text': 'Unique agency code (e.g. EMP-001)'},
                {'api_name': 'address', 'label': 'Office Address', 'field_type': 'textarea', 'is_required': True, 'display_order': 30},
                {'api_name': 'contact_details', 'label': 'POC & Emergency Contacts', 'field_type': 'textarea', 'is_required': False, 'display_order': 40},
                {
                    'api_name': 'status', 'label': 'Partnership Status', 'field_type': 'select', 'is_required': True, 'show_in_list': True, 'display_order': 50,
                    'choices': [('ACTIVE', 'Active Vendor'), ('INACTIVE', 'Terminated / Inactive')]
                },
            ]
        },
        {
            'api_name': 'postman',
            'name': 'Postman / Field Officer',
            'description': 'Internal AFY staff members handling pickups, custody handovers, and returns.',
            'icon': 'fa-person-walking-luggage',
            'is_system': True,
            'fields': [
                {'api_name': 'username', 'label': 'Username', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 10},
                {'api_name': 'first_name', 'label': 'First Name', 'field_type': 'text', 'is_required': True, 'show_in_list': True, 'display_order': 20},
                {'api_name': 'last_name', 'label': 'Last Name', 'field_type': 'text', 'is_required': False, 'display_order': 30},
                {'api_name': 'email', 'label': 'Work Email', 'field_type': 'email', 'is_required': True, 'show_in_list': True, 'display_order': 40},
                {'api_name': 'phone', 'label': 'Mobile Number', 'field_type': 'phone', 'is_required': True, 'show_in_list': True, 'display_order': 50},
                {'api_name': 'work_location', 'label': 'Base Hub / Location', 'field_type': 'text', 'is_required': False, 'show_in_list': True, 'display_order': 60},
                {'api_name': 'address', 'label': 'Address', 'field_type': 'textarea', 'is_required': False, 'display_order': 70},
            ]
        },
        {
            'api_name': 'mass_camera_assignment',
            'name': 'Mass Camera Assignment',
            'description': 'Batch assignment operations allocating multiple cameras to workers simultaneously.',
            'icon': 'fa-boxes-packing',
            'is_system': True,
            'fields': [
                {'api_name': 'batch_id', 'label': 'Batch ID', 'field_type': 'readonly', 'is_required': False, 'show_in_list': True, 'display_order': 10},
                {'api_name': 'target_worker', 'label': 'Target Worker', 'field_type': 'lookup', 'lookup_object_key': 'worker', 'is_required': True, 'show_in_list': True, 'display_order': 20},
                {
                    'api_name': 'assignment_purpose', 'label': 'Deployment Purpose', 'field_type': 'select', 'is_required': True, 'show_in_list': True, 'display_order': 30,
                    'choices': [
                        ('FIELD_OPS', 'Standard Field Operations'),
                        ('SPECIAL_EVENT', 'Special Event / Crowd Control'),
                        ('AUDIT_INSPECTION', 'Audit & Facility Inspection'),
                        ('SURGE_STAFFING', 'Surge / Seasonal Staffing Deployment')
                    ]
                },
                {'api_name': 'notes', 'label': 'Batch Deployment Notes', 'field_type': 'textarea', 'is_required': False, 'display_order': 40},
            ]
        }
    ]

    created_objects = []
    for obj_data in initial_objects:
        obj_def, created = ObjectDefinition.objects.get_or_create(
            api_name=obj_data['api_name'],
            defaults={
                'name': obj_data['name'],
                'description': obj_data['description'],
                'icon': obj_data['icon'],
                'is_system': obj_data['is_system'],
                'is_active': True
            }
        )
        created_objects.append(obj_def)

        # Seed initial fields if none exist
        for f_data in obj_data['fields']:
            field_def, f_created = FieldDefinition.objects.get_or_create(
                object_definition=obj_def,
                api_name=f_data['api_name'],
                defaults={
                    'label': f_data['label'],
                    'field_type': f_data['field_type'],
                    'is_required': f_data.get('is_required', False),
                    'help_text': f_data.get('help_text', ''),
                    'placeholder': f_data.get('placeholder', ''),
                    'default_value': f_data.get('default_value', ''),
                    'display_order': f_data.get('display_order', 10),
                    'is_active': True,
                    'show_in_list': f_data.get('show_in_list', False),
                    'is_sensitive': f_data.get('is_sensitive', False)
                }
            )

            # Link lookup object if needed
            if f_data.get('lookup_object_key'):
                target_obj = ObjectDefinition.objects.filter(api_name=f_data['lookup_object_key']).first()
                if target_obj and field_def.lookup_object != target_obj:
                    field_def.lookup_object = target_obj
                    field_def.save(update_fields=['lookup_object'])

            # Seed choices for select/radio
            if 'choices' in f_data and f_created:
                for idx, (c_val, c_lbl) in enumerate(f_data['choices']):
                    FieldChoice.objects.get_or_create(
                        field_definition=field_def,
                        value=c_val,
                        defaults={
                            'label': c_lbl,
                            'display_order': (idx + 1) * 10,
                            'is_active': True
                        }
                    )

    return created_objects


def get_object_fields(api_name, include_inactive=False):
    """
    Returns all field definitions for an object, ordered by display_order.
    """
    try:
        obj_def = ObjectDefinition.objects.get(api_name=api_name)
    except ObjectDefinition.DoesNotExist:
        return []
    
    qs = obj_def.fields.all()
    if not include_inactive:
        qs = qs.filter(is_active=True)
    return qs.order_by('display_order', 'id')


def validate_dynamic_form_submission(object_definition, post_data, files_data=None, instance=None):
    """
    Validates a submitted dynamic form against the active FieldDefinitions of the object.
    Returns: (cleaned_core_fields, cleaned_custom_fields, errors_dict)
    """
    cleaned_core = {}
    cleaned_custom = {}
    errors = {}

    active_fields = object_definition.active_fields

    for field in active_fields:
        key = field.api_name

        # Prevent dynamic overriding of protected system fields
        if key in PROTECTED_SYSTEM_FIELDS:
            continue

        raw_val = post_data.get(key)
        if raw_val is not None and isinstance(raw_val, str):
            raw_val = raw_val.strip()

        # Check required constraint
        if field.is_required:
            if field.field_type == 'boolean':
                pass # Booleans can be False
            elif raw_val is None or raw_val == '':
                # If editing and file field has existing file, don't fail
                if field.field_type == 'file' and instance and getattr(instance, key, None):
                    pass
                else:
                    errors[key] = f"{field.label} is required."
                    continue

        # If not provided and optional, skip further validation
        if raw_val is None or raw_val == '':
            if key in get_core_field_names(object_definition.api_name):
                if field.field_type in ('text', 'textarea', 'email', 'phone'):
                    cleaned_core[key] = ''
                elif field.field_type == 'boolean':
                    cleaned_core[key] = False
                else:
                    cleaned_core[key] = None
            else:
                if field.default_value:
                    cleaned_custom[key] = field.default_value
                elif instance and hasattr(instance, 'custom_fields') and key in (instance.custom_fields or {}):
                    # Cleared by user on edit
                    cleaned_custom[key] = ''
            continue

        # Type-specific validation
        try:
            if field.field_type == 'number':
                try:
                    num_val = float(raw_val) if '.' in raw_val else int(raw_val)
                    if field.min_value is not None and num_val < field.min_value:
                        errors[key] = f"{field.label} must be at least {field.min_value}."
                    elif field.max_value is not None and num_val > field.max_value:
                        errors[key] = f"{field.label} cannot exceed {field.max_value}."
                    else:
                        val = num_val
                except ValueError:
                    errors[key] = f"Please enter a valid number for {field.label}."

            elif field.field_type == 'phone':
                # Validate Indian 10-digit mobile phone
                clean_phone = re.sub(r'[\s\-\+\(\)]', '', raw_val)
                if clean_phone.startswith('91') and len(clean_phone) == 12:
                    clean_phone = clean_phone[2:]
                elif clean_phone.startswith('0') and len(clean_phone) == 11:
                    clean_phone = clean_phone[1:]
                
                if not re.match(r'^[6-9]\d{9}$', clean_phone):
                    errors[key] = f"Please enter a valid 10-digit Indian mobile number for {field.label} (e.g. 9876543210)."
                else:
                    val = clean_phone

            elif field.field_type == 'email':
                try:
                    validate_email_address(raw_val)
                    val = raw_val.lower()
                except ValidationError:
                    errors[key] = f"Please enter a valid email address for {field.label}."

            elif field.field_type == 'boolean':
                val = str(raw_val).lower() in ('true', '1', 'on', 'yes')

            elif field.field_type in ('select', 'radio'):
                # Must be an active choice
                active_choice_values = list(field.choices.filter(is_active=True).values_list('value', flat=True))
                # Also allow raw value if existing choices match case-insensitively
                matched_val = next((cv for cv in active_choice_values if cv.lower() == str(raw_val).lower()), None)
                if matched_val:
                    val = matched_val
                elif not active_choice_values:
                    # No choices configured yet, accept string
                    val = raw_val
                else:
                    errors[key] = f"Invalid option selected for {field.label}."

            elif field.field_type == 'multiselect':
                selected_list = post_data.getlist(key) if hasattr(post_data, 'getlist') else (raw_val if isinstance(raw_val, list) else [raw_val])
                active_choice_values = list(field.choices.filter(is_active=True).values_list('value', flat=True))
                val = [item for item in selected_list if item in active_choice_values]

            elif field.field_type == 'lookup':
                # Validate foreign entity exists
                lookup_key = field.lookup_object.api_name if field.lookup_object else ''
                target_model = get_model_for_object_key(lookup_key)
                if target_model:
                    try:
                        record_pk = int(raw_val)
                        if not target_model.objects.filter(pk=record_pk).exists():
                            errors[key] = f"Selected {field.label} record not found."
                        else:
                            val = record_pk
                    except (ValueError, TypeError):
                        errors[key] = f"Invalid selection for {field.label}."
                else:
                    val = raw_val

            elif field.field_type == 'date':
                # Validate date format YYYY-MM-DD
                if not re.match(r'^\d{4}-\d{2}-\d{2}$', raw_val):
                    errors[key] = f"Please provide date in YYYY-MM-DD format for {field.label}."
                else:
                    val = raw_val

            elif field.field_type == 'datetime':
                val = raw_val

            else: # text, textarea, etc.
                if field.min_value is not None and len(raw_val) < int(field.min_value):
                    errors[key] = f"{field.label} must be at least {int(field.min_value)} characters."
                elif field.max_value is not None and len(raw_val) > int(field.max_value):
                    errors[key] = f"{field.label} cannot exceed {int(field.max_value)} characters."
                else:
                    val = raw_val

            # Regex validation check if configured
            if field.validation_regex and val and isinstance(val, str):
                try:
                    if not re.match(field.validation_regex, val):
                        errors[key] = f"{field.label} format is invalid."
                except re.error:
                    pass

        except Exception as e:
            errors[key] = f"Validation failed for {field.label}: {str(e)}"

        if key not in errors:
            if key in get_core_field_names(object_definition.api_name):
                cleaned_core[key] = val
            else:
                cleaned_custom[key] = val

    return cleaned_core, cleaned_custom, errors


def get_core_field_names(api_name):
    """Returns the set of native SQL column names for built-in models."""
    mapping = {
        'client': {'name', 'code', 'address', 'city', 'state', 'pin_code', 'status'},
        'client_contact': {'client', 'name', 'designation', 'phone', 'email', 'is_active'},
        'worker': {'worker_id', 'name', 'phone', 'email', 'address', 'employer_company', 'role_or_status', 'aadhaar_number', 'bank_account_number', 'bank_ifsc', 'upi_id'},
        'employer_company': {'name', 'code', 'address', 'contact_details', 'status'},
        'postman': {'username', 'first_name', 'last_name', 'email', 'phone', 'address', 'work_location'},
        'mass_camera_assignment': {'batch_id', 'target_worker', 'notes'},
    }
    return mapping.get(api_name, set())


def get_model_for_object_key(api_name):
    """Maps object api_name to its relational Django model class."""
    mapping = {
        'client': ClientCompany,
        'client_contact': ClientContact,
        'worker': Worker,
        'employer_company': EmployerCompany,
        'postman': User,
        'mass_camera_assignment': MassCameraAssignmentBatch,
    }
    return mapping.get(api_name)


def save_dynamic_form_data(object_definition, post_data, files_data=None, instance=None, user=None):
    """
    Validates and commits a dynamic form submission into the database.
    Updates native SQL fields for core models and stores custom fields in custom_fields JSON.
    Returns: (instance, errors)
    """
    cleaned_core, cleaned_custom, errors = validate_dynamic_form_submission(
        object_definition, post_data, files_data, instance
    )

    if errors:
        return None, errors

    model_cls = get_model_for_object_key(object_definition.api_name)

    with transaction.atomic():
        if model_cls:
            # Handle native core entity
            if instance is None:
                instance = model_cls()

            # Set core native fields
            for k, v in cleaned_core.items():
                if k in PROTECTED_SYSTEM_FIELDS:
                    continue
                # Handle foreign key assignments
                if k in ('client', 'employer_company', 'target_worker') and isinstance(v, (int, str)):
                    setattr(instance, f"{k}_id", v)
                else:
                    setattr(instance, k, v)

            # Merge custom fields dictionary
            existing_custom = getattr(instance, 'custom_fields', {}) or {}
            existing_custom.update(cleaned_custom)
            instance.custom_fields = existing_custom
            instance.save()

            action = "UPDATED" if instance.pk else "CREATED"
            record_audit_log(
                user,
                f"OBJECT_RECORD_{action}",
                object_definition.name,
                instance.pk,
                f"Saved {object_definition.name} record via Dynamic Builder"
            )
            return instance, None

        else:
            # Handle fully dynamic object stored in DynamicRecord
            if instance is None:
                record_id = f"{object_definition.api_name.upper()[:3]}-{uuid.uuid4().hex[:8].upper()}"
                instance = DynamicRecord(
                    object_definition=object_definition,
                    record_id=record_id,
                    created_by=user
                )

            instance.name = str(cleaned_custom.get('name') or cleaned_core.get('name') or instance.record_id)
            existing_data = instance.data or {}
            existing_data.update(cleaned_core)
            existing_data.update(cleaned_custom)
            instance.data = existing_data
            instance.updated_by = user
            instance.save()

            return instance, None


def get_lookup_choices(lookup_object_key, filter_by=None, filter_value=None):
    """
    Returns (id, label) pairs for a lookup relationship field.
    Supports cascading client -> contact filtering.
    """
    if lookup_object_key == 'client':
        qs = ClientCompany.objects.filter(status='ACTIVE').order_by('name')
        return [(c.id, f"{c.name} ({c.code})") for c in qs]

    elif lookup_object_key == 'client_contact':
        qs = ClientContact.objects.filter(is_active=True).select_related('client')
        if filter_by == 'client' and filter_value:
            qs = qs.filter(client_id=filter_value)
        return [(cc.id, f"{cc.name} — {cc.client.name} ({cc.designation or 'POC'})") for cc in qs]

    elif lookup_object_key == 'employer_company':
        qs = EmployerCompany.objects.filter(status='ACTIVE').order_by('name')
        return [(e.id, f"{e.name} ({e.code})") for e in qs]

    elif lookup_object_key == 'worker':
        qs = Worker.objects.select_related('employer_company').order_by('name')
        if filter_by == 'employer_company' and filter_value:
            qs = qs.filter(employer_company_id=filter_value)
        return [(w.id, f"{w.name} ({w.worker_id}) — {w.employer_company.name}") for w in qs]

    elif lookup_object_key == 'postman':
        qs = User.objects.filter(role__in=['POSTMAN', 'MANAGEMENT'], approval_status='APPROVED', is_active=True).order_by('first_name', 'username')
        return [(u.id, f"{u.display_name} ({u.get_role_display()})") for u in qs]

    else:
        obj_def = ObjectDefinition.objects.filter(api_name=lookup_object_key).first()
        if obj_def:
            records = DynamicRecord.objects.filter(object_definition=obj_def).order_by('name')[:100]
            return [(r.id, r.name) for r in records]
        return []


def execute_mass_camera_assignment(user, device_ids, worker_id, custom_fields=None, notes="", expected_return_date=None):
    """
    Executes an atomic mass assignment batch allocating multiple available cameras to a target worker.
    Creates an explicit Assignment and DeviceMovement/Activity log per device.
    Requirement 8:
    - Validate every device and worker before committing.
    - Reject devices already assigned, lost, damaged, awaiting inspection, or out of custody.
    - Never represent batch as one shared device.
    - Provide a downloadable summary report.
    """
    if not user or not user.is_authenticated:
        return False, "Authentication required.", None

    if not (user.is_admin or user.is_management):
        return False, "Permission denied: Only Admin or Management Staff can execute mass camera assignments.", None

    try:
        worker = Worker.objects.get(pk=worker_id)
    except Worker.DoesNotExist:
        return False, f"Target Worker #{worker_id} does not exist.", None

    if not device_ids:
        return False, "No devices selected for assignment.", None

    # De-duplicate IDs
    clean_device_ids = list(dict.fromkeys(int(d_id) for d_id in device_ids if str(d_id).isdigit()))
    if not clean_device_ids:
        return False, "No valid device IDs provided.", None

    batch_id = f"MASS-{timezone.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
    batch = MassCameraAssignmentBatch(
        batch_id=batch_id,
        actor=user,
        total_devices=len(clean_device_ids),
        notes=notes,
        custom_fields=custom_fields or {},
        status='COMPLETED'
    )

    summary_rows = []
    successful_count = 0
    failed_count = 0

    with transaction.atomic():
        # Fetch devices with row locking to prevent concurrent double-assignments
        devices = list(Device.objects.select_for_update().filter(pk__in=clean_device_ids))
        found_ids = {d.id for d in devices}

        for did in clean_device_ids:
            if did not in found_ids:
                summary_rows.append({
                    'device_id': did,
                    'asset_id': f"#{did}",
                    'success': False,
                    'reason': "Device record not found in system."
                })
                failed_count += 1

        for dev in devices:
            # Check availability
            if dev.current_status != 'AVAILABLE_STORAGE' and dev.current_status != 'WITH_COLLECTOR':
                summary_rows.append({
                    'device_id': dev.id,
                    'asset_id': dev.asset_id,
                    'brand_and_model': dev.brand_and_model,
                    'success': False,
                    'reason': f"Device is currently '{dev.get_current_status_display()}' and cannot be assigned."
                })
                failed_count += 1
                continue

            # Check for existing active assignment
            if Assignment.objects.filter(device=dev, status='ACTIVE').exists():
                summary_rows.append({
                    'device_id': dev.id,
                    'asset_id': dev.asset_id,
                    'brand_and_model': dev.brand_and_model,
                    'success': False,
                    'reason': "Device already has an active worker assignment in progress."
                })
                failed_count += 1
                continue

            # Perform assignment
            from_loc = dev.custodian_display
            prev_status = dev.current_status

            assignment = Assignment.objects.create(
                device=dev,
                worker=worker,
                delivering_user=user,
                assignment_time=timezone.now(),
                expected_return_date=expected_return_date,
                status='ACTIVE',
                condition=dev.condition or 'GOOD',
                notes=f"Mass Assignment Batch #{batch_id}. {notes}".strip()
            )

            # Update device custodian and status
            dev.current_status = 'ASSIGNED_WORKER'
            dev.current_custodian_type = 'WORKER'
            dev.current_custodian_user = None
            dev.current_custodian_worker = worker
            dev.save()

            DeviceMovement.objects.create(
                device=dev,
                from_custodian_type='STORAGE' if prev_status == 'AVAILABLE_STORAGE' else 'COLLECTOR',
                from_custodian_name=from_loc,
                to_custodian_type='WORKER',
                to_custodian_name=f"{worker.name} ({worker.worker_id})",
                from_status=prev_status,
                to_status='ASSIGNED_WORKER',
                actor=user,
                timestamp=timezone.now(),
                related_transaction_type='ASSIGNMENT',
                related_transaction_id=str(assignment.id),
                notes=f"Batch {batch_id}: Assigned to {worker.name}"
            )

            record_device_activity(
                device=dev,
                action='ASSIGNED_TO_WORKER',
                actor=user,
                details=f"Mass Batch #{batch_id}: Handed over to Worker {worker.name} ({worker.employer_company.name}). Notes: {notes}",
                related_transaction_type='Assignment',
                related_transaction_id=str(assignment.id)
            )

            summary_rows.append({
                'device_id': dev.id,
                'asset_id': dev.asset_id,
                'brand_and_model': dev.brand_and_model,
                'assignment_id': assignment.id,
                'success': True,
                'reason': "Assigned successfully."
            })
            successful_count += 1

        batch.successful_assignments = successful_count
        batch.failed_assignments = failed_count
        batch.summary_report = summary_rows
        batch.completed_at = timezone.now()

        if failed_count > 0 and successful_count > 0:
            batch.status = 'PARTIAL'
        elif failed_count > 0 and successful_count == 0:
            batch.status = 'FAILED'
        else:
            batch.status = 'COMPLETED'

        batch.save()

        record_audit_log(
            user,
            "MASS_CAMERA_ASSIGNMENT",
            "MassCameraAssignmentBatch",
            batch.batch_id,
            f"Mass assigned {successful_count}/{len(clean_device_ids)} cameras to Worker {worker.name} (Batch #{batch.batch_id})"
        )

    return True, f"Mass Assignment completed: {successful_count} assigned, {failed_count} skipped.", batch
