from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Pickup, PickupDevice, Assignment, Transfer,
    DeviceReturn, DeviceMovement, Task, Incident, AuditLog
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Role & Contact', {'fields': ('role', 'phone')}),
    )
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active', 'is_staff']
    search_fields = ['username', 'first_name', 'last_name', 'email', 'phone']


class ClientContactInline(admin.TabularInline):
    model = ClientContact
    extra = 1


@admin.register(ClientCompany)
class ClientCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'city', 'state', 'status', 'created_at']
    list_filter = ['status', 'state']
    search_fields = ['name', 'code', 'city']
    inlines = [ClientContactInline]


@admin.register(ClientContact)
class ClientContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'client', 'designation', 'phone', 'email', 'is_active', 'created_at']
    list_filter = ['client', 'is_active', 'created_at']
    search_fields = ['name', 'phone', 'email', 'designation', 'client__name']



@admin.register(EmployerCompany)
class EmployerCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['name', 'code']


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ['worker_id', 'name', 'employer_company', 'phone', 'role_or_status', 'created_at']
    list_filter = ['employer_company', 'role_or_status']
    search_fields = ['worker_id', 'name', 'phone', 'email']


class DeviceMovementInline(admin.TabularInline):
    model = DeviceMovement
    extra = 0
    readonly_fields = ['from_custodian_name', 'to_custodian_name', 'from_status', 'to_status', 'actor', 'timestamp', 'related_transaction_type', 'notes']
    can_delete = False


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['asset_id', 'brand_and_model', 'device_type', 'imei_or_serial', 'source_client', 'current_status', 'custodian_display', 'received_date']
    list_filter = ['current_status', 'current_custodian_type', 'device_type', 'source_client']
    search_fields = ['asset_id', 'brand_and_model', 'imei_or_serial']
    readonly_fields = ['qr_token', 'qr_code_image', 'created_at', 'updated_at']
    inlines = [DeviceMovementInline]


@admin.register(Pickup)
class PickupAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'actual_poc', 'collecting_user', 'scheduled_time', 'status']
    list_filter = ['status', 'scheduled_time']
    search_fields = ['client__name', 'collecting_user__username']


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['device', 'worker', 'delivering_user', 'assignment_time', 'status', 'expected_return_date']
    list_filter = ['status', 'assignment_time']
    search_fields = ['device__asset_id', 'worker__name', 'worker__worker_id']


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ['id', 'device', 'sender', 'receiver', 'status', 'initiated_at', 'accepted_at']
    list_filter = ['status', 'initiated_at']
    search_fields = ['device__asset_id', 'sender__username', 'receiver__username']


@admin.register(DeviceReturn)
class DeviceReturnAdmin(admin.ModelAdmin):
    list_display = ['id', 'device', 'worker', 'receiving_user', 'return_time', 'inspection_completed', 'outcome']
    list_filter = ['inspection_completed', 'outcome', 'return_time']
    search_fields = ['device__asset_id', 'worker__name']


@admin.register(DeviceMovement)
class DeviceMovementAdmin(admin.ModelAdmin):
    list_display = ['device', 'from_custodian_name', 'to_custodian_name', 'to_status', 'actor', 'timestamp', 'related_transaction_type']
    list_filter = ['related_transaction_type', 'to_status', 'timestamp']
    search_fields = ['device__asset_id', 'from_custodian_name', 'to_custodian_name', 'notes']
    readonly_fields = [f.name for f in DeviceMovement._meta.fields]

    def has_delete_permission(self, request, obj=None):
        # Movements are append-only
        return False


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'task_type', 'assigned_user', 'priority', 'status', 'scheduled_time']
    list_filter = ['task_type', 'status', 'priority']
    search_fields = ['title', 'assigned_user__username']


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['id', 'device', 'incident_type', 'reporter', 'status', 'timestamp']
    list_filter = ['incident_type', 'status', 'timestamp']
    search_fields = ['device__asset_id', 'notes']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'actor', 'action', 'record_type', 'record_id', 'ip_address']
    list_filter = ['action', 'record_type', 'timestamp']
    search_fields = ['action', 'record_type', 'record_id', 'safe_metadata']
    readonly_fields = [f.name for f in AuditLog._meta.fields]

    def has_delete_permission(self, request, obj=None):
        return False
