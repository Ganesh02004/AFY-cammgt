import re
import csv
import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, JsonResponse, HttpResponseForbidden
from django.utils import timezone
from django.core.paginator import Paginator
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt

from .models import (
    User, ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Assignment, DeviceMovement, DeviceActivityLog, AuditLog,
    ObjectDefinition, FieldDefinition, FieldChoice, DynamicRecord,
    MassCameraAssignmentBatch
)
from .builder_service import (
    seed_initial_objects_and_fields, get_object_fields,
    validate_dynamic_form_submission, save_dynamic_form_data,
    get_lookup_choices, get_model_for_object_key,
    execute_mass_camera_assignment, PROTECTED_SYSTEM_FIELDS
)
from .services import record_audit_log


def admin_required(view_func):
    """Decorator ensuring that only users with role='ADMIN' or is_superuser can access."""
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_admin:
            messages.error(request, "Access denied: Administrator privileges required to access the Object & Field Builder.")
            return redirect('dashboard')
        return view_func(request, *args, **kwargs)
    return _wrapped


# =====================================================================
# 1. SETUP STUDIO & OBJECT BUILDER (ADMIN ONLY)
# =====================================================================

@admin_required
def builder_studio_view(request):
    """
    Salesforce-style Setup Studio home page.
    Lists all configurable ObjectDefinitions with field counts, statuses, and quick management links.
    """
    # Ensure standard entities are seeded
    if ObjectDefinition.objects.count() < 6:
        seed_initial_objects_and_fields()

    objects = ObjectDefinition.objects.all().prefetch_related('fields').order_by('is_system', 'name')
    
    total_objects = objects.count()
    total_fields = FieldDefinition.objects.count()
    custom_fields_count = FieldDefinition.objects.filter(is_active=True).count()
    total_choices = FieldChoice.objects.filter(is_active=True).count()

    context = {
        'objects': objects,
        'total_objects': total_objects,
        'total_fields': total_fields,
        'custom_fields_count': custom_fields_count,
        'total_choices': total_choices,
    }
    return render(request, 'inventory/studio/studio_home.html', context)


@admin_required
def builder_object_detail_view(request, api_name):
    """
    Object Detail and Field Management Studio.
    Displays configured fields, ordering, choices, and interactive Live Form Preview.
    """
    obj_def = get_object_or_404(ObjectDefinition, api_name=api_name)
    fields = obj_def.fields.all().prefetch_related('choices', 'lookup_object').order_by('display_order', 'id')

    # Available objects for lookup relationship target
    available_lookup_targets = ObjectDefinition.objects.filter(is_active=True).exclude(id=obj_def.id).order_by('name')

    # Live preview helper data
    preview_fields_data = []
    for f in fields.filter(is_active=True):
        choices = []
        if f.field_type in ('select', 'radio', 'multiselect'):
            choices = list(f.choices.filter(is_active=True).order_by('display_order'))
        elif f.field_type == 'lookup' and f.lookup_object:
            choices = get_lookup_choices(f.lookup_object.api_name)[:15]

        preview_fields_data.append({
            'field': f,
            'choices': choices,
        })

    context = {
        'object': obj_def,
        'fields': fields,
        'available_lookup_targets': available_lookup_targets,
        'preview_fields_data': preview_fields_data,
        'field_types': FieldDefinition.FIELD_TYPE_CHOICES,
    }
    return render(request, 'inventory/studio/object_detail.html', context)


@admin_required
def builder_object_create_view(request):
    """
    Creates a new custom ObjectDefinition.
    """
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        raw_api_name = request.POST.get('api_name', '').strip()
        description = request.POST.get('description', '').strip()
        icon = request.POST.get('icon', 'fa-cube').strip()

        # Sanitize API name
        api_name = re.sub(r'[^a-z0-9_]', '', raw_api_name.lower().replace(' ', '_'))
        if not api_name and name:
            api_name = re.sub(r'[^a-z0-9_]', '', name.lower().replace(' ', '_'))

        if not name or not api_name:
            messages.error(request, "Object name and API key are required.")
            return redirect('builder_studio')

        if ObjectDefinition.objects.filter(api_name=api_name).exists():
            messages.error(request, f"An object with API key '{api_name}' already exists.")
            return redirect('builder_studio')

        new_obj = ObjectDefinition.objects.create(
            name=name,
            api_name=api_name,
            description=description,
            icon=icon or 'fa-cube',
            is_system=False,
            is_active=True,
            created_by=request.user
        )

        # Default Name field
        FieldDefinition.objects.create(
            object_definition=new_obj,
            label=f"{name} Name",
            api_name='name',
            field_type='text',
            is_required=True,
            show_in_list=True,
            display_order=10,
            help_text="Primary record identifier"
        )

        record_audit_log(request.user, "CREATE_OBJECT_DEFINITION", "ObjectDefinition", new_obj.id, f"Created object {new_obj.name}")
        messages.success(request, f"Custom object '{new_obj.name}' created successfully! You can now configure fields.")
        return redirect('builder_object_detail', api_name=new_obj.api_name)

    return redirect('builder_studio')


@admin_required
def builder_object_edit_view(request, api_name):
    """
    Edits an existing ObjectDefinition.
    """
    obj_def = get_object_or_404(ObjectDefinition, api_name=api_name)

    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        description = request.POST.get('description', '').strip()
        icon = request.POST.get('icon', obj_def.icon).strip()
        is_active = request.POST.get('is_active') == 'true'

        if not name:
            messages.error(request, "Object name cannot be empty.")
            return redirect('builder_object_detail', api_name=obj_def.api_name)

        obj_def.name = name
        obj_def.description = description
        obj_def.icon = icon
        obj_def.is_active = is_active
        obj_def.save()

        record_audit_log(request.user, "UPDATE_OBJECT_DEFINITION", "ObjectDefinition", obj_def.id, f"Updated object {obj_def.name}")
        messages.success(request, f"Object '{obj_def.name}' updated successfully.")

    return redirect('builder_object_detail', api_name=obj_def.api_name)


# =====================================================================
# 2. FIELD BUILDER & CHOICE CONFIGURATION (ADMIN ONLY)
# =====================================================================

@admin_required
def builder_field_create_view(request, api_name):
    """
    Adds a new FieldDefinition to an ObjectDefinition.
    Supports Salesforce-style configuration including choices, requirements, ordering, and validation.
    """
    obj_def = get_object_or_404(ObjectDefinition, api_name=api_name)

    if request.method == 'POST':
        label = request.POST.get('label', '').strip()
        raw_api_name = request.POST.get('api_name', '').strip()
        field_type = request.POST.get('field_type', 'text').strip()
        is_required = request.POST.get('is_required') == 'true'
        help_text = request.POST.get('help_text', '').strip()
        placeholder = request.POST.get('placeholder', '').strip()
        default_value = request.POST.get('default_value', '').strip()
        display_order = int(request.POST.get('display_order', 10) or 10)
        show_in_list = request.POST.get('show_in_list') == 'true'
        is_searchable = request.POST.get('is_searchable') == 'true'
        is_sensitive = request.POST.get('is_sensitive') == 'true'
        min_value = request.POST.get('min_value')
        max_value = request.POST.get('max_value')
        validation_regex = request.POST.get('validation_regex', '').strip()
        lookup_object_id = request.POST.get('lookup_object')
        raw_choices = request.POST.get('choices', '').strip()

        # Sanitize API name
        api_name_clean = re.sub(r'[^a-z0-9_]', '', raw_api_name.lower().replace(' ', '_'))
        if not api_name_clean and label:
            api_name_clean = re.sub(r'[^a-z0-9_]', '', label.lower().replace(' ', '_'))

        if not label or not api_name_clean:
            messages.error(request, "Field label and internal key are required.")
            return redirect('builder_object_detail', api_name=obj_def.api_name)

        if api_name_clean in PROTECTED_SYSTEM_FIELDS:
            messages.error(request, f"'{api_name_clean}' is a protected system field name and cannot be used.")
            return redirect('builder_object_detail', api_name=obj_def.api_name)

        if FieldDefinition.objects.filter(object_definition=obj_def, api_name=api_name_clean).exists():
            messages.error(request, f"A field with internal key '{api_name_clean}' already exists on this object.")
            return redirect('builder_object_detail', api_name=obj_def.api_name)

        # Lookup object target
        lookup_target = None
        if field_type == 'lookup' and lookup_object_id:
            lookup_target = ObjectDefinition.objects.filter(id=lookup_object_id).first()

        new_field = FieldDefinition.objects.create(
            object_definition=obj_def,
            label=label,
            api_name=api_name_clean,
            field_type=field_type,
            is_required=is_required,
            help_text=help_text,
            placeholder=placeholder,
            default_value=default_value,
            display_order=display_order,
            is_active=True,
            show_in_list=show_in_list,
            is_searchable=is_searchable,
            is_sensitive=is_sensitive,
            min_value=float(min_value) if min_value else None,
            max_value=float(max_value) if max_value else None,
            validation_regex=validation_regex,
            lookup_object=lookup_target
        )

        # Parse and save dropdown/radio choices
        if field_type in ('select', 'radio', 'multiselect') and raw_choices:
            lines = [line.strip() for line in raw_choices.split('\n') if line.strip()]
            for idx, line in enumerate(lines):
                if ':' in line:
                    val, lbl = line.split(':', 1)
                elif ',' in line:
                    val, lbl = line.split(',', 1)
                else:
                    val, lbl = line, line
                val_clean = re.sub(r'[^a-zA-Z0-9_]', '', val.strip().lower().replace(' ', '_'))
                FieldChoice.objects.create(
                    field_definition=new_field,
                    value=val_clean or f"opt_{idx+1}",
                    label=lbl.strip(),
                    display_order=(idx + 1) * 10
                )

        record_audit_log(
            request.user,
            "CREATE_FIELD_DEFINITION",
            "FieldDefinition",
            new_field.id,
            f"Created field '{new_field.label}' ({new_field.api_name}, Type: {new_field.field_type}, Required: {new_field.is_required}) on {obj_def.name}"
        )

        messages.success(request, f"Field '{new_field.label}' published successfully to '{obj_def.name}'. No code deployment needed!")
        return redirect('builder_object_detail', api_name=obj_def.api_name)

    return redirect('builder_object_detail', api_name=obj_def.api_name)


@admin_required
def builder_field_edit_view(request, field_id):
    """
    Edits an existing FieldDefinition.
    Enforces security: cannot change api_name if records already have data for this field.
    """
    field_def = get_object_or_404(FieldDefinition, id=field_id)
    obj_def = field_def.object_definition

    if request.method == 'POST':
        label = request.POST.get('label', '').strip()
        help_text = request.POST.get('help_text', '').strip()
        placeholder = request.POST.get('placeholder', '').strip()
        default_value = request.POST.get('default_value', '').strip()
        display_order = int(request.POST.get('display_order', field_def.display_order) or field_def.display_order)
        is_required = request.POST.get('is_required') == 'true'
        show_in_list = request.POST.get('show_in_list') == 'true'
        is_searchable = request.POST.get('is_searchable') == 'true'
        is_sensitive = request.POST.get('is_sensitive') == 'true'
        min_value = request.POST.get('min_value')
        max_value = request.POST.get('max_value')
        validation_regex = request.POST.get('validation_regex', '').strip()
        lookup_object_id = request.POST.get('lookup_object')

        # Check API Name protection
        new_api_name = request.POST.get('api_name', '').strip().lower()
        if new_api_name and new_api_name != field_def.api_name:
            if field_def.has_stored_data:
                messages.error(request, f"Cannot rename internal key '{field_def.api_name}' because existing records contain saved data for this field.")
                return redirect('builder_object_detail', api_name=obj_def.api_name)
            else:
                clean_api = re.sub(r'[^a-z0-9_]', '', new_api_name.replace(' ', '_'))
                if clean_api not in PROTECTED_SYSTEM_FIELDS:
                    field_def.api_name = clean_api

        field_def.label = label or field_def.label
        field_def.help_text = help_text
        field_def.placeholder = placeholder
        field_def.default_value = default_value
        field_def.display_order = display_order
        field_def.is_required = is_required
        field_def.show_in_list = show_in_list
        field_def.is_searchable = is_searchable
        field_def.is_sensitive = is_sensitive
        field_def.min_value = float(min_value) if min_value else None
        field_def.max_value = float(max_value) if max_value else None
        field_def.validation_regex = validation_regex

        if field_def.field_type == 'lookup' and lookup_object_id:
            field_def.lookup_object = ObjectDefinition.objects.filter(id=lookup_object_id).first()

        field_def.save()

        # Update choices if provided
        raw_choices = request.POST.get('choices', '').strip()
        if field_def.field_type in ('select', 'radio', 'multiselect') and raw_choices:
            # Re-create or update choices
            lines = [line.strip() for line in raw_choices.split('\n') if line.strip()]
            existing_values = set()
            for idx, line in enumerate(lines):
                if ':' in line:
                    val, lbl = line.split(':', 1)
                elif ',' in line:
                    val, lbl = line.split(',', 1)
                else:
                    val, lbl = line, line
                val_clean = re.sub(r'[^a-zA-Z0-9_]', '', val.strip().lower().replace(' ', '_')) or f"opt_{idx+1}"
                existing_values.add(val_clean)

                choice, created = FieldChoice.objects.get_or_create(
                    field_definition=field_def,
                    value=val_clean,
                    defaults={'label': lbl.strip(), 'display_order': (idx + 1) * 10, 'is_active': True}
                )
                if not created:
                    choice.label = lbl.strip()
                    choice.display_order = (idx + 1) * 10
                    choice.is_active = True
                    choice.save()

            # Mark removed choices as inactive instead of deleting (preserves historical data)
            field_def.choices.exclude(value__in=existing_values).update(is_active=False)

        record_audit_log(request.user, "UPDATE_FIELD_DEFINITION", "FieldDefinition", field_def.id, f"Updated field {field_def.label} on {obj_def.name}")
        messages.success(request, f"Field '{field_def.label}' updated successfully.")

    return redirect('builder_object_detail', api_name=obj_def.api_name)


@admin_required
def builder_field_toggle_active_view(request, field_id):
    """
    Toggles is_active for a field.
    Warns if deactivating a field that already contains stored record values.
    """
    field_def = get_object_or_404(FieldDefinition, id=field_id)
    obj_def = field_def.object_definition

    if field_def.is_active:
        has_data = field_def.has_stored_data
        field_def.is_active = False
        field_def.save(update_fields=['is_active', 'updated_at'])
        if has_data:
            messages.warning(
                request,
                f"Field '{field_def.label}' has been deactivated. Note: Existing records still retain their historical values, but the field is now hidden on new forms."
            )
        else:
            messages.info(request, f"Field '{field_def.label}' has been deactivated.")
    else:
        field_def.is_active = True
        field_def.save(update_fields=['is_active', 'updated_at'])
        messages.success(request, f"Field '{field_def.label}' reactivated and restored to active forms.")

    record_audit_log(request.user, "TOGGLE_FIELD_ACTIVE", "FieldDefinition", field_def.id, f"Set active={field_def.is_active} for {field_def.label}")
    return redirect('builder_object_detail', api_name=obj_def.api_name)


@csrf_exempt
@admin_required
def builder_field_reorder_api(request, api_name):
    """
    API for drag-and-drop or batch reordering of fields.
    Receives JSON: [{"id": 1, "order": 10}, {"id": 2, "order": 20}]
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    try:
        data = json.loads(request.body.decode('utf-8'))
        items = data.get('items', [])
        for item in items:
            f_id = item.get('id')
            order = item.get('order', 10)
            FieldDefinition.objects.filter(id=f_id, object_definition__api_name=api_name).update(display_order=order)
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# =====================================================================
# 3. DYNAMIC RECORD CRUD & LIST SCREENS (MANAGEMENT & ADMIN)
# =====================================================================

@login_required
def dynamic_record_list_view(request, api_name):
    """
    Configurable Record List Screen for any business object.
    Displays standard fields and custom fields configured with show_in_list=True.
    Includes full-text search across searchable fields and pagination.
    """
    obj_def = get_object_or_404(ObjectDefinition, api_name=api_name, is_active=True)
    active_fields = obj_def.fields.filter(is_active=True).order_by('display_order', 'id')
    list_fields = active_fields.filter(show_in_list=True)
    if not list_fields.exists():
        list_fields = active_fields[:5]

    search_query = request.GET.get('q', '').strip()
    model_cls = get_model_for_object_key(api_name)

    records = []
    if model_cls:
        qs = model_cls.objects.all()
        if search_query:
            # Build search filter over text fields
            q_filter = Q()
            if hasattr(model_cls, 'name'):
                q_filter |= Q(name__icontains=search_query)
            if hasattr(model_cls, 'code'):
                q_filter |= Q(code__icontains=search_query)
            if hasattr(model_cls, 'phone'):
                q_filter |= Q(phone__icontains=search_query)
            if hasattr(model_cls, 'email'):
                q_filter |= Q(email__icontains=search_query)
            if hasattr(model_cls, 'worker_id'):
                q_filter |= Q(worker_id__icontains=search_query)
            if hasattr(model_cls, 'username'):
                q_filter |= Q(username__icontains=search_query)
            qs = qs.filter(q_filter)
        records = qs.order_by('-id')
    else:
        qs = DynamicRecord.objects.filter(object_definition=obj_def)
        if search_query:
            qs = qs.filter(Q(name__icontains=search_query) | Q(record_id__icontains=search_query))
        records = qs.order_by('-created_at')

    paginator = Paginator(records, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Transform records to extract cell values for table columns
    table_rows = []
    for rec in page_obj:
        cells = []
        for f in list_fields:
            val = None
            if hasattr(rec, f.api_name):
                attr = getattr(rec, f.api_name)
                # Handle foreign key display
                if hasattr(attr, 'name'):
                    val = attr.name
                elif hasattr(attr, 'display_name'):
                    val = attr.display_name
                else:
                    val = attr
            else:
                custom_dict = getattr(rec, 'custom_fields', {}) or getattr(rec, 'data', {}) or {}
                val = custom_dict.get(f.api_name, '')

            # Mask if sensitive
            if f.is_sensitive and not request.user.is_admin and val:
                val_str = str(val).replace(' ', '').replace('-', '')
                val = f"XXXX-XXXX-{val_str[-4:]}" if len(val_str) >= 4 else "XXXXXXXX"

            # Format booleans
            if f.field_type == 'boolean':
                val = "Yes" if val in (True, 'true', 'True', 1, '1') else "No"

            cells.append(val if val is not None else '')

        rec_name = getattr(rec, 'name', None) or getattr(rec, 'display_name', None) or getattr(rec, 'worker_id', None) or getattr(rec, 'code', None) or f"Record #{rec.id}"
        table_rows.append({
            'id': rec.id,
            'name': rec_name,
            'cells': cells,
            'raw_record': rec
        })

    context = {
        'object': obj_def,
        'list_fields': list_fields,
        'table_rows': table_rows,
        'page_obj': page_obj,
        'search_query': search_query,
        'total_count': paginator.count,
    }
    return render(request, 'inventory/studio/record_list.html', context)


@login_required
def dynamic_record_create_view(request, api_name):
    """
    Renders dynamic form and processes creation for any ObjectDefinition.
    Enforces active FieldDefinitions, required flags, type validation, choices, and cascading lookups.
    """
    obj_def = get_object_or_404(ObjectDefinition, api_name=api_name, is_active=True)

    if not (request.user.is_admin or request.user.is_management):
        messages.error(request, "Permission denied: Management Staff or Admin privileges required.")
        return redirect('dynamic_record_list', api_name=api_name)

    active_fields = obj_def.fields.filter(is_active=True).order_by('display_order', 'id')

    # Prepare field choices and lookup targets for rendering
    fields_render_data = []
    for f in active_fields:
        choices = []
        if f.field_type in ('select', 'radio', 'multiselect'):
            choices = list(f.choices.filter(is_active=True).order_by('display_order'))
        elif f.field_type == 'lookup' and f.lookup_object:
            choices = get_lookup_choices(f.lookup_object.api_name)

        fields_render_data.append({
            'field': f,
            'choices': choices,
        })

    if request.method == 'POST':
        instance, errors = save_dynamic_form_data(obj_def, request.POST, request.FILES, instance=None, user=request.user)
        if errors:
            messages.error(request, "Please correct the errors in the form below.")
            context = {
                'object': obj_def,
                'fields_render_data': fields_render_data,
                'errors': errors,
                'submitted_data': request.POST,
                'is_edit': False,
            }
            return render(request, 'inventory/studio/record_form.html', context)

        messages.success(request, f"{obj_def.name} record created successfully!")
        return redirect('dynamic_record_list', api_name=obj_def.api_name)

    context = {
        'object': obj_def,
        'fields_render_data': fields_render_data,
        'errors': {},
        'submitted_data': {},
        'is_edit': False,
    }
    return render(request, 'inventory/studio/record_form.html', context)


@login_required
def dynamic_record_edit_view(request, api_name, record_id):
    """
    Prepopulates and processes edits on core and dynamic custom fields.
    """
    obj_def = get_object_or_404(ObjectDefinition, api_name=api_name, is_active=True)

    if not (request.user.is_admin or request.user.is_management):
        messages.error(request, "Permission denied: Management Staff or Admin privileges required.")
        return redirect('dynamic_record_list', api_name=api_name)

    model_cls = get_model_for_object_key(api_name)
    if model_cls:
        instance = get_object_or_404(model_cls, pk=record_id)
    else:
        instance = get_object_or_404(DynamicRecord, pk=record_id, object_definition=obj_def)

    active_fields = obj_def.fields.filter(is_active=True).order_by('display_order', 'id')

    # Build prepopulated data dictionary
    prepopulated_data = {}
    for f in active_fields:
        if hasattr(instance, f.api_name):
            val = getattr(instance, f.api_name)
            if hasattr(val, 'id'):
                val = val.id
            prepopulated_data[f.api_name] = val
        else:
            custom_dict = getattr(instance, 'custom_fields', {}) or getattr(instance, 'data', {}) or {}
            prepopulated_data[f.api_name] = custom_dict.get(f.api_name, '')

    # Prepare choices and lookups
    fields_render_data = []
    for f in active_fields:
        choices = []
        if f.field_type in ('select', 'radio', 'multiselect'):
            choices = list(f.choices.filter(is_active=True).order_by('display_order'))
        elif f.field_type == 'lookup' and f.lookup_object:
            choices = get_lookup_choices(f.lookup_object.api_name)

        fields_render_data.append({
            'field': f,
            'choices': choices,
        })

    if request.method == 'POST':
        saved_instance, errors = save_dynamic_form_data(obj_def, request.POST, request.FILES, instance=instance, user=request.user)
        if errors:
            messages.error(request, "Please correct the errors in the form below.")
            context = {
                'object': obj_def,
                'fields_render_data': fields_render_data,
                'errors': errors,
                'submitted_data': request.POST,
                'instance': instance,
                'is_edit': True,
            }
            return render(request, 'inventory/studio/record_form.html', context)

        messages.success(request, f"{obj_def.name} record updated successfully!")
        return redirect('dynamic_record_list', api_name=obj_def.api_name)

    context = {
        'object': obj_def,
        'fields_render_data': fields_render_data,
        'errors': {},
        'submitted_data': prepopulated_data,
        'instance': instance,
        'is_edit': True,
    }
    return render(request, 'inventory/studio/record_form.html', context)


# =====================================================================
# 4. MASS CAMERA ASSIGNMENT STUDIO (ADMIN & MANAGEMENT STAFF)
# =====================================================================

@login_required
def mass_camera_assignment_view(request):
    """
    Mass Camera Assignment Studio.
    Allows Admins and Management Staff to select available devices, select target worker,
    preview the atomic assignment batch, and execute with per-device assignment and movement tracking.
    """
    if not (request.user.is_admin or request.user.is_management):
        messages.error(request, "Access restricted to Management Staff and System Administrators.")
        return redirect('dashboard')

    # Active workers for target dropdown
    workers = Worker.objects.select_related('employer_company').order_by('name')
    
    # Available cameras in storage or with collector
    available_devices = Device.objects.filter(
        current_status__in=['AVAILABLE_STORAGE', 'WITH_COLLECTOR']
    ).select_related('source_client').order_by('asset_id')

    # Dynamic fields defined on mass_camera_assignment object
    obj_def = ObjectDefinition.objects.filter(api_name='mass_camera_assignment').first()
    dynamic_fields = []
    if obj_def:
        for f in obj_def.fields.filter(is_active=True).exclude(api_name__in=['batch_id', 'target_worker', 'notes']):
            choices = []
            if f.field_type in ('select', 'radio', 'multiselect'):
                choices = list(f.choices.filter(is_active=True).order_by('display_order'))
            dynamic_fields.append({'field': f, 'choices': choices})

    # Recent batches
    recent_batches = MassCameraAssignmentBatch.objects.select_related('actor').order_by('-created_at')[:10]

    if request.method == 'POST':
        worker_id = request.POST.get('target_worker')
        notes = request.POST.get('notes', '').strip()
        expected_return_date = request.POST.get('expected_return_date') or None

        # Device IDs from checkboxes and manual text input / scan box
        device_ids = request.POST.getlist('device_ids')
        manual_assets_raw = request.POST.get('manual_asset_ids', '').strip()

        if manual_assets_raw:
            manual_tokens = [tok.strip() for tok in re.split(r'[,\s\n]+', manual_assets_raw) if tok.strip()]
            for token in manual_tokens:
                # Find device by Asset ID, Serial, or QR token
                matched_dev = Device.objects.filter(
                    Q(asset_id__iexact=token) | Q(imei_or_serial__iexact=token) | Q(qr_token__iexact=token)
                ).first()
                if matched_dev and matched_dev.id not in device_ids:
                    device_ids.append(str(matched_dev.id))

        # Dynamic custom field values
        custom_fields = {}
        if obj_def:
            for df in dynamic_fields:
                f_key = df['field'].api_name
                if f_key in request.POST:
                    custom_fields[f_key] = request.POST.get(f_key)

        success, msg, batch = execute_mass_camera_assignment(
            user=request.user,
            device_ids=device_ids,
            worker_id=worker_id,
            custom_fields=custom_fields,
            notes=notes,
            expected_return_date=expected_return_date
        )

        if success and batch:
            messages.success(request, f"{msg} (Batch #{batch.batch_id})")
            return redirect('mass_assignment_summary', batch_id=batch.batch_id)
        else:
            messages.error(request, msg)

    context = {
        'workers': workers,
        'available_devices': available_devices,
        'available_count': available_devices.count(),
        'dynamic_fields': dynamic_fields,
        'recent_batches': recent_batches,
    }
    return render(request, 'inventory/mass_assignment.html', context)


@login_required
def mass_camera_assignment_summary_view(request, batch_id):
    """
    Summary view of an executed Mass Camera Assignment Batch.
    Displays individual outcome rows and download report link.
    """
    batch = get_object_or_404(MassCameraAssignmentBatch, batch_id=batch_id)
    return render(request, 'inventory/mass_assignment_summary.html', {'batch': batch})


@login_required
def mass_camera_assignment_export_csv(request, batch_id):
    """
    Downloads an explicit CSV audit report for an assignment batch.
    Requirement 8: Provide a downloadable result report.
    """
    batch = get_object_or_404(MassCameraAssignmentBatch, batch_id=batch_id)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="Mass_Assignment_{batch.batch_id}.csv"'

    writer = csv.writer(response)
    writer.writerow(['Batch ID', 'Executed By', 'Timestamp', 'Status', 'Total Devices', 'Successful', 'Failed', 'Notes'])
    writer.writerow([
        batch.batch_id,
        batch.actor.display_name,
        batch.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        batch.status,
        batch.total_devices,
        batch.successful_assignments,
        batch.failed_assignments,
        batch.notes
    ])
    writer.writerow([])
    writer.writerow(['Device Asset ID', 'Brand & Model', 'Status', 'Assignment ID', 'Message / Reason'])

    for row in batch.summary_report:
        writer.writerow([
            row.get('asset_id', ''),
            row.get('brand_and_model', 'N/A'),
            'SUCCESS' if row.get('success') else 'FAILED',
            row.get('assignment_id', ''),
            row.get('reason', '')
        ])

    return response


# =====================================================================
# 5. CASCADING CLIENT -> CONTACT LOOKUP API
# =====================================================================

@login_required
def cascading_client_contacts_api(request):
    """
    API endpoint returning client contacts filtered by selected client.
    Requirement 6: When Client is selected in form, filter Client Contact dropdown.
    """
    client_id = request.GET.get('client_id')
    if not client_id:
        return JsonResponse({'success': True, 'contacts': []})

    contacts = ClientContact.objects.filter(client_id=client_id, is_active=True).order_by('name')
    data = [{'id': c.id, 'name': c.name, 'designation': c.designation or 'POC', 'phone': c.phone} for c in contacts]
    return JsonResponse({'success': True, 'contacts': data})
