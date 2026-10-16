import { 
  User, ClientCompany, ClientContact, EmployerCompany, Worker, 
  Device, Assignment, Pickup, Transfer, DeviceReturn, DeviceMovement, 
  DeviceActivityLog, Task, Incident, AuditLog, ObjectDefinition, FieldDefinition,
  MassCameraAssignmentBatch, Project, ClientOffice, AppNotification, Announcement
} from '../types';

export const initialUsers: User[] = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    email: "admin@camera-inventory.local",
    first_name: "Aarav",
    last_name: "Mehta",
    role: "ADMIN",
    approval_status: "APPROVED",
    phone: "+91 98200 11223",
    address: "Central Operations Command, Connaught Place, New Delhi",
    work_location: "HQ Central Hub",
    is_staff: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 2,
    username: "manager",
    password: "manager123",
    email: "manager@camera-inventory.local",
    first_name: "Deepa",
    last_name: "Nair",
    role: "MANAGEMENT",
    approval_status: "APPROVED",
    phone: "+91 98200 44556",
    address: "Logistics Hub 4, Whitefield, Bengaluru",
    work_location: "Bengaluru Regional Hub",
    is_staff: false,
    is_active: true,
    created_at: "2026-10-02T10:00:00Z"
  },
  {
    id: 3,
    username: "collector1",
    password: "collector123",
    email: "collector1@camera-inventory.local",
    first_name: "Rahul",
    last_name: "Joshi",
    role: "POSTMAN",
    approval_status: "APPROVED",
    phone: "+91 98200 77889",
    address: "North Sector Branch, Gurugram",
    work_location: "NCR Field Operations",
    is_staff: false,
    is_active: true,
    created_at: "2026-10-03T11:00:00Z"
  },
  {
    id: 4,
    username: "collector2",
    password: "collector123",
    email: "collector2@camera-inventory.local",
    first_name: "Sunil",
    last_name: "Verma",
    role: "POSTMAN",
    approval_status: "APPROVED",
    phone: "+91 98200 99001",
    address: "West Gate Depot, Andheri East, Mumbai",
    work_location: "Mumbai Field Operations",
    is_staff: false,
    is_active: true,
    created_at: "2026-10-04T12:00:00Z"
  },
  {
    id: 5,
    username: "mindra",
    password: "mindra123",
    email: "mindra@afy-inventory.com",
    first_name: "M",
    last_name: "Indra",
    role: "MANAGEMENT",
    approval_status: "APPROVED",
    phone: "+91 98450 12345",
    address: "Whitefield Technology Park, Bengaluru",
    work_location: "Bengaluru Tech Hub",
    is_staff: true,
    is_active: true,
    profile_photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    created_at: "2026-10-10T10:00:00Z"
  },
  {
    id: 7,
    username: "operations_lead",
    password: "ops123",
    email: "operations.lead@afy-inventory.com",
    first_name: "Vikram",
    last_name: "Rao",
    role: "MANAGEMENT",
    approval_status: "APPROVED",
    phone: "+91 97402 46889",
    address: "BTM Layout 2nd Stage, Bengaluru",
    work_location: "Bengaluru South Hub",
    is_staff: true,
    is_active: true,
    created_at: "2026-10-14T07:45:10Z"
  }
];

export const initialClients: ClientCompany[] = [
  {
    id: 1,
    name: "Apex Security Solutions",
    code: "APX",
    address: "402 Cyber City, Sector 24",
    city: "Gurugram",
    state: "Haryana",
    pin_code: "122002",
    status: "ACTIVE",
    created_at: "2026-09-15T08:00:00Z"
  },
  {
    id: 2,
    name: "Omni Express Logistics",
    code: "OMN",
    address: "Unit 12, Logistics Park, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    pin_code: "400069",
    status: "ACTIVE",
    created_at: "2026-09-20T08:00:00Z"
  },
  {
    id: 4,
    name: "Awgin Tech Innovations",
    code: "AWG-1212",
    address: "10th Main Road, HSR Layout Sector 1",
    city: "Bengaluru",
    state: "Karnataka",
    pin_code: "560029",
    status: "ACTIVE",
    created_at: "2026-10-14T04:04:19Z"
  }
];

export const initialClientOffices: ClientOffice[] = [
  {
    id: 1,
    sequence_id: "OFC-0001",
    client_id: 1,
    name: "Apex Corporate Headquarters",
    office_type: "HEADQUARTERS",
    address: "Building 10B, DLF Cyber City, Sector 24",
    city: "Gurugram",
    state: "Haryana",
    pin_code: "122002",
    latitude: 28.4907,
    longitude: 77.0898,
    contact_person: "Vikram Sethi",
    contact_phone: "+91 98765 43210",
    is_active: true,
    created_at: "2026-09-15T08:30:00Z"
  },
  {
    id: 2,
    sequence_id: "OFC-0002",
    client_id: 1,
    name: "Apex Whitefield Regional Tech Center",
    office_type: "REGIONAL",
    address: "Palm Meadows Boulevard, Whitefield",
    city: "Bengaluru",
    state: "Karnataka",
    pin_code: "560066",
    latitude: 12.9698,
    longitude: 77.7499,
    contact_person: "Rohit Verma",
    contact_phone: "+91 98765 11223",
    is_active: true,
    created_at: "2026-09-17T10:00:00Z"
  },
  {
    id: 3,
    sequence_id: "OFC-0003",
    client_id: 2,
    name: "Omni Logistics Hub & Depot",
    office_type: "WAREHOUSE",
    address: "Plot 45, Marol Industrial Area, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    pin_code: "400069",
    latitude: 19.1197,
    longitude: 72.8797,
    contact_person: "Pooja Kulkarni",
    contact_phone: "+91 98765 88990",
    is_active: true,
    created_at: "2026-09-20T08:30:00Z"
  },
  {
    id: 4,
    sequence_id: "OFC-0004",
    client_id: 4,
    name: "Awgin Tech Innovation Center",
    office_type: "HEADQUARTERS",
    address: "10th Main, Sector 4, HSR Layout",
    city: "Bengaluru",
    state: "Karnataka",
    pin_code: "560029",
    latitude: 12.9121,
    longitude: 77.6446,
    contact_person: "Aparana Rao",
    contact_phone: "+91 80735 32868",
    is_active: true,
    created_at: "2026-10-14T04:15:00Z"
  }
];

export const initialContacts: ClientContact[] = [
  {
    id: 1,
    sequence_id: "CON-0001",
    client_id: 1,
    name: "Vikram Sethi",
    designation: "Asset & Logistics Manager",
    phone: "+91 98765 43210",
    email: "vikram@apexsecurity.in",
    project_ids: [1, 2],
    is_active: true,
    created_at: "2026-09-15T09:00:00Z"
  },
  {
    id: 2,
    sequence_id: "CON-0002",
    client_id: 2,
    name: "Pooja Kulkarni",
    designation: "Operations Lead",
    phone: "+91 98765 88990",
    email: "pooja@omnielog.com",
    project_ids: [3],
    is_active: true,
    created_at: "2026-09-20T09:00:00Z"
  },
  {
    id: 9,
    sequence_id: "CON-0003",
    client_id: 4,
    name: "Aparana Rao",
    designation: "Device Custody Executive",
    phone: "+91 80735 32868",
    email: "aparana@awgin.in",
    project_ids: [4],
    is_active: true,
    created_at: "2026-10-14T07:41:22Z"
  }
];

export const initialProjects: Project[] = [
  {
    id: 1,
    sequence_id: "PRJ-0001",
    name: "Cyber City Surveillance Grid",
    project_type: "Commercial",
    client_id: 1,
    contact_ids: [1],
    status: "ACTIVE",
    description: "Enterprise multi-building CCTV and camera patrol deployment for Cyber City commercial hub.",
    address: "Building 10B, DLF Cyber City, Sector 24",
    city: "Gurugram",
    state: "Haryana",
    latitude: 28.4907,
    longitude: 77.0898,
    created_at: "2026-09-16T10:00:00Z",
    updated_at: "2026-09-16T10:00:00Z"
  },
  {
    id: 2,
    sequence_id: "PRJ-0002",
    name: "Villa Palms Residential Estate",
    project_type: "Household / Domestic",
    client_id: 1,
    contact_ids: [1],
    status: "ACTIVE",
    description: "Domestic perimeter monitoring and smart camera custody for residential gated community.",
    address: "Palm Meadows Boulevard, Whitefield",
    city: "Bengaluru",
    state: "Karnataka",
    latitude: 12.9698,
    longitude: 77.7499,
    created_at: "2026-09-18T11:30:00Z",
    updated_at: "2026-09-18T11:30:00Z"
  },
  {
    id: 3,
    sequence_id: "PRJ-0003",
    name: "Omni Hub Fulfillment Centers",
    project_type: "Commercial",
    client_id: 2,
    contact_ids: [2],
    status: "ACTIVE",
    description: "Commercial logistics warehouse security and fleet scanner tracking.",
    address: "Plot 45, Marol Industrial Area, Andheri East",
    city: "Mumbai",
    state: "Maharashtra",
    latitude: 19.1197,
    longitude: 72.8797,
    created_at: "2026-09-22T09:15:00Z",
    updated_at: "2026-09-22T09:15:00Z"
  },
  {
    id: 4,
    sequence_id: "PRJ-0004",
    name: "Greenwoods Gated Community",
    project_type: "Household / Domestic",
    client_id: 4,
    contact_ids: [9],
    status: "ACTIVE",
    description: "Domestic apartment cluster surveillance and visitor verification deployment.",
    address: "10th Main, Sector 4, HSR Layout",
    city: "Bengaluru",
    state: "Karnataka",
    latitude: 12.9121,
    longitude: 77.6446,
    created_at: "2026-10-14T05:00:00Z",
    updated_at: "2026-10-14T05:00:00Z"
  }
];

export const initialEmployers: EmployerCompany[] = [
  {
    id: 1,
    name: "Rapid Dispatch Services",
    code: "RDS",
    address: "77 Ring Road Industrial Area, New Delhi",
    contact_details: "dispatch@rapidsvc.com | 011-45678900",
    status: "ACTIVE",
    created_at: "2026-09-10T10:00:00Z"
  },
  {
    id: 2,
    name: "BlueCollar Staffing Solutions",
    code: "BCS",
    address: "Level 3, Business Gateway, Whitefield, Bengaluru",
    contact_details: "hr@bluecollarstaff.in | 080-23456789",
    status: "ACTIVE",
    created_at: "2026-09-12T10:00:00Z"
  },
  {
    id: 3,
    name: "XYZ Garments & Logistics",
    code: "XYZ-23233",
    address: "BTM 1st Stage, Bengaluru",
    contact_details: "contact@xyzgarments.com | 080-44556677",
    status: "ACTIVE",
    created_at: "2026-10-14T04:07:33Z"
  },
  {
    id: 4,
    name: "AFY Staffing Consortium",
    code: "AFY-01",
    address: "BTM 1st Stage Outer Ring Road, Bengaluru",
    contact_details: "support@afy.local | 8073532868",
    status: "ACTIVE",
    created_at: "2026-10-14T07:42:17Z"
  }
];

export const initialWorkers: Worker[] = [
  {
    id: 1,
    worker_id: "WRK-1001",
    name: "Amit Sharma",
    phone: "+91 91234 56780",
    email: "amit.sharma@example.com",
    address: "Flat 301, Shanti Nagar, Delhi",
    employer_company_id: 1,
    role_or_status: "Delivery Associate",
    aadhaar_number: "4589-1234-9871",
    bank_account_number: "50100456789123",
    bank_ifsc: "HDFC0001234",
    upi_id: "amit@okhdfcbank",
    created_at: "2026-09-15T10:00:00Z"
  },
  {
    id: 2,
    worker_id: "WRK-1002",
    name: "Suresh Babu",
    phone: "+91 91234 56781",
    email: "suresh.b@example.com",
    address: "Plot 14, Koramangala, Bengaluru",
    employer_company_id: 2,
    role_or_status: "Field Inspection Executive",
    aadhaar_number: "9812-4321-5544",
    bank_account_number: "91800123456789",
    bank_ifsc: "SBIN0004321",
    upi_id: "suresh@oksbi",
    created_at: "2026-09-15T11:00:00Z"
  },
  {
    id: 3,
    worker_id: "WRK-1003",
    name: "Kiran Deshmukh",
    phone: "+91 91234 56782",
    email: "kiran.d@example.com",
    address: "B-204, Viman Nagar, Pune",
    employer_company_id: 1,
    role_or_status: "Senior Field Agent",
    aadhaar_number: "3344-5566-7788",
    bank_account_number: "10293847561029",
    bank_ifsc: "ICIC0000987",
    upi_id: "kiran@icici",
    created_at: "2026-09-18T10:00:00Z"
  },
  {
    id: 4,
    worker_id: "WRK-1004",
    name: "Mubeen Ahmed",
    phone: "+91 94487 29283",
    email: "mubeen@example.com",
    address: "BTM 2nd stage, Bengaluru",
    employer_company_id: 3,
    role_or_status: "Active Field Worker",
    aadhaar_number: "7711-2233-4455",
    bank_account_number: "20194857201938",
    bank_ifsc: "PUNB0023400",
    upi_id: "mubeen@axl",
    created_at: "2026-10-14T04:09:03Z"
  }
];

export const initialDevices: Device[] = [
  {
    id: 1,
    asset_id: "CAM-2026-0001",
    qr_token: "d7f4b821-236b-4e67-9c92-3a5e8f49a112",
    device_type: "CAMERA",
    brand_and_model: "Sony Alpha 7 IV",
    imei_or_serial: "SN-SONY-77801",
    accessories: "Charger, Strap, 64GB SD Card, Lens 28-70mm",
    condition: "EXCELLENT",
    source_client_id: 1,
    initial_poc_id: 1,
    current_status: "ASSIGNED_WORKER",
    current_custodian_type: "WORKER",
    current_custodian_user_id: null,
    current_custodian_worker_id: 1,
    received_date: "2026-10-05T10:00:00Z",
    notes: "Intake in pristine condition, assigned for route surveillance.",
    created_at: "2026-10-05T10:00:00Z",
    updated_at: "2026-10-05T14:30:00Z"
  },
  {
    id: 2,
    asset_id: "CAM-2026-0002",
    qr_token: "3350a125-700f-443d-90b4-10e07cdd1e90",
    device_type: "CAMERA",
    brand_and_model: "Canon EOS R6",
    imei_or_serial: "SN-CANON-99022",
    accessories: "Charger, 2x Batteries, Bag",
    condition: "GOOD",
    source_client_id: 1,
    initial_poc_id: 1,
    current_status: "WITH_COLLECTOR",
    current_custodian_type: "USER",
    current_custodian_user_id: 3, // collector1
    current_custodian_worker_id: null,
    received_date: "2026-10-05T10:00:00Z",
    notes: "Minor scuff on body. In collector custody ready for deployment.",
    created_at: "2026-10-05T10:00:00Z",
    updated_at: "2026-10-05T10:00:00Z"
  },
  {
    id: 3,
    asset_id: "CAM-2026-0003",
    qr_token: "9a8b7c6d-5e4f-3a2b-1c0d-e9f8a7b6c5d4",
    device_type: "BODYCAM",
    brand_and_model: "Axon Body 3",
    imei_or_serial: "AXN-33491-X",
    accessories: "Dock Mount, Magnetic Clip",
    condition: "EXCELLENT",
    source_client_id: 1,
    initial_poc_id: 1,
    current_status: "WITH_COLLECTOR",
    current_custodian_type: "USER",
    current_custodian_user_id: 3, // collector1
    current_custodian_worker_id: null,
    received_date: "2026-10-05T10:00:00Z",
    notes: "Law enforcement spec body camera.",
    created_at: "2026-10-05T10:00:00Z",
    updated_at: "2026-10-05T10:00:00Z"
  },
  {
    id: 4,
    asset_id: "DEV-2026-0004",
    qr_token: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    device_type: "SMARTPHONE",
    brand_and_model: "Samsung Galaxy S22 Enterprise",
    imei_or_serial: "358901234567891",
    accessories: "Fast Charger, Rugged Protective Case",
    condition: "GOOD",
    source_client_id: 2,
    initial_poc_id: 2,
    current_status: "WITH_COLLECTOR",
    current_custodian_type: "USER",
    current_custodian_user_id: 2, // manager
    current_custodian_worker_id: null,
    received_date: "2026-10-08T11:00:00Z",
    notes: "Pre-configured with field tracking app.",
    created_at: "2026-10-08T11:00:00Z",
    updated_at: "2026-10-08T11:00:00Z"
  },
  {
    id: 5,
    asset_id: "DEV-2026-0005",
    qr_token: "f6e5d4c3-b2a1-0f9e-8d7c-6b5a4f3e2d1c",
    device_type: "SMARTPHONE",
    brand_and_model: "Samsung Galaxy S22 Enterprise",
    imei_or_serial: "358901234567892",
    accessories: "Fast Charger, Rugged Protective Case",
    condition: "EXCELLENT",
    source_client_id: 2,
    initial_poc_id: 2,
    current_status: "WITH_COLLECTOR",
    current_custodian_type: "USER",
    current_custodian_user_id: 2, // manager
    current_custodian_worker_id: null,
    received_date: "2026-10-08T11:00:00Z",
    notes: "Brand new sealed in box.",
    created_at: "2026-10-08T11:00:00Z",
    updated_at: "2026-10-08T11:00:00Z"
  },
  {
    id: 6,
    asset_id: "CAM-2026-0006",
    qr_token: "c4d3e2f1-0a9b-8c7d-6e5f-4a3b2c1d0e9f",
    device_type: "CAMERA",
    brand_and_model: "Nikon Z6 II",
    imei_or_serial: "SN-NIKON-44331",
    accessories: "Battery Charger, 35mm f/1.8 Lens",
    condition: "EXCELLENT",
    source_client_id: 1,
    initial_poc_id: 1,
    current_status: "AVAILABLE_STORAGE",
    current_custodian_type: "STORAGE",
    current_custodian_user_id: null,
    current_custodian_worker_id: null,
    received_date: "2026-10-04T09:00:00Z",
    notes: "In central warehouse ready for dispatch.",
    created_at: "2026-10-04T09:00:00Z",
    updated_at: "2026-10-04T09:00:00Z"
  },
  {
    id: 7,
    asset_id: "DEV-2026-0001",
    qr_token: "31af5219-3868-4a7a-91a6-fb9e113688aa",
    device_type: "SMARTPHONE",
    brand_and_model: "Apple iPhone 15 Pro",
    imei_or_serial: "1234509876",
    accessories: "20W USB-C Charger, Otterbox Rugged Case",
    condition: "GOOD",
    source_client_id: 4,
    initial_poc_id: 9,
    current_status: "WITH_COLLECTOR",
    current_custodian_type: "USER",
    current_custodian_user_id: 7, // Vikram Rao (Operations Lead)
    current_custodian_worker_id: null,
    received_date: "2026-10-14T07:48:29Z",
    notes: "Client test device.",
    created_at: "2026-10-14T07:48:29Z",
    updated_at: "2026-10-14T07:48:29Z"
  },
  {
    id: 8,
    asset_id: "CAM-2026-0007",
    qr_token: "778899aa-bbcc-ddee-ff00-112233445566",
    device_type: "CAMERA",
    brand_and_model: "GoPro HERO12 Black",
    imei_or_serial: "GP-HERO-12994",
    accessories: "Mount, 2x Enduro Batteries, Dual Charger",
    condition: "EXCELLENT",
    source_client_id: 1,
    initial_poc_id: 1,
    current_status: "AVAILABLE_STORAGE",
    current_custodian_type: "STORAGE",
    current_custodian_user_id: null,
    current_custodian_worker_id: null,
    received_date: "2026-10-10T14:00:00Z",
    notes: "Available stock in company storage.",
    created_at: "2026-10-10T14:00:00Z",
    updated_at: "2026-10-10T14:00:00Z"
  }
];

export const initialAssignments: Assignment[] = [
  {
    id: 1,
    device_id: 1,
    worker_id: 1,
    delivering_user_id: 3, // collector1
    assignment_time: "2026-10-05T14:30:00Z",
    condition: "EXCELLENT",
    accessories: "Charger, Strap, 64GB SD Card, Lens 28-70mm",
    acknowledgement: "Worker Amit Sharma verified equipment and serials on-site.",
    expected_return_date: "2026-11-05",
    status: "ACTIVE",
    notes: "Assigned for monthly delivery route surveillance.",
    latitude: 28.4595,
    longitude: 77.0266,
    location_address: "Cyber City DLF Phase 2, Gurugram"
  }
];

export const initialPickups: Pickup[] = [
  {
    id: 1,
    client_id: 1,
    actual_poc_id: 1,
    collecting_user_id: 3,
    scheduled_time: "2026-10-05T09:30:00Z",
    actual_time: "2026-10-05T10:00:00Z",
    location: "Apex Security Sector 24 Facility, Gurugram",
    latitude: 28.4982,
    longitude: 77.0891,
    location_address: "402 Cyber City, Sector 24, Gurugram, Haryana",
    status: "COMPLETED",
    notes: "Initial fleet collection of 3 units.",
    created_at: "2026-10-05T10:00:00Z",
    devices: [
      { device_id: 1, condition: "EXCELLENT", accessories: "Charger, Strap, 64GB SD Card, Lens 28-70mm" },
      { device_id: 2, condition: "GOOD", accessories: "Charger, 2x Batteries, Bag" },
      { device_id: 3, condition: "EXCELLENT", accessories: "Dock Mount, Magnetic Clip" }
    ]
  },
  {
    id: 2,
    client_id: 2,
    actual_poc_id: 2,
    collecting_user_id: 2,
    scheduled_time: "2026-10-08T10:30:00Z",
    actual_time: "2026-10-08T11:00:00Z",
    location: "Omni Express Logistics Hub, Andheri East, Mumbai",
    latitude: 19.1136,
    longitude: 72.8697,
    location_address: "Unit 12, Logistics Park, Andheri East, Mumbai",
    status: "COMPLETED",
    notes: "Intake of 2 enterprise tracking smartphones.",
    created_at: "2026-10-08T11:00:00Z",
    devices: [
      { device_id: 4, condition: "GOOD", accessories: "Fast Charger, Rugged Protective Case" },
      { device_id: 5, condition: "EXCELLENT", accessories: "Fast Charger, Rugged Protective Case" }
    ]
  }
];

export const initialTransfers: Transfer[] = [];
export const initialReturns: DeviceReturn[] = [];

export const initialMovements: DeviceMovement[] = [
  {
    id: 1,
    device_id: 1,
    from_custodian_type: "CLIENT",
    from_custodian_name: "Client: Apex Security Solutions",
    to_custodian_type: "USER",
    to_custodian_name: "Staff: Rahul Joshi",
    from_status: "Expected",
    to_status: "With Collector / In Transit",
    actor_id: 3,
    actor_name: "Rahul Joshi",
    timestamp: "2026-10-05T10:00:00Z",
    related_transaction_type: "INTAKE",
    related_transaction_id: "1",
    notes: "Collected from Apex Security Solutions (Pickup #1)"
  },
  {
    id: 2,
    device_id: 1,
    from_custodian_type: "USER",
    from_custodian_name: "Staff: Rahul Joshi",
    to_custodian_type: "WORKER",
    to_custodian_name: "Worker: Amit Sharma (WRK-1001)",
    from_status: "With Collector / In Transit",
    to_status: "Assigned to Worker / In Use",
    actor_id: 3,
    actor_name: "Rahul Joshi",
    timestamp: "2026-10-05T14:30:00Z",
    related_transaction_type: "ASSIGNMENT",
    related_transaction_id: "1",
    notes: "Handed over by Rahul Joshi. Ack: Worker Amit Sharma verified equipment and serials on-site."
  },
  {
    id: 3,
    device_id: 2,
    from_custodian_type: "CLIENT",
    from_custodian_name: "Client: Apex Security Solutions",
    to_custodian_type: "USER",
    to_custodian_name: "Staff: Rahul Joshi",
    from_status: "Expected",
    to_status: "With Collector / In Transit",
    actor_id: 3,
    actor_name: "Rahul Joshi",
    timestamp: "2026-10-05T10:00:00Z",
    related_transaction_type: "INTAKE",
    related_transaction_id: "1",
    notes: "Collected from Apex Security Solutions"
  },
  {
    id: 4,
    device_id: 6,
    from_custodian_type: "USER",
    from_custodian_name: "Staff: Deepa Nair",
    to_custodian_type: "STORAGE",
    to_custodian_name: "Company Storage",
    from_status: "Awaiting Inspection",
    to_status: "Available in Company Storage",
    actor_id: 2,
    actor_name: "Deepa Nair",
    timestamp: "2026-10-04T09:00:00Z",
    related_transaction_type: "INSPECTION",
    related_transaction_id: "0",
    notes: "Inspection Result: Passed. Ready for storage."
  }
];

export const initialActivityLogs: DeviceActivityLog[] = [
  {
    id: 1,
    device_id: 1,
    action: "COLLECTED_FROM_CLIENT",
    timestamp: "2026-10-05T10:00:00Z",
    actor_id: 3,
    actor_name: "Rahul Joshi",
    actor_role: "Postman / Field Collector",
    details: "Intake batch from client Apex Security Solutions (POC: Vikram Sethi). Condition: EXCELLENT.",
    latitude: 28.4982,
    longitude: 77.0891,
    location_address: "402 Cyber City, Sector 24, Gurugram, Haryana",
    related_transaction_type: "PICKUP",
    related_transaction_id: "1"
  },
  {
    id: 2,
    device_id: 1,
    action: "ASSIGNED_TO_WORKER",
    timestamp: "2026-10-05T14:30:00Z",
    actor_id: 3,
    actor_name: "Rahul Joshi",
    actor_role: "Postman / Field Collector",
    details: "Assigned to Amit Sharma (WRK-1001) from Rapid Dispatch Services. Ack: Verified on-site.",
    latitude: 28.4595,
    longitude: 77.0266,
    location_address: "Cyber City DLF Phase 2, Gurugram",
    related_transaction_type: "ASSIGNMENT",
    related_transaction_id: "1"
  }
];

export const initialTasks: Task[] = [
  {
    id: 1,
    task_type: "PICKUP",
    title: "Collect 5 Bodycams from Apex Sector 24",
    assigned_user_id: 3,
    client_id: 1,
    scheduled_time: "2026-10-15T14:00:00Z",
    status: "PENDING",
    priority: "HIGH",
    created_at: "2026-10-14T08:00:00Z"
  },
  {
    id: 2,
    task_type: "INSPECTION",
    title: "Inspect returned Samsung S22 at central hub",
    assigned_user_id: 2,
    scheduled_time: "2026-10-15T11:00:00Z",
    status: "PENDING",
    priority: "MEDIUM",
    created_at: "2026-10-14T08:30:00Z"
  },
  {
    id: 3,
    task_type: "DELIVERY",
    title: "Deliver 2 Canon EOS R6 to Rapid Dispatch whitefield team",
    assigned_user_id: 7,
    worker_id: 2,
    scheduled_time: "2026-10-16T10:00:00Z",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    created_at: "2026-10-14T09:00:00Z"
  }
];

export const initialIncidents: Incident[] = [
  {
    id: 1,
    device_id: 2,
    incident_type: "DAMAGE",
    reporter_id: 3,
    timestamp: "2026-10-11T16:20:00Z",
    notes: "Minor scratches on body lens mount detected during routine weekly audit. Functionality intact.",
    status: "REPORTED"
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 1,
    actor_id: 1,
    actor_name: "Aarav Mehta",
    action: "SYSTEM_INITIALIZED",
    record_type: "System",
    record_id: "0",
    timestamp: "2026-10-01T09:00:00Z",
    safe_metadata: "System initialized with baseline configuration.",
    ip_address: "127.0.0.1"
  },
  {
    id: 2,
    actor_id: 3,
    actor_name: "Rahul Joshi",
    action: "INTAKE_DEVICES",
    record_type: "Pickup",
    record_id: "1",
    timestamp: "2026-10-05T10:00:00Z",
    safe_metadata: "Collected 3 devices from Apex Security Solutions",
    ip_address: "192.168.1.45"
  },
  {
    id: 3,
    actor_id: 3,
    actor_name: "Rahul Joshi",
    action: "ASSIGN_DEVICE",
    record_type: "Device",
    record_id: "CAM-2026-0001",
    timestamp: "2026-10-05T14:30:00Z",
    safe_metadata: "Assigned to worker Amit Sharma (WRK-1001)",
    ip_address: "192.168.1.45"
  }
];

export const initialObjectDefinitions: ObjectDefinition[] = [
  {
    id: 1,
    name: "Client Company",
    api_name: "client",
    description: "Organizations that provide camera assets and request inventory pickups.",
    icon: "fa-building",
    is_system: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 2,
    name: "Client Contact",
    api_name: "client_contact",
    description: "Point of contact (POC) representatives authorized to hand over devices at client sites.",
    icon: "fa-address-book",
    is_system: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 3,
    name: "Worker",
    api_name: "worker",
    description: "Field personnel, security officers, and delivery staff assigned custody of cameras.",
    icon: "fa-id-card-clip",
    is_system: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 4,
    name: "Employer Company",
    api_name: "employer_company",
    description: "Staffing agencies, security firms, and contract employers that deploy field workers.",
    icon: "fa-briefcase",
    is_system: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 5,
    name: "Postman / Field Officer",
    api_name: "postman",
    description: "Internal AFY staff members handling pickups, custody handovers, and returns.",
    icon: "fa-person-walking-luggage",
    is_system: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 6,
    name: "Mass Camera Assignment",
    api_name: "mass_camera_assignment",
    description: "Batch assignment operations allocating multiple cameras to workers simultaneously.",
    icon: "fa-boxes-packing",
    is_system: true,
    is_active: true,
    created_at: "2026-10-01T09:00:00Z"
  },
  {
    id: 7,
    name: "Project",
    api_name: "project",
    description: "Configurable client deployment projects for Household / Domestic and Commercial customer installations.",
    icon: "fa-folder-tree",
    is_system: true,
    is_active: true,
    created_at: "2026-10-14T09:00:00Z"
  }
];

export const initialFieldDefinitions: FieldDefinition[] = [
  // Client Company fields
  { id: 1, object_key: "client", api_name: "name", label: "Company Name", field_type: "text", is_required: true, display_order: 10, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 2, object_key: "client", api_name: "code", label: "Client Code", field_type: "text", is_required: true, display_order: 20, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false, help_text: "Unique client code (e.g. CLI-001)" },
  { id: 3, object_key: "client", api_name: "city", label: "City", field_type: "text", is_required: true, display_order: 30, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 4, object_key: "client", api_name: "state", label: "State", field_type: "text", is_required: true, display_order: 40, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },
  { id: 5, object_key: "client", api_name: "pin_code", label: "PIN Code", field_type: "text", is_required: true, display_order: 50, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  { id: 6, object_key: "client", api_name: "address", label: "Headquarters Address", field_type: "textarea", is_required: true, display_order: 60, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  {
    id: 7, object_key: "client", api_name: "status", label: "Account Status", field_type: "select", is_required: true, display_order: 70, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false,
    choices: [
      { id: 1, value: "ACTIVE", label: "Active Partner", display_order: 10, is_active: true },
      { id: 2, value: "INACTIVE", label: "Inactive / Paused", display_order: 20, is_active: true }
    ]
  },

  // Client Contact fields
  { id: 8, object_key: "client_contact", api_name: "client", label: "Client Company", field_type: "lookup", lookup_object_key: "client", is_required: true, display_order: 10, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },
  { id: 9, object_key: "client_contact", api_name: "name", label: "Contact Name", field_type: "text", is_required: true, display_order: 20, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 10, object_key: "client_contact", api_name: "designation", label: "Designation / Title", field_type: "text", is_required: false, display_order: 30, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false, placeholder: "e.g. Warehouse Lead, Operations Head" },
  { id: 11, object_key: "client_contact", api_name: "phone", label: "Mobile Number", field_type: "phone", is_required: true, display_order: 40, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false, help_text: "10-digit Indian mobile number" },
  { id: 12, object_key: "client_contact", api_name: "email", label: "Email Address", field_type: "email", is_required: false, display_order: 50, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 13, object_key: "client_contact", api_name: "is_active", label: "Active Status", field_type: "boolean", is_required: false, display_order: 60, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false, default_value: "true" },

  // Worker fields
  { id: 14, object_key: "worker", api_name: "worker_id", label: "Worker ID / Badge", field_type: "text", is_required: true, display_order: 10, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false, help_text: "Badge or Staffing ID (e.g. WRK-1001)" },
  { id: 15, object_key: "worker", api_name: "name", label: "Full Name", field_type: "text", is_required: true, display_order: 20, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 16, object_key: "worker", api_name: "phone", label: "Primary Mobile", field_type: "phone", is_required: true, display_order: 30, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 17, object_key: "worker", api_name: "email", label: "Email Address", field_type: "email", is_required: false, display_order: 40, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  { id: 18, object_key: "worker", api_name: "employer_company", label: "Employer / Staffing Agency", field_type: "lookup", lookup_object_key: "employer_company", is_required: true, display_order: 50, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },
  { id: 19, object_key: "worker", api_name: "role_or_status", label: "Operational Designation", field_type: "text", is_required: false, display_order: 60, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false, placeholder: "e.g. Security Marshal, Guard" },
  { id: 20, object_key: "worker", api_name: "address", label: "Residential Address", field_type: "textarea", is_required: false, display_order: 70, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  { id: 21, object_key: "worker", api_name: "aadhaar_number", label: "Aadhaar ID (Masked)", field_type: "text", is_required: false, display_order: 80, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: true, help_text: "Masked for non-administrative viewers" },
  { id: 22, object_key: "worker", api_name: "bank_account_number", label: "Bank Account (Masked)", field_type: "text", is_required: false, display_order: 90, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: true, help_text: "Masked for non-administrative viewers" },

  // Employer Company fields
  { id: 23, object_key: "employer_company", api_name: "name", label: "Agency / Company Name", field_type: "text", is_required: true, display_order: 10, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 24, object_key: "employer_company", api_name: "code", label: "Employer Code", field_type: "text", is_required: true, display_order: 20, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false, help_text: "Unique agency code (e.g. EMP-001)" },
  { id: 25, object_key: "employer_company", api_name: "address", label: "Office Address", field_type: "textarea", is_required: true, display_order: 30, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  { id: 26, object_key: "employer_company", api_name: "contact_details", label: "POC & Emergency Contacts", field_type: "textarea", is_required: false, display_order: 40, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  {
    id: 27, object_key: "employer_company", api_name: "status", label: "Partnership Status", field_type: "select", is_required: true, display_order: 50, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false,
    choices: [
      { id: 3, value: "ACTIVE", label: "Active Vendor", display_order: 10, is_active: true },
      { id: 4, value: "INACTIVE", label: "Terminated / Inactive", display_order: 20, is_active: true }
    ]
  },

  // Postman / Field Officer fields
  { id: 28, object_key: "postman", api_name: "username", label: "Username", field_type: "text", is_required: true, display_order: 10, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 29, object_key: "postman", api_name: "first_name", label: "First Name", field_type: "text", is_required: true, display_order: 20, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 30, object_key: "postman", api_name: "last_name", label: "Last Name", field_type: "text", is_required: false, display_order: 30, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 31, object_key: "postman", api_name: "email", label: "Work Email", field_type: "email", is_required: true, display_order: 40, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 32, object_key: "postman", api_name: "phone", label: "Mobile Number", field_type: "phone", is_required: true, display_order: 50, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 33, object_key: "postman", api_name: "work_location", label: "Base Hub / Location", field_type: "text", is_required: false, display_order: 60, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },

  // Mass Camera Assignment fields
  { id: 34, object_key: "mass_camera_assignment", api_name: "batch_id", label: "Batch ID", field_type: "readonly", is_required: false, display_order: 10, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 35, object_key: "mass_camera_assignment", api_name: "target_worker", label: "Target Worker", field_type: "lookup", lookup_object_key: "worker", is_required: true, display_order: 20, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },
  {
    id: 36, object_key: "mass_camera_assignment", api_name: "assignment_purpose", label: "Deployment Purpose", field_type: "select", is_required: true, display_order: 30, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false,
    choices: [
      { id: 5, value: "FIELD_OPS", label: "Standard Field Operations", display_order: 10, is_active: true },
      { id: 6, value: "SPECIAL_EVENT", label: "Special Event / Crowd Control", display_order: 20, is_active: true },
      { id: 7, value: "AUDIT_INSPECTION", label: "Audit & Facility Inspection", display_order: 30, is_active: true },
      { id: 8, value: "SURGE_STAFFING", label: "Surge / Seasonal Staffing Deployment", display_order: 40, is_active: true }
    ]
  },
  { id: 37, object_key: "mass_camera_assignment", api_name: "notes", label: "Batch Deployment Notes", field_type: "textarea", is_required: false, display_order: 40, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },

  // Project fields (Configurable Object)
  { id: 38, object_key: "project", api_name: "name", label: "Project Name", field_type: "text", is_required: true, display_order: 10, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  {
    id: 39, object_key: "project", api_name: "project_type", label: "Project Type", field_type: "select", is_required: true, display_order: 20, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false,
    choices: [
      { id: 9, value: "Household / Domestic", label: "Household / Domestic", display_order: 10, is_active: true },
      { id: 10, value: "Commercial", label: "Commercial", display_order: 20, is_active: true }
    ]
  },
  { id: 40, object_key: "project", api_name: "client", label: "Client Company", field_type: "lookup", lookup_object_key: "client", is_required: true, display_order: 30, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },
  { id: 41, object_key: "project", api_name: "site_address", label: "Site Address", field_type: "textarea", is_required: false, display_order: 40, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false },
  { id: 42, object_key: "project", api_name: "city", label: "City", field_type: "text", is_required: false, display_order: 50, is_active: true, is_searchable: true, show_in_list: true, is_sensitive: false },
  { id: 43, object_key: "project", api_name: "state", label: "State", field_type: "text", is_required: false, display_order: 60, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false },
  { id: 44, object_key: "project", api_name: "security_clearance_required", label: "Security Clearance Required", field_type: "boolean", is_required: false, display_order: 70, is_active: true, is_searchable: false, show_in_list: false, is_sensitive: false, default_value: "false" },
  { id: 45, object_key: "project", api_name: "estimated_camera_count", label: "Target Camera Count", field_type: "number", is_required: false, display_order: 80, is_active: true, is_searchable: false, show_in_list: true, is_sensitive: false, min_value: 1, max_value: 500 }
];

export const initialMassBatches: MassCameraAssignmentBatch[] = [];

export const initialAnnouncements: Announcement[] = [
  {
    id: 1,
    title: "Quarterly Asset Audit & Firmware Update Protocol",
    message: "All field officers and logistics managers must ensure cameras returned this week undergo complete optical inspection and firmware verification before storage re-shelving.",
    author_id: 1,
    author_name: "Aarav Mehta",
    author_role: "ADMIN",
    recipient_scope: "ALL",
    is_pinned: true,
    published_at: "2026-10-14T08:00:00Z",
    acknowledged_by_user_ids: [1, 2]
  },
  {
    id: 2,
    title: "New Client Project Deployment: Cyber City Grid",
    message: "Commercial project PRJ-0001 is now active. Pre-configured Axon and Sony devices can be dispatched to assigned site workers.",
    author_id: 2,
    author_name: "Deepa Nair",
    author_role: "MANAGEMENT",
    recipient_scope: "ROLE",
    target_role: "POSTMAN",
    is_pinned: false,
    published_at: "2026-10-14T09:30:00Z",
    acknowledged_by_user_ids: []
  }
];

export const initialNotifications: AppNotification[] = [
  {
    id: 1,
    user_id: 1, // Admin
    title: "New User Registration Requires Approval",
    message: "A new staff member registered and is currently pending account approval.",
    category: "APPROVAL",
    is_read: false,
    related_record_type: "user",
    related_record_id: 7,
    action_view: "users",
    created_at: "2026-10-14T07:45:10Z"
  },
  {
    id: 2,
    user_id: 3, // collector1
    title: "High Priority Task Assigned",
    message: "You have been assigned task: Collect 5 Bodycams from Apex Sector 24.",
    category: "TASK",
    is_read: false,
    related_record_type: "task",
    related_record_id: 1,
    action_view: "tasks",
    created_at: "2026-10-14T08:00:00Z"
  },
  {
    id: 3,
    user_id: 2, // manager
    title: "Damage Incident Reported",
    message: "Scratches on lens mount reported for device CAM-2026-0002. Inspection required.",
    category: "INVENTORY",
    is_read: false,
    related_record_type: "device",
    related_record_id: 2,
    action_view: "incidents",
    created_at: "2026-10-11T16:20:00Z"
  },
  {
    id: 4,
    user_id: 7, // Vikram Rao
    title: "Welcome to CamGuard Inventory Portal",
    message: "Your profile is active. You can manage assigned equipment and perform field operations.",
    category: "SYSTEM",
    is_read: true,
    action_view: "my-inventory",
    created_at: "2026-10-14T07:50:00Z"
  }
];
