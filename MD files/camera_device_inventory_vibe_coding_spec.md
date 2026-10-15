# Camera & Device Inventory Portal — Vibe-Coding Spec

## 1. Goal
Build a responsive web app for a device-mediation business. The business collects cameras/camera phones from client companies, tracks custody, assigns devices to workers, and manages returns. Every physical device must have a unique record and QR code.

## 2. Suggested Stack
-python django 
- QR generation/scanning library compatible with mobile browsers
- Use environment variables for secrets; never hardcode credentials.

If the coding platform already has a stack, keep its conventions while preserving the requirements below.

## 3. Roles and Access
### Admin
- One full-access Admin role.
- Manage users, roles, clients, contacts, employer companies, workers, collectors, devices, tasks, reports, and settings.
- View company-wide inventory, all custody records, and audit history.
- Correct exceptional records through audited adjustments.

### Management User
- Perform permitted operations, including collecting devices, receiving transfers, assigning devices, and processing returns.
- View their own current custody inventory and relevant operational records.
- No unrestricted admin or sensitive-data access.

### Postman / Field Collector
- Mobile-first interface.
- View own tasks and own current custody inventory.
- Collect devices, scan QR codes, hand devices to workers, transfer devices, process returns, and report issues.
- Cannot see other users' inventories or sensitive worker financial/identity details.

Enforce permissions in server/database policies, not only by hiding UI elements. Create individual login accounts; a profile does not automatically imply login access.

## 4. Core Data Models
Use relational tables, foreign keys, validation, timestamps, and indexes.

- `users`: auth user ID, name, role, active status, phone, email.
- `client_companies`: name, code, address, city/state/PIN, status.
- `client_contacts`: client ID, name, designation, phone, email, active status.
- `employer_companies`: name, code, address, contact details, status.
- `workers`: worker ID, name, phone, email, address, employer company, role/status, optional sensitive payment/identity fields.
- `devices`: internal asset ID, QR token, type, brand/model, IMEI/serial, accessories, photos, condition, source client, current status, current custodian type/ID, received date.
- `pickups`: client, actual POC, collecting user, scheduled/actual times, location, status, notes.
- `pickup_devices`: pickup ID, device ID, condition/accessories at collection.
- `assignments`: device, worker, delivering user, assignment time, condition, accessories, acknowledgement, expected return date, closed time/status.
- `transfers`: device, sender, receiver, condition, initiated/accepted times, status, acknowledgement.
- `returns`: device, worker, receiving user/location, return time, condition, inspection result, outcome.
- `device_movements`: append-only history of each completed custody/status movement, source, destination, actor, timestamp, related transaction, notes.
- `tasks`: task type, assigned user, client/worker, scheduled time, status, priority, outcome.
- `incidents`: device, type (damage/loss/discrepancy), reporter, time, notes, evidence.
- `audit_logs`: actor, action, record type/ID, timestamp, safe metadata.

Use one device record per physical device. Do not create duplicate device records when custody changes. Use transactions/atomic server actions for inventory movements.

## 5. Device Status and Custody
Use controlled transitions, such as:
- Expected
- With Collector / In Transit
- Available in Company Storage
- Assigned to Worker / In Use
- Return Requested
- Return In Transit
- Awaiting Inspection
- Under Repair
- Damaged
- Lost
- Returned to Client
- Retired

Keep **status** separate from **custodian**. Each device must have exactly one current custodian/location at a time. A device held by a postman or management user is in that person's custody inventory. A device assigned to a worker is in that worker's custody. The company master inventory shows every device under the business's responsibility, regardless of custodian.

Do not count assigned, lost, under-repair, retired, or client-returned devices as available stock. Only make a returned device available after required handover and inspection.

## 6. QR Code Workflow
- On successful device creation during intake, generate a unique internal asset ID and QR code.
- QR code should encode only a random/opaque identifier or secure app URL—not Aadhaar, bank, UPI, or other personal data.
- Print/download a label with QR and asset ID.
- Scan QR using a mobile browser camera to open the authenticated device record.
- Show actions allowed for the logged-in role.
- Support manual asset-ID search if scanning fails.
- Validate duplicate IMEI/serial where present; allow authorized exceptions for devices without them.
- Scanning only opens the record. It must never change custody automatically.

## 7. Main Workflows
### Collect from Client
1. Select client and actual POC.
2. Select collecting management user/postman.
3. Add each physical device individually; capture identifiers, condition, accessories, and optional photo.
4. Confirm pickup with date/time and notes.
5. Generate QR/asset ID for each device.
6. Record movement from client to collecting user.
7. Update user's custody inventory and company master inventory atomically.

A pickup may contain multiple devices, but every device needs its own record.

### Assign to Worker
1. Scan QR or search asset ID.
2. Verify device is eligible and in the acting user's custody (or user has explicit authorization).
3. Select worker and display employer company.
4. Record condition, accessories, delivery time, and acknowledgement.
5. Confirm handover.
6. Atomically close/record assignment, change custodian/status, and append movement history.
7. Remove device from collector's custody list; show it under the worker and retain it in company master inventory.

Block double assignments and concurrent handovers.

### Transfer Between Operational Users
- Sender initiates transfer; receiver must accept it.
- Record both users, device, condition, timestamps, and acknowledgement.
- Custody remains with sender until acceptance; then update atomically.
- Support pending, accepted, rejected, and cancelled states.

### Return and Inspection
- Record returning worker, receiving user/location, time, condition, accessories, and evidence.
- Keep device in return/inspection state until checks are complete.
- Then return it to storage, transfer it to a client, send it for repair, or record damage/loss.

## 8. Required Screens
- Login
- Dashboard
- My Inventory
- Company Master Inventory (Admin only)
- Clients and POCs
- Devices / device detail / movement timeline
- Collect from Client
- QR Scanner
- Assign to Worker
- Transfer Device
- Workers and employer companies
- Postmen / management users
- Returns and inspections
- Tasks
- Incidents
- Reports and CSV export
- User/role management and audit logs (Admin only)

Use responsive tables on desktop and cards/actions on mobile. Include loading, empty, validation, error, and success states. Add search, filters, pagination, and confirmation dialogs.

## 9. Dashboard and Reports
Dashboard metrics: total devices, available stock, with collectors, assigned to workers, pending pickups/deliveries, overdue returns, awaiting inspection, damaged/lost devices, active clients/workers/users.

Reports:
- Company master inventory by status and custodian
- My inventory by user
- Client-wise intake and POC history
- Worker-wise current and past assignments
- Collector-wise pickups/deliveries
- Pending transfers and returns
- Damaged/lost devices
- Complete device movement ledger

Totals must be calculated from database records, not hardcoded.

## 10. Security and Privacy
- Use server-side authorization and database Row Level Security.
- Restrict storage objects and uploaded evidence.
- Mask Aadhaar and bank details by default; restrict access to explicitly authorized roles and log access.
- Collect sensitive identity/financial data only if necessary and permitted. Never put it in QR codes, logs, or default exports.
- Validate all inputs server-side.
- Prevent unauthorized record access by changing URL/IDs.
- Keep completed movement history append-only; corrections require a reason and an audit entry.
- Use private file storage and short-lived links where supported.

## 11. Acceptance Tests
1. A collector receives three devices: all three appear in their My Inventory and in the Admin's company master inventory.
2. A management user receives two more: their My Inventory shows two and the company master shows five unique devices.
3. Assigning one device to a worker removes it from the collector's custody list, adds it to the worker's current assignments, and keeps it in the company master.
4. Available-stock totals exclude devices assigned to workers or otherwise unavailable.
5. A second user cannot assign a device already assigned or not in their custody.
6. A transfer does not change custody until the receiver accepts it.
7. A return does not become available until required inspection is complete.
8. Every completed movement appears in chronological history and cannot be silently deleted.
9. Postmen cannot view other users' inventories or restricted personal data through direct API/database requests.
10. QR scanning works on mobile; manual asset-ID lookup is available as fallback.
11. Dashboard totals match database queries.
12. Failed transactions leave custody, status, assignment, and movement history consistent.

## 12. Vibe-Coding Build Order
Build in small, verifiable phases. Do not generate the entire application in one step.

1. Set up project, database schema, migrations, authentication, and roles.
2. Implement client companies, POCs, employer companies, workers, and operational users.
3. Implement device intake, asset IDs, QR labels, and device detail pages.
4. Implement custody ledger and My Inventory / company master inventory.
5. Implement QR scanning and worker assignment.
6. Implement transfers, returns, inspections, and incidents.
7. Implement tasks, dashboards, reports, and exports.
8. Add RLS/security tests, workflow tests, responsive polish, and deployment setup.

At each phase: run the app, test the complete workflow, fix errors, and only then continue. Use real database persistence; do not leave fake buttons, placeholder actions, or frontend-only inventory updates.
