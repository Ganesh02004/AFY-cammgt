export type UserRole = 'ADMIN' | 'MANAGEMENT' | 'POSTMAN';
export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'DEACTIVATED';

export interface User {
  id: number;
  sequence_id?: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  phone: string;
  employee_id?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  work_location?: string;
  is_staff: boolean;
  is_active: boolean;
  profile_photo?: string;
  custom_fields?: Record<string, any>;
  created_at?: string;
}

export interface ClientCompany {
  id: number;
  name: string;
  code: string;
  sequence_id?: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  latitude?: number | null;
  longitude?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
  custom_fields?: Record<string, any>;
  created_at: string;
}

export type OfficeType = 'HEADQUARTERS' | 'REGIONAL' | 'BRANCH' | 'WAREHOUSE' | 'SITE_OFFICE';

export interface ClientOffice {
  id: number;
  sequence_id: string; // e.g. OFC-0001
  client_id: number;
  name: string;
  office_type: OfficeType;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  latitude?: number | null;
  longitude?: number | null;
  contact_person?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
}

export type ProjectType = 'Household / Domestic' | 'Commercial';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';

export interface Project {
  id: number;
  sequence_id: string; // e.g. PRJ-0001
  name: string;
  project_type: ProjectType;
  client_id: number;
  contact_ids: number[]; // Linked client contacts/POCs
  status: ProjectStatus;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: number;
  sequence_id?: string; // e.g. CON-0001
  client_id: number;
  name: string;
  designation?: string;
  phone: string;
  email?: string;
  project_ids?: number[]; // Projects this POC is associated with
  is_active: boolean;
  custom_fields?: Record<string, any>;
  created_at: string;
}

export interface EmployerCompany {
  id: number;
  sequence_id?: string;
  name: string;
  code: string;
  address: string;
  contact_details?: string;
  status: 'ACTIVE' | 'INACTIVE';
  custom_fields?: Record<string, any>;
  created_at: string;
}

export interface Worker {
  id: number;
  worker_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  employer_company_id: number;
  role_or_status: string;
  aadhaar_number?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  upi_id?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
}

export type DeviceType = 'CAMERA' | 'SMARTPHONE' | 'BODYCAM' | 'DASHCAM' | 'TABLET' | 'OTHER';

export type DeviceStatus = 
  | 'EXPECTED'
  | 'WITH_COLLECTOR'
  | 'AVAILABLE_STORAGE'
  | 'ASSIGNED_WORKER'
  | 'RETURN_REQUESTED'
  | 'RETURN_IN_TRANSIT'
  | 'AWAITING_INSPECTION'
  | 'UNDER_REPAIR'
  | 'DAMAGED'
  | 'LOST'
  | 'RETURNED_TO_CLIENT'
  | 'RETIRED';

export type CustodianType = 'USER' | 'WORKER' | 'STORAGE' | 'CLIENT';
export type DeviceCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';

export interface Device {
  id: number;
  asset_id: string;
  qr_token: string;
  device_type: DeviceType;
  brand_and_model: string;
  imei_or_serial?: string;
  accessories?: string;
  photo?: string;
  condition: DeviceCondition;
  source_client_id: number;
  project_id?: number;
  initial_poc_id?: number;
  current_status: DeviceStatus;
  current_custodian_type: CustodianType;
  current_custodian_user_id?: number | null;
  current_custodian_worker_id?: number | null;
  received_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PickupDevice {
  device_id: number;
  condition: DeviceCondition;
  accessories: string;
}

export interface Pickup {
  id: number;
  sequence_id?: string; // e.g. PCK-0001
  client_id: number;
  project_id?: number;
  actual_poc_id?: number;
  collecting_user_id: number;
  scheduled_time: string;
  actual_time?: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  created_at: string;
  devices: PickupDevice[];
}

export interface Assignment {
  id: number;
  sequence_id?: string; // e.g. ASN-0001
  device_id: number;
  worker_id: number;
  project_id?: number;
  delivering_user_id: number;
  assignment_time: string;
  condition: string;
  accessories: string;
  acknowledgement: string;
  expected_return_date?: string;
  closed_time?: string;
  status: 'ACTIVE' | 'RETURNED' | 'REPLACED' | 'TERMINATED';
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
}

export interface Transfer {
  id: number;
  device_id: number;
  sender_id: number;
  receiver_id: number;
  condition: string;
  initiated_at: string;
  accepted_at?: string;
  rejected_at?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
}

export type InspectionResult = 'PASSED' | 'NEEDS_REPAIR' | 'DAMAGED' | 'MISSING_ACCESSORIES';
export type ReturnOutcome = 'AVAILABLE_STORAGE' | 'RETURNED_CLIENT' | 'UNDER_REPAIR' | 'DAMAGED' | 'RETIRED';

export interface DeviceReturn {
  id: number;
  device_id: number;
  worker_id: number;
  receiving_user_id: number;
  return_time: string;
  condition: string;
  accessories: string;
  evidence?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
  inspection_completed: boolean;
  inspection_time?: string;
  inspector_id?: number;
  inspection_result?: InspectionResult;
  outcome?: ReturnOutcome;
  notes?: string;
}

export interface DeviceMovement {
  id: number;
  device_id: number;
  from_custodian_type: string;
  from_custodian_name: string;
  to_custodian_type: string;
  to_custodian_name: string;
  from_status: string;
  to_status: string;
  actor_id: number;
  actor_name: string;
  timestamp: string;
  related_transaction_type: string;
  related_transaction_id?: string;
  notes?: string;
}

export interface DeviceActivityLog {
  id: number;
  device_id: number;
  action: string;
  timestamp: string;
  actor_id?: number;
  actor_name: string;
  actor_role: string;
  details: string;
  latitude?: number | null;
  longitude?: number | null;
  location_address?: string;
  related_transaction_type?: string;
  related_transaction_id?: string;
}

export interface Task {
  id: number;
  sequence_id?: string; // e.g. TSK-0001
  task_type: 'PICKUP' | 'DELIVERY' | 'RETURN' | 'INSPECTION' | 'TRANSFER' | 'MAINTENANCE';
  title: string;
  assigned_user_id: number;
  client_id?: number;
  project_id?: number;
  worker_id?: number;
  device_id?: number;
  scheduled_time: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  outcome?: string;
  created_at: string;
}

export interface Incident {
  id: number;
  sequence_id?: string; // e.g. INC-0001
  device_id: number;
  incident_type: 'DAMAGE' | 'LOSS' | 'DISCREPANCY' | 'THEFT' | 'OTHER';
  reporter_id: number;
  timestamp: string;
  notes: string;
  evidence?: string;
  status: 'REPORTED' | 'INVESTIGATING' | 'RESOLVED';
  resolution_notes?: string;
}

export interface AuditLog {
  id: number;
  actor_id?: number;
  actor_name: string;
  action: string;
  record_type: string;
  record_id: string;
  timestamp: string;
  safe_metadata: string;
  ip_address: string;
}

// Dynamic Object Builder metadata types
export type DynamicFieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'select'
  | 'radio'
  | 'multiselect'
  | 'file'
  | 'lookup'
  | 'readonly';

export interface FieldChoice {
  id: number;
  value: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

export interface FieldDefinition {
  id: number;
  object_key: string;
  label: string;
  api_name: string;
  field_type: DynamicFieldType;
  is_required: boolean;
  help_text?: string;
  placeholder?: string;
  default_value?: string;
  display_order: number;
  is_active: boolean;
  is_searchable: boolean;
  show_in_list: boolean;
  is_sensitive: boolean;
  min_value?: number;
  max_value?: number;
  validation_regex?: string;
  lookup_object_key?: string;
  choices?: FieldChoice[];
}

export interface ObjectDefinition {
  id: number;
  name: string;
  api_name: string;
  description: string;
  icon: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DynamicRecord {
  id: number;
  object_key: string;
  record_id: string;
  name: string;
  data: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MassCameraAssignmentBatch {
  id: number;
  batch_id: string;
  actor_id: number;
  actor_name: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  total_devices: number;
  successful_assignments: number;
  failed_assignments: number;
  notes?: string;
  created_at: string;
  summary_report: {
    device_id: number;
    asset_id: string;
    brand_and_model?: string;
    success: boolean;
    reason: string;
  }[];
}

export type NotificationCategory = 'TASK' | 'INVENTORY' | 'TRANSFER' | 'APPROVAL' | 'ANNOUNCEMENT' | 'SYSTEM';

export interface AppNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  category: NotificationCategory;
  is_read: boolean;
  related_record_type?: 'device' | 'task' | 'transfer' | 'user' | 'project' | 'client' | 'announcement';
  related_record_id?: string | number;
  action_view?: string;
  action_params?: Record<string, any>;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  author_id: number;
  author_name: string;
  author_role: string;
  recipient_scope: 'ALL' | 'ROLE' | 'SELECTED_USERS';
  target_role?: UserRole;
  target_user_ids?: number[];
  is_pinned: boolean;
  published_at: string;
  expires_at?: string;
  acknowledged_by_user_ids: number[];
  related_record_type?: string;
  related_record_id?: string | number;
}
