# CamGuard — Camera & Device Custody Inventory Portal (v1.2)

A comprehensive, enterprise-grade web application built for device-mediation businesses. The platform manages the entire lifecycle of physical cameras, camera phones, and bodycams collected from corporate clients, tracks custody across operational field staff, assigns equipment to on-ground workers, enforces peer transfers, processes returns through technical inspections, and generates verifiable QR tokens.

---

## 🚀 What's New in v1.2

### 1. Robust Device Export (CSV & Excel)
- **Multi-Format Export**: Full export support for both CSV and native Excel (`.xls`) formats with UTF-8 BOM encoding for seamless character handling in Microsoft Excel.
- **Comprehensive Fields**: Exports Asset ID, sequence ID, brand & model, device type, serial/IMEI, source client, linked project, current status, custody location, custodian name, condition, last verification time, and timestamps.
- **Filter-Aware & Selection-Aware**: Export either the entire filtered dataset or selectively export only checked devices.
- **Permission & Null Safety**: Clear user feedback banners on export success or empty states.

### 2. Multi-Device QR Selection & A4 Label Printing
- **Batch Device Selection**: Select individual devices, select all filtered records, and retain selection state across filters.
- **Accurate Counter**: Live batch count display with the ability to review and remove individual devices from the print batch.
- **A4 Sheet Grid & Thermal Formats**: Clean A4 sticker sheet layout (2x4 grid) with printable margins, device sequence IDs, model names, and scan targets, plus thermal roll (3x2") mode via standard browser print.
- **Zero Custody Side Effects**: Printing labels previews and prints without modifying device custody, assignment, or movement records.

### 3. Universal Location Autocomplete & Geocoding
- **Reusable Component**: Standardized `LocationPicker` deployed across all address-bearing forms: Client Intake, Worker Assignment, Peer Transfers, Returns, Client Organizations, and Project Setup.
- **Photon / OpenStreetMap Geocoding**: Real-time live address autocomplete with automatic fallback to an instant offline directory of major business parks, commercial hubs, and residential complexes.
- **Structured Geodata**: Automatically resolves and stores address, city, state, pin code, latitude, and longitude.
- **Manual Input & Optional GPS**: Users can freely type manual addresses without requiring GPS hardware permissions.

### 4. Per-User Notification Center & Chatter Stream
- **Salesforce Chatter-Inspired Architecture**: Real-time notification bell with dynamic unread badge in top navbar.
- **Personal Alerts & Task Notifications**: Immediate notifications when tasks are assigned, devices are handed over, peer transfers are requested, approvals are updated, or incidents are logged.
- **Admin Broadcast Announcements**: Admins can broadcast announcements to all users, specific roles (Management, Postmen), or selected individual staff members, with pinning and user acknowledgment tracking.
- **Rich Interaction**: Category filters (`TASK`, `INVENTORY`, `TRANSFER`, `APPROVAL`, `ANNOUNCEMENT`), mark as read, mark all as read, and direct deep-linking to relevant workflow screens.

### 5. Client Organizations & Configurable Projects
- **Client Offices**: Track multiple offices/locations per client (Headquarters, Regional Office, Branch, Site Office, Logistics Depot) with contact person, phone, and geocoded addresses.
- **Configurable Projects**: First-class `Project` object with strictly enforced project types:
  - `Household / Domestic`
  - `Commercial`
- **Dynamic Field Builder**: Custom project fields configurable in Setup Studio (text, number, date, checkbox, dropdown, relationship).
- **Client-Prelinked Projects**: Dedicated Projects tab on Client details for rapid project creation pre-associated with the client company.
- **Project-Specific Contacts**: Client contacts/POCs can be associated with one or multiple projects of the same client.
- **Sequential IDs**: Unique 4-digit sequential identifiers across all entities (`PRJ-0001`, `CLT-0001`, `CON-0001`, `CAM-0001`, `USR-0001`, `OFF-0001`).

---

## 🌟 Core System Features

### 1. Controlled Status vs Custodian Separation
- **Custody Location**: Each physical device has exactly one current custodian at any time (`User / Collector`, `Worker`, `Company Storage`, or `Client`).
- **Controlled Status Transitions**: `Expected` &rarr; `With Collector / In Transit` &rarr; `Assigned to Worker / In Use` &rarr; `Return Requested` &rarr; `Awaiting Inspection` &rarr; `Available in Company Storage` / `Under Repair` / `Damaged` / `Lost` / `Returned to Client` / `Retired`.
- **Available Stock Rule**: Assigned, lost, quarantined, under-repair, or awaiting-inspection devices are excluded from available stock. Only devices with status `Available in Company Storage` count as available stock.

### 2. QR Code Engine & Mobile Camera Scanner
- **Deterministic QR Generation**: Generates unique internal Asset IDs (e.g., `CAM-0001`) and cryptographically opaque UUID QR tokens.
- **Mobile Camera Scanner**: HTML5 QR Code video scanner for real-time mobile camera scanning with seamless manual Asset ID / IMEI search fallback.
- **Scanning Rule**: Scanning only opens the authenticated record; it **never** alters custody automatically.

### 3. Core Operational Workflows
- **Collect from Client (Intake)**: Multi-device batch intake capturing brand/model, IMEI/serial, condition, accessories, and notes.
- **Assign to Worker**: Validates custodian authority, blocks double assignments, records accessories & worker acknowledgement.
- **Operational Transfers**: Sender initiates handover; custody legally remains with sender until receiver confirms acceptance.
- **Returns & Inspection Queue**: When workers return devices, they enter `Awaiting Inspection`. Only after technician inspection does the device enter storage, repair, or damage status.
- **Damage & Incident Tracking**: Loss and damage logging with photo evidence uploads and auto-quarantine.
- **Audited Admin Adjustments**: Admin users can rectify discrepancies with mandatory justifications and permanent audit logging.

### 4. Privacy & Role-Based Access Control
- **Three Distinct User Roles**:
  - `Admin`: Full access, company master inventory, user management, audited adjustments, audit logs, and object setup studio.
  - `Management User`: Operations, intake, inspections, worker assignments, reports, and own inventory.
  - `Postman / Field Collector`: Mobile-first view, restricted to their own inventory and assigned field tasks.
- **Sensitive Data Masking**: Worker Aadhaar numbers and bank accounts are masked by default (`XXXX-XXXX-1234`). Only Admins can reveal unmasked data with audit logging.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend / API**: Python 3.12, Django 6.1, Django REST Framework, Firebase Admin SDK
- **Geocoding & Location**: OpenStreetMap / Photon live geocoder with fallback directory
- **QR Engine**: QR generation and HTML5 camera video decoding

---

## 👥 Demo Login Credentials

The application includes an instant **Quick Switch Demo Role** in the navigation header:

| Role | Username | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full enterprise control, master inventory, audit logs, adjustments |
| **Management** | `manager` | `manager123` | Operations, intake, inspections, reports, own inventory |
| **Field Collector 1** | `collector1` | `collector123` | Mobile field tasks, QR scanning, own custody, worker assignments |
| **Field Collector 2** | `collector2` | `collector123` | Secondary field collector for testing peer transfers |
