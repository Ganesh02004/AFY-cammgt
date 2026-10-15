from django.urls import path
from . import views
from . import builder_views

urlpatterns = [
    # Auth & Profile
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('complete-profile/', views.complete_profile_view, name='complete_profile'),
    path('pending-approval/', views.pending_approval_view, name='pending_approval'),
    path('profile/', views.profile_view, name='profile'),
    path('api/auth/firebase-login/', views.firebase_login_api, name='firebase_login_api'),
    path('api/auth/google-quick/', views.google_quick_login_api, name='google_quick_login_api'),
    path('api/auth/keep-alive/', views.session_keepalive_api, name='session_keepalive'),
    path('', views.dashboard_view, name='dashboard'),
    path('dashboard/', views.dashboard_view, name='dashboard_alias'),

    # Inventories
    path('my-inventory/', views.my_inventory_view, name='my_inventory'),
    path('master-inventory/', views.company_master_inventory_view, name='master_inventory'),

    # Devices, QR & Remote Scanner
    path('device/<int:device_id>/', views.device_detail_view, name='device_detail'),
    path('device/<int:device_id>/delete/', views.device_delete_view, name='device_delete'),
    path('device/qr/<uuid:qr_token>/', views.device_qr_lookup_view, name='device_qr_lookup'),
    path('device/<int:device_id>/label/', views.device_label_print_view, name='device_label_print'),
    path('device/<int:device_id>/adjustment/', views.audited_adjustment_view, name='audited_adjustment'),
    path('scan/', views.qr_scanner_view, name='qr_scanner'),
    path('scan/remote/<str:pairing_token>/', views.remote_scanner_view, name='remote_scanner'),

    # Remote Scanner APIs
    path('api/scanner/session/<str:pairing_token>/scan/', views.scanner_session_scan_api, name='scanner_session_scan_api'),
    path('api/scanner/session/<uuid:session_id>/status/', views.scanner_session_status_api, name='scanner_session_status_api'),
    path('api/scanner/session/<uuid:session_id>/disconnect/', views.scanner_session_disconnect_api, name='scanner_session_disconnect_api'),

    # Workflows & Dynamic Location
    path('intake/', views.collect_from_client_view, name='collect_from_client'),
    path('pickups/<int:pickup_id>/', views.pickup_detail_view, name='pickup_detail'),
    path('assign/', views.assign_to_worker_view, name='assign_to_worker'),
    path('assign/<int:device_id>/', views.assign_to_worker_view, name='assign_device_to_worker'),
    path('transfer/<int:device_id>/', views.transfer_initiate_view, name='transfer_initiate'),
    path('transfers/', views.transfer_list_view, name='transfer_list'),
    path('transfers/<int:transfer_id>/<str:action>/', views.transfer_action_view, name='transfer_action'),
    path('returns/', views.return_process_view, name='return_process'),
    path('returns/<int:device_id>/', views.return_process_view, name='return_device_process'),
    path('returns/quick/<int:device_id>/', views.qr_quick_return_view, name='qr_quick_return'),
    path('inspections/', views.inspection_queue_view, name='inspection_queue'),
    path('inspections/<int:return_id>/', views.inspection_complete_view, name='inspection_complete'),

    # Dynamic Client POC API & Management
    path('api/clients/<int:client_id>/contacts/', views.client_contacts_api_view, name='client_contacts_api'),
    path('api/clients/<int:client_id>/contacts/create/', views.client_contact_create_api, name='client_contact_create_api'),
    path('contacts/<int:contact_id>/delete/', views.client_contact_delete_view, name='client_contact_delete'),

    # Incidents
    path('incidents/', views.incident_list_view, name='incident_list'),
    path('incidents/report/', views.incident_report_view, name='incident_report'),
    path('incidents/report/<int:device_id>/', views.incident_report_view, name='incident_report_device'),
    path('incidents/<int:incident_id>/resolve/', views.incident_resolve_view, name='incident_resolve'),

    # Partners & Personnel
    path('clients/', views.clients_list_view, name='clients_list'),
    path('clients/new/', views.client_create_view, name='client_create'),
    path('clients/<int:client_id>/', views.client_detail_view, name='client_detail'),
    path('workers/', views.workers_list_view, name='workers_list'),
    path('workers/new/', views.worker_create_view, name='worker_create'),
    path('workers/<int:worker_id>/', views.worker_detail_view, name='worker_detail'),
    path('employers/', views.employer_companies_list_view, name='employer_companies_list'),

    # Tasks
    path('tasks/', views.tasks_list_view, name='tasks_list'),
    path('tasks/new/', views.task_create_view, name='task_create'),
    path('tasks/<int:task_id>/update-status/', views.task_update_status_view, name='task_update_status'),

    # Reports
    path('reports/', views.reports_view, name='reports'),
    path('reports/export/<str:report_type>/', views.export_csv_view, name='export_csv'),

    # Admin Management & Auditing
    path('users/', views.user_management_view, name='user_management'),
    path('users/new/', views.user_create_view, name='user_create'),
    path('users/<int:user_id>/edit/', views.user_edit_view, name='user_edit'),
    path('users/<int:user_id>/approve/', views.user_approve_view, name='user_approve'),
    path('users/<int:user_id>/reject/', views.user_reject_view, name='user_reject'),
    path('users/<int:user_id>/toggle-status/', views.user_toggle_status_view, name='user_toggle_status'),
    path('audit-logs/', views.audit_logs_view, name='audit_logs'),

    # Profile & System Maintenance
    path('profile/change-password/', views.change_password_view, name='change_password'),
    path('system/purge-data/', views.system_reset_data_view, name='system_reset_data'),

    # Salesforce-Style Setup Studio & Object / Field Builder (Admin Only)
    path('studio/', builder_views.builder_studio_view, name='builder_studio'),
    path('studio/objects/create/', builder_views.builder_object_create_view, name='builder_object_create'),
    path('studio/objects/<str:api_name>/', builder_views.builder_object_detail_view, name='builder_object_detail'),
    path('studio/objects/<str:api_name>/edit/', builder_views.builder_object_edit_view, name='builder_object_edit'),
    path('studio/objects/<str:api_name>/fields/create/', builder_views.builder_field_create_view, name='builder_field_create'),
    path('studio/fields/<int:field_id>/edit/', builder_views.builder_field_edit_view, name='builder_field_edit'),
    path('studio/fields/<int:field_id>/toggle-active/', builder_views.builder_field_toggle_active_view, name='builder_field_toggle_active'),
    path('studio/api/objects/<str:api_name>/reorder/', builder_views.builder_field_reorder_api, name='builder_field_reorder_api'),

    # Dynamic Object Records (Configurable CRUD)
    path('objects/<str:api_name>/', builder_views.dynamic_record_list_view, name='dynamic_record_list'),
    path('objects/<str:api_name>/new/', builder_views.dynamic_record_create_view, name='dynamic_record_create'),
    path('objects/<str:api_name>/<int:record_id>/edit/', builder_views.dynamic_record_edit_view, name='dynamic_record_edit'),

    # Mass Camera Assignment Studio
    path('assignments/mass/', builder_views.mass_camera_assignment_view, name='mass_camera_assignment'),
    path('assignments/mass/<str:batch_id>/', builder_views.mass_camera_assignment_summary_view, name='mass_assignment_summary'),
    path('assignments/mass/<str:batch_id>/export/', builder_views.mass_camera_assignment_export_csv, name='mass_assignment_export_csv'),

    # Cascading APIs
    path('api/builder/client-contacts/', builder_views.cascading_client_contacts_api, name='cascading_client_contacts_api'),
]


