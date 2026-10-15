# Dynamic Object & Field Builder — Development Specification

## 1. Objective
Extend the existing Django Camera Inventory Management System with a Salesforce-style, metadata-driven form builder. Admins can create and configure fields for business objects in the UI without changing application code or database schema for every new field.

Preserve existing authentication, roles, device inventory, QR workflows, assignments, returns, and movement history.

## 2. Roles
- **Admin:** create/edit/deactivate object definitions and fields; configure required fields, choices, validation, and display order.
- **Management Staff:** create and update records using configured forms, subject to permissions.
- **Postman / Field Officer (FO):** use only operational forms and fields permitted for their role.
- Enforce permissions on the backend, not just in the UI.

## 3. Initial Business Objects
Create configurable object definitions for:
1. Client Contact
2. Client
3. Postman / Field Officer
4. Worker
5. Employer Company
6. Mass Camera Assignment

These should be configurable objects with fields and relationships. Keep core inventory entities such as Device, Device Movement, Pickup, Assignment, and Return as reliable structured records; do not turn essential custody logic into arbitrary text fields.

## 4. Admin Field Builder
Provide an Admin page with:
- Object list and object detail.
- Create/edit/deactivate object.
- Add, edit, reorder, and deactivate fields.
- Configure field label, internal key, type, required/optional, help text, placeholder, default value, visibility, and validation.
- Configure dropdown/radio options.
- Configure whether a field is searchable and whether it appears in list views.
- Preview the form before publishing.
- Publish changes without a code deployment.
- Prevent changing an existing field's internal key in a way that breaks stored data.
- Warn before deactivating fields that already contain data.

### Supported field types
- Short text
- Long text / textarea
- Number
- Email
- Phone (India: 10-digit mobile validation where appropriate)
- Date
- Date and time
- Checkbox / Boolean
- Picklist / dropdown
- Radio buttons
- Multi-select picklist (optional)
- File or image upload (optional)
- Relationship / lookup to another object
- Read-only / system-generated field

For picklists and radio buttons, Admin can add, edit, reorder, and deactivate options. Store a stable option value separately from its display label.

## 5. Initial Object Relationships
- **Client:** has many Client Contacts.
- **Client Contact:** belongs to one Client; includes name, designation, phone, email, and custom fields.
- **Postman / FO:** has profile, phone, email, photo, active status, and custom fields.
- **Worker:** belongs to an Employer Company; includes name, phone, email, profile details, and custom fields.
- **Employer Company:** can have many Workers.
- **Mass Camera Assignment:** a batch operation assigning multiple individual devices to selected workers using explicit assignment rows. Each device retains its own assignment and movement history.

Use relationship/lookup fields rather than free-text company or contact names when a record must link to an existing Client, Contact, Worker, or Employer Company.

## 6. Dynamic Form Behaviour
- Render forms from active object and field metadata stored in the database.
- Required fields must be marked clearly and validated in both frontend and backend.
- Optional fields must not block submission.
- Apply type-specific validation and clear error messages.
- Show only active fields.
- Respect field order, help text, defaults, and visibility settings.
- When Client is selected in a pickup form, filter the Client Contact dropdown to contacts belonging to that Client.
- If the selected Client changes, clear any now-invalid selected contact.
- Support create, view, edit, search, and list screens for configurable records.
- Existing records remain readable if a field is later deactivated.

## 7. Data Architecture
Use Django models and migrations for field-builder metadata, with tables similar to:
- `ObjectDefinition`: name, stable key, description, active status, timestamps.
- `FieldDefinition`: object definition, label, stable key, field type, required flag, config JSON, default value, display order, active status, searchable/list visibility flags.
- `FieldChoice`: field definition, stable value, display label, display order, active status.
- `DynamicRecord`: object definition, record ID, core metadata, created_by, updated_by, timestamps.
- `DynamicFieldValue`: record, field definition, typed value or validated JSON value.
- `ObjectPermission` / `FieldPermission` if fine-grained permissions are required.

Use unique constraints for object keys and field keys within each object. Validate field definitions and submitted values server-side.

**Storage design:** Do not create a new SQL column every time an Admin adds a custom field. Store configurable field definitions and values using a metadata-driven design. Use typed value columns or validated JSON with appropriate indexes for searchable fields. Keep core business entities and inventory transactions relational and strongly constrained.

Before implementation, inspect existing Django models and workflows. Reuse existing Client, Worker, Device, and Assignment models where practical; do not duplicate them as generic records.

## 8. Mass Camera Assignment
- Allow authorized users to select available devices by QR scan, asset ID, or filters.
- Select target worker(s) and define the intended device-to-worker mapping.
- Preview the batch before confirming.
- Validate every device and worker before committing.
- Reject devices that are already assigned, lost, under repair, retired, or outside the user's authorized custody.
- Require confirmation before execution.
- Create a separate assignment and movement-log entry for each device.
- Never represent a batch assignment as one shared device record.
- Provide a downloadable result report.
- Use an atomic transaction where feasible; otherwise clearly report successful and failed rows without hiding partial results.

## 9. Security and Audit
- Only Admin can configure object definitions and field rules.
- Dynamic fields must never override roles, approval status, device status, current custodian, or other protected system fields.
- Validate field type, required status, choices, relationships, and permissions on the server.
- Restrict sensitive fields such as Aadhaar and bank details; mask them by default.
- Log who changed object/field definitions and when.
- Log important record changes with actor and timestamps.
- Do not allow field configuration to bypass inventory custody rules or audit history.

## 10. UI Requirements
- Responsive Admin console.
- Object Builder: list and manage objects.
- Field Builder: drag-and-drop ordering if practical.
- Field configuration panel.
- Live form preview.
- Record list with search, filters, sorting, and pagination.
- Mobile-friendly data entry for Postmen / FOs.
- Clear required indicators, validation errors, loading states, and save confirmation.
- Confirmation dialogs for deactivation and publishing changes.

## 11. Acceptance Tests
1. Admin adds a required text field to Worker; it appears on the Worker form and blocks invalid submissions.
2. Admin adds an optional dropdown field; a record can be saved without selecting an option.
3. Admin configures a radio field; only configured active options are accepted by the backend.
4. Admin adds a field without a code change or database schema migration.
5. Selecting a Client filters Client Contact choices to that Client only.
6. Deactivating a field hides it from new forms without deleting existing values.
7. Management and Postman roles cannot edit object definitions.
8. A dynamic field cannot override protected device status or current custodian.
9. Mass assignment creates one assignment and movement log per device and prevents duplicate active assignments.
10. Existing inventory, QR scanning, authentication, and movement history continue to work.

## 12. Vibe-Coding Implementation Order
1. Inspect existing Django models and workflows; do not rewrite working modules unnecessarily.
2. Build ObjectDefinition, FieldDefinition, and FieldChoice models plus Admin-only management UI.
3. Build dynamic form rendering and server-side validation.
4. Add dynamic record storage and CRUD screens.
5. Add relationship fields and Client-to-Contact filtering.
6. Add mass camera assignment using existing device/assignment services.
7. Add permissions, audit logs, tests, and responsive polish.

Build and test one phase at a time. Do not leave placeholder buttons, frontend-only validation, or fake database operations.
