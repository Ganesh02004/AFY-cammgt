from django.test import TestCase, Client
from django.utils import timezone
from django.urls import reverse
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import (
    User, ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Pickup, Assignment, Transfer, DeviceReturn, DeviceMovement,
    AuditLog, ObjectDefinition, FieldDefinition, FieldChoice, DynamicRecord,
    MassCameraAssignmentBatch
)
from .services import (
    intake_devices, assign_device_to_worker, initiate_transfer,
    accept_transfer, reject_transfer, process_return,
    complete_inspection, audited_adjustment
)
from .builder_service import (
    seed_initial_objects_and_fields, validate_dynamic_form_submission,
    save_dynamic_form_data, execute_mass_camera_assignment
)


class CameraInventoryPortalTests(TestCase):
    def setUp(self):
        # 1. Users
        self.admin = User.objects.create_user(
            username='admin_test',
            password='password123',
            role='ADMIN',
            is_staff=True,
            is_superuser=True
        )
        self.manager = User.objects.create_user(
            username='manager_test',
            password='password123',
            role='MANAGEMENT'
        )
        self.collector1 = User.objects.create_user(
            username='collector1_test',
            password='password123',
            role='POSTMAN'
        )
        self.collector2 = User.objects.create_user(
            username='collector2_test',
            password='password123',
            role='POSTMAN'
        )

        # 2. Clients
        self.client_a = ClientCompany.objects.create(
            name='Alpha Corp',
            code='ALP-01',
            address='123 Tech Park',
            city='Bangalore',
            state='Karnataka',
            pin_code='560001'
        )
        self.client_b = ClientCompany.objects.create(
            name='Beta Media',
            code='BET-02',
            address='456 Film City',
            city='Mumbai',
            state='Maharashtra',
            pin_code='400001'
        )
        self.poc = ClientContact.objects.create(
            client=self.client_a,
            name='Siddharth',
            phone='9999988888',
            email='sid@alpha.com'
        )

        # 3. Employer & Worker
        self.employer = EmployerCompany.objects.create(
            name='Rapid Logistics',
            code='RL-01',
            address='Industrial Estate',
            contact_details='info@rapid.com'
        )
        self.worker1 = Worker.objects.create(
            worker_id='WRK-9001',
            name='Ramesh Kumar',
            phone='9876543210',
            employer_company=self.employer,
            aadhaar_number='1234-5678-9012',
            bank_account_number='987654321098'
        )
        self.worker2 = Worker.objects.create(
            worker_id='WRK-9002',
            name='Sanjay Dutt',
            phone='9876543211',
            employer_company=self.employer,
            aadhaar_number='9999-8888-7777',
            bank_account_number='112233445566'
        )

        self.client = Client()

    def test_acceptance_1_collector_intake(self):
        """
        Acceptance Test 1:
        A collector receives three devices: all three appear in their My Inventory
        and in the Admin's company master inventory.
        """
        devices_data = [
            {'asset_id': 'TEST-001', 'brand_and_model': 'Sony A7', 'imei_or_serial': 'SN-001'},
            {'asset_id': 'TEST-002', 'brand_and_model': 'Canon R5', 'imei_or_serial': 'SN-002'},
            {'asset_id': 'TEST-003', 'brand_and_model': 'Nikon Z9', 'imei_or_serial': 'SN-003'},
        ]
        pickup, created_devices = intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=devices_data,
            actual_poc=self.poc
        )

        # 3 devices created
        self.assertEqual(len(created_devices), 3)

        # All 3 in Collector1's My Inventory
        collector_inventory = Device.objects.filter(
            current_custodian_type='USER',
            current_custodian_user=self.collector1
        )
        self.assertEqual(collector_inventory.count(), 3)
        for dev in created_devices:
            self.assertIn(dev, collector_inventory)
            self.assertTrue(bool(dev.qr_code_image))  # QR code generated

        # All 3 appear in Admin's Company Master Inventory
        master_inventory = Device.objects.all()
        self.assertEqual(master_inventory.count(), 3)

    def test_acceptance_2_management_intake(self):
        """
        Acceptance Test 2:
        A management user receives two more: their My Inventory shows two
        and the company master shows five unique devices.
        """
        # Collector1 gets 3
        intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[
                {'asset_id': 'TEST-001', 'brand_and_model': 'Device 1'},
                {'asset_id': 'TEST-002', 'brand_and_model': 'Device 2'},
                {'asset_id': 'TEST-003', 'brand_and_model': 'Device 3'},
            ]
        )
        # Management user gets 2
        intake_devices(
            client=self.client_b,
            collecting_user=self.manager,
            devices_data=[
                {'asset_id': 'TEST-004', 'brand_and_model': 'Device 4'},
                {'asset_id': 'TEST-005', 'brand_and_model': 'Device 5'},
            ]
        )

        # Management user's inventory shows 2
        manager_inventory = Device.objects.filter(
            current_custodian_type='USER',
            current_custodian_user=self.manager
        )
        self.assertEqual(manager_inventory.count(), 2)

        # Company master shows 5 unique devices
        self.assertEqual(Device.objects.count(), 5)

    def test_acceptance_3_assign_to_worker(self):
        """
        Acceptance Test 3:
        Assigning one device to a worker removes it from the collector's custody list,
        adds it to the worker's current assignments, and keeps it in the company master.
        """
        pickup, devices = intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[
                {'asset_id': 'DEV-ASSIGN-1', 'brand_and_model': 'GoPro Hero 11'}
            ]
        )
        dev = devices[0]

        # Verify initially with collector
        self.assertEqual(dev.current_custodian_user, self.collector1)
        self.assertEqual(Device.objects.filter(current_custodian_user=self.collector1).count(), 1)

        # Assign to worker1
        assignment = assign_device_to_worker(
            device=dev,
            worker=self.worker1,
            delivering_user=self.collector1,
            acknowledgement='Worker received equipment.'
        )

        dev.refresh_from_db()

        # Removed from collector's custody list
        self.assertEqual(Device.objects.filter(current_custodian_user=self.collector1).count(), 0)

        # Added to worker's current assignments
        self.assertEqual(dev.current_status, 'ASSIGNED_WORKER')
        self.assertEqual(dev.current_custodian_type, 'WORKER')
        self.assertEqual(dev.current_custodian_worker, self.worker1)
        self.assertEqual(self.worker1.device_assignments.filter(status='ACTIVE').count(), 1)

        # Retained in company master inventory
        self.assertTrue(Device.objects.filter(asset_id='DEV-ASSIGN-1').exists())

    def test_acceptance_4_available_stock_totals(self):
        """
        Acceptance Test 4:
        Available-stock totals exclude devices assigned to workers or otherwise unavailable.
        Only devices in Company Storage with status AVAILABLE_STORAGE count.
        """
        # Device 1: With Collector
        d1 = Device.objects.create(
            asset_id='STK-1', brand_and_model='Cam 1', source_client=self.client_a,
            current_status='WITH_COLLECTOR', current_custodian_type='USER', current_custodian_user=self.collector1
        )
        # Device 2: Assigned to Worker
        d2 = Device.objects.create(
            asset_id='STK-2', brand_and_model='Cam 2', source_client=self.client_a,
            current_status='ASSIGNED_WORKER', current_custodian_type='WORKER', current_custodian_worker=self.worker1
        )
        # Device 3: Under Repair
        d3 = Device.objects.create(
            asset_id='STK-3', brand_and_model='Cam 3', source_client=self.client_a,
            current_status='UNDER_REPAIR', current_custodian_type='STORAGE'
        )
        # Device 4: Damaged
        d4 = Device.objects.create(
            asset_id='STK-4', brand_and_model='Cam 4', source_client=self.client_a,
            current_status='DAMAGED', current_custodian_type='STORAGE'
        )
        # Device 5: Truly Available in Company Storage
        d5 = Device.objects.create(
            asset_id='STK-5', brand_and_model='Cam 5', source_client=self.client_a,
            current_status='AVAILABLE_STORAGE', current_custodian_type='STORAGE'
        )

        available_count = Device.objects.filter(
            current_status='AVAILABLE_STORAGE',
            current_custodian_type='STORAGE'
        ).count()

        self.assertEqual(available_count, 1)
        self.assertFalse(d1.is_available_stock)
        self.assertFalse(d2.is_available_stock)
        self.assertFalse(d3.is_available_stock)
        self.assertFalse(d4.is_available_stock)
        self.assertTrue(d5.is_available_stock)

    def test_acceptance_5_prevent_unauthorized_or_double_assignment(self):
        """
        Acceptance Test 5:
        A second user cannot assign a device already assigned or not in their custody.
        """
        # Collector 1 has dev1
        intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[{'asset_id': 'DEV-DOUBLE', 'brand_and_model': 'BodyCam'}]
        )
        dev = Device.objects.get(asset_id='DEV-DOUBLE')

        # Collector 2 attempts to assign it (not in their custody)
        with self.assertRaises(ValidationError) as ctx:
            assign_device_to_worker(
                device=dev,
                worker=self.worker1,
                delivering_user=self.collector2
            )
        self.assertIn("not in your custody", str(ctx.exception))

        # Now Collector 1 legally assigns it
        assign_device_to_worker(
            device=dev,
            worker=self.worker1,
            delivering_user=self.collector1
        )

        # Attempt to double-assign an already assigned device
        dev.refresh_from_db()
        with self.assertRaises(ValidationError) as ctx2:
            assign_device_to_worker(
                device=dev,
                worker=self.worker2,
                delivering_user=self.admin
            )
        self.assertIn("already assigned", str(ctx2.exception))

    def test_acceptance_6_transfer_custody_only_on_acceptance(self):
        """
        Acceptance Test 6:
        A transfer does not change custody until the receiver accepts it.
        """
        intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[{'asset_id': 'DEV-XFER', 'brand_and_model': 'Canon X'}]
        )
        dev = Device.objects.get(asset_id='DEV-XFER')

        # Collector 1 initiates transfer to Collector 2
        transfer = initiate_transfer(
            device=dev,
            sender=self.collector1,
            receiver=self.collector2,
            notes='Mid-route handover'
        )

        dev.refresh_from_db()

        # CUSTODY MUST STILL BE WITH SENDER (Collector 1)
        self.assertEqual(dev.current_custodian_user, self.collector1)
        self.assertEqual(transfer.status, 'PENDING')

        # Now Collector 2 accepts
        accept_transfer(transfer, receiver=self.collector2)

        dev.refresh_from_db()
        transfer.refresh_from_db()

        # Custody now atomically moved to Collector 2
        self.assertEqual(dev.current_custodian_user, self.collector2)
        self.assertEqual(transfer.status, 'ACCEPTED')

    def test_acceptance_7_return_inspection_requirement(self):
        """
        Acceptance Test 7:
        A return does not become available until required inspection is complete.
        """
        intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[{'asset_id': 'DEV-RET', 'brand_and_model': 'Dashcam Pro'}]
        )
        dev = Device.objects.get(asset_id='DEV-RET')
        assign_device_to_worker(dev, self.worker1, self.collector1)

        dev.refresh_from_db()

        # Collector 1 collects return from worker
        return_rec = process_return(
            device=dev,
            worker=self.worker1,
            receiving_user=self.collector1,
            condition='GOOD',
            notes='Worker completed contract'
        )

        dev.refresh_from_db()

        # State must be AWAITING_INSPECTION, NOT AVAILABLE_STORAGE
        self.assertEqual(dev.current_status, 'AWAITING_INSPECTION')
        self.assertFalse(dev.is_available_stock)

        # Available stock count must not include it
        avail = Device.objects.filter(current_status='AVAILABLE_STORAGE', current_custodian_type='STORAGE').count()
        self.assertEqual(avail, 0)

        # Complete inspection with outcome AVAILABLE_STORAGE
        complete_inspection(
            return_record=return_rec,
            inspector=self.manager,
            inspection_result='PASSED',
            outcome='AVAILABLE_STORAGE',
            notes='Clean lens and functional battery.'
        )

        dev.refresh_from_db()

        # NOW it becomes available stock in company storage
        self.assertEqual(dev.current_status, 'AVAILABLE_STORAGE')
        self.assertEqual(dev.current_custodian_type, 'STORAGE')
        self.assertTrue(dev.is_available_stock)

    def test_acceptance_8_immutable_movements_history(self):
        """
        Acceptance Test 8:
        Every completed movement appears in chronological history and cannot be silently deleted.
        """
        pickup, devices = intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[{'asset_id': 'DEV-MOVE', 'brand_and_model': 'Security Bodycam'}]
        )
        dev = devices[0]

        # Initial intake created 1 movement
        self.assertEqual(dev.movements.count(), 1)
        m1 = dev.movements.first()
        self.assertEqual(m1.related_transaction_type, 'INTAKE')

        # Assignment creates 2nd movement
        assign_device_to_worker(dev, self.worker1, self.collector1)
        self.assertEqual(dev.movements.count(), 2)

        # Return creates 3rd movement
        ret = process_return(dev, self.worker1, self.collector1)
        self.assertEqual(dev.movements.count(), 3)

        # Inspection creates 4th movement
        complete_inspection(ret, self.manager, 'PASSED', 'AVAILABLE_STORAGE')
        self.assertEqual(dev.movements.count(), 4)

        # Verify chronological order
        timestamps = list(dev.movements.values_list('timestamp', flat=True))
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_acceptance_9_postmen_cannot_view_others_or_restricted_data(self):
        """
        Acceptance Test 9:
        Postmen cannot view other users' inventories or restricted personal data
        through direct API/database requests.
        """
        # Collector 2 logs in
        self.client.login(username='collector2_test', password='password123')

        # Try to access Master Inventory (Admin only)
        response = self.client.get(reverse('master_inventory'))
        self.assertRedirects(response, reverse('dashboard'))

        # Postman accessing worker detail cannot unmask Aadhaar or bank details
        response = self.client.get(reverse('worker_detail', args=[self.worker1.id]) + '?reveal=1')
        self.assertContains(response, 'XXXX-XXXX-')
        self.assertNotContains(response, '1234-5678-9012')  # Raw Aadhaar hidden!

        # But Admin CAN view unmasked details
        self.client.login(username='admin_test', password='password123')
        admin_resp = self.client.get(reverse('worker_detail', args=[self.worker1.id]) + '?reveal=1')
        self.assertContains(admin_resp, '1234-5678-9012')

    def test_acceptance_10_qr_scanning_and_manual_lookup(self):
        """
        Acceptance Test 10:
        QR scanning works on mobile; manual asset-ID lookup is available as fallback.
        Scanning only opens the record without changing custody.
        """
        dev = Device.objects.create(
            asset_id='DEV-SCAN-99',
            brand_and_model='Pixel 7 Pro',
            source_client=self.client_a,
            current_status='WITH_COLLECTOR',
            current_custodian_type='USER',
            current_custodian_user=self.collector1
        )
        dev.generate_qr_code()
        dev.save()

        self.client.login(username='collector1_test', password='password123')

        # 1. Access QR token endpoint
        qr_url = reverse('device_qr_lookup', args=[dev.qr_token])
        resp = self.client.get(qr_url)
        self.assertRedirects(resp, f"/device/{dev.id}/?via_qr=1")

        # Verify custody did NOT change!
        dev.refresh_from_db()
        self.assertEqual(dev.current_custodian_user, self.collector1)
        self.assertEqual(dev.current_status, 'WITH_COLLECTOR')

        # 2. Manual lookup fallback via scanner form
        manual_resp = self.client.post(reverse('qr_scanner'), {'search_term': 'DEV-SCAN-99'})
        self.assertRedirects(manual_resp, f"/device/{dev.id}/?via_qr=1")

    def test_acceptance_11_dashboard_totals_match_queries(self):
        """
        Acceptance Test 11:
        Dashboard totals match database queries.
        """
        self.client.login(username='admin_test', password='password123')

        intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[
                {'asset_id': 'DB-01', 'brand_and_model': 'Dev 1'},
                {'asset_id': 'DB-02', 'brand_and_model': 'Dev 2'},
            ]
        )
        resp = self.client.get(reverse('dashboard'))
        self.assertEqual(resp.status_code, 200)

        # Context contains calculated database counts
        self.assertEqual(resp.context['total_devices'], Device.objects.count())
        self.assertEqual(resp.context['with_collectors'], Device.objects.filter(current_custodian_type='USER').count())

    def test_acceptance_12_atomic_transaction_rollback_on_failure(self):
        """
        Acceptance Test 12:
        Failed transactions leave custody, status, assignment, and movement history consistent.
        """
        # Create an existing device with IMEI 'DUP-111'
        Device.objects.create(
            asset_id='EXIST-1',
            brand_and_model='Cam',
            imei_or_serial='DUP-111',
            source_client=self.client_a
        )

        initial_device_count = Device.objects.count()
        initial_movement_count = DeviceMovement.objects.count()
        initial_pickup_count = Pickup.objects.count()

        # Attempt intake batch where second device has duplicate serial
        batch = [
            {'asset_id': 'VALID-1', 'brand_and_model': 'Fine'},
            {'asset_id': 'INVALID-2', 'brand_and_model': 'Duplicate Serial', 'imei_or_serial': 'DUP-111'},
        ]

        with self.assertRaises(ValidationError):
            intake_devices(
                client=self.client_a,
                collecting_user=self.collector1,
                devices_data=batch
            )

        # Everything must be rolled back!
        self.assertEqual(Device.objects.count(), initial_device_count)
        self.assertEqual(DeviceMovement.objects.count(), initial_movement_count)
        self.assertEqual(Pickup.objects.count(), initial_pickup_count)

    def test_indian_mobile_and_email_validation(self):
        r"""
        Enhancement Requirement 4:
        Validates 10-digit Indian mobile format (^[6-9]\d{9}$) and email regex.
        """
        from .validators import validate_indian_mobile, validate_email_address, clean_indian_phone

        # Valid Indian mobiles
        self.assertEqual(clean_indian_phone('9876543210'), '9876543210')
        self.assertEqual(clean_indian_phone('+91 98765-43210'), '9876543210')
        self.assertEqual(clean_indian_phone('09876543210'), '9876543210')
        validate_indian_mobile('9876543210')
        validate_indian_mobile('+91 9876543210')

        # Invalid Indian mobiles must raise ValidationError
        with self.assertRaises(ValidationError):
            validate_indian_mobile('1234567890')  # Starts with 1
        with self.assertRaises(ValidationError):
            validate_indian_mobile('98765')       # Too short
        with self.assertRaises(ValidationError):
            validate_indian_mobile('987654321012')  # Too long

        # Valid emails
        validate_email_address('user@example.com')
        validate_email_address('admin.ops@sub.domain.co.in')

        # Invalid emails must raise ValidationError
        with self.assertRaises(ValidationError):
            validate_email_address('invalid-email')
        with self.assertRaises(ValidationError):
            validate_email_address('@missinguser.com')

    def test_client_specific_poc_api(self):
        """
        Enhancement Requirement 6:
        API returns only contacts belonging to the selected client.
        """
        self.client.login(username='admin_test', password='password123')

        # Client A already has self.poc ('Siddharth')
        # Create Contact for Client B
        poc_b = ClientContact.objects.create(
            client=self.client_b,
            name='Kavita Sharma',
            phone='9811223344',
            email='kavita@beta.com'
        )

        resp_a = self.client.get(reverse('client_contacts_api', kwargs={'client_id': self.client_a.id}))
        self.assertEqual(resp_a.status_code, 200)
        contacts_a = resp_a.json()['contacts']
        self.assertEqual(len(contacts_a), 1)
        self.assertEqual(contacts_a[0]['name'], 'Siddharth')

        resp_b = self.client.get(reverse('client_contacts_api', kwargs={'client_id': self.client_b.id}))
        self.assertEqual(resp_b.status_code, 200)
        contacts_b = resp_b.json()['contacts']
        self.assertEqual(len(contacts_b), 1)
        self.assertEqual(contacts_b[0]['name'], 'Kavita Sharma')

    def test_location_tracking_and_activity_logs(self):
        """
        Enhancement Requirements 1 & 5:
        Latitude, longitude, and address are recorded during operations
        and saved in the DeviceActivityLog with timestamp and actor.
        """
        from .models import DeviceActivityLog

        pickup, devices = intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[{'asset_id': 'LOC-CAM-1', 'brand_and_model': 'Sony A7 IV'}],
            location='Koramangala 4th Block, Bangalore',
            latitude=12.9352,
            longitude=77.6245
        )
        dev = devices[0]

        # Verify Pickup has location
        self.assertEqual(pickup.latitude, 12.9352)
        self.assertEqual(pickup.longitude, 77.6245)
        self.assertIn('Koramangala', pickup.location)

        # Verify DeviceActivityLog was created
        logs = DeviceActivityLog.objects.filter(device=dev)
        self.assertTrue(logs.exists())
        intake_log = logs.filter(action='COLLECTED_FROM_CLIENT').first()
        self.assertIsNotNone(intake_log)
        self.assertEqual(intake_log.latitude, 12.9352)
        self.assertEqual(intake_log.actor, self.collector1)

        # Assign device to worker with location
        assign_device_to_worker(
            device=dev,
            worker=self.worker1,
            delivering_user=self.collector1,
            condition='GOOD',
            acknowledgement='Worker received in person',
            latitude=12.9360,
            longitude=77.6250,
            location_address='Hub Warehouse 2, Bangalore'
        )

        assign_log = DeviceActivityLog.objects.filter(device=dev, action='ASSIGNED_TO_WORKER').first()
        self.assertIsNotNone(assign_log)
        self.assertEqual(assign_log.latitude, 12.9360)
        self.assertEqual(assign_log.actor, self.collector1)
        self.assertIn('Ramesh Kumar', assign_log.details)

    def test_qr_quick_return_workflow(self):
        """
        Enhancement Requirement 7:
        QR return automatically identifies device and worker, logs condition
        and return GPS location, and shifts device to AWAITING_INSPECTION.
        """
        self.client.login(username='collector1_test', password='password123')

        _, devices = intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=[{'asset_id': 'RETURN-CAM-1', 'brand_and_model': 'Nikon Z6'}]
        )
        dev = devices[0]

        assign_device_to_worker(
            device=dev,
            worker=self.worker1,
            delivering_user=self.collector1,
            condition='GOOD',
            acknowledgement='Signed receipt'
        )

        # Post return via quick return endpoint
        return_resp = self.client.post(
            reverse('qr_quick_return', kwargs={'device_id': dev.id}),
            {
                'condition': 'GOOD',
                'accessories': 'All original cables returned',
                'notes': 'Job finished, returned in good state',
                'latitude': '12.9716',
                'longitude': '77.5946',
                'location_address': 'MG Road Field Station, Bangalore',
            }
        )
        self.assertEqual(return_resp.status_code, 302)

        dev.refresh_from_db()
        self.assertEqual(dev.current_status, 'AWAITING_INSPECTION')
        self.assertEqual(dev.current_custodian_type, 'USER')
        self.assertEqual(dev.current_custodian_user, self.collector1)

        # Check return transaction and activity log
        ret = DeviceReturn.objects.get(device=dev)
        self.assertEqual(ret.worker, self.worker1)
        self.assertEqual(ret.latitude, 12.9716)
        self.assertEqual(ret.longitude, 77.5946)

    def test_desktop_to_mobile_scanner_bridge(self):
        """
        Enhancement Requirement 8:
        Desktop pairing session creation, phone camera scanning without login,
        and real-time status polling sync.
        """
        from .services import create_remote_scanner_session
        from .models import ScannerSession
        import json

        # 1. Desktop creates scanner session
        session = create_remote_scanner_session(self.admin)
        self.assertEqual(session.status, 'WAITING')
        pairing_token = session.pairing_token

        # 2. Mobile opens scanner URL without logging in
        mobile_client = Client()  # Unauthenticated
        resp = mobile_client.get(reverse('remote_scanner', kwargs={'pairing_token': pairing_token}))
        self.assertEqual(resp.status_code, 200)

        session.refresh_from_db()
        self.assertEqual(session.status, 'PAIRED')

        # 3. Create a test device
        _, devices = intake_devices(
            client=self.client_a,
            collecting_user=self.admin,
            devices_data=[{'asset_id': 'REMOTE-CAM-7', 'brand_and_model': 'GoPro Hero 11'}]
        )
        target_dev = devices[0]

        # 4. Mobile transmits physical scan to desktop session
        scan_payload = json.dumps({'scanned_value': target_dev.asset_id})
        scan_resp = mobile_client.post(
            reverse('scanner_session_scan_api', kwargs={'pairing_token': pairing_token}),
            data=scan_payload,
            content_type='application/json'
        )
        self.assertEqual(scan_resp.status_code, 200)
        scan_data = scan_resp.json()
        self.assertTrue(scan_data['success'])
        self.assertEqual(scan_data['device']['asset_id'], target_dev.asset_id)

        # 5. Desktop polls status and receives scanned device
        self.client.login(username='admin_test', password='password123')
        status_resp = self.client.get(
            reverse('scanner_session_status_api', kwargs={'session_id': session.session_id})
        )
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.json()
        self.assertEqual(status_data['status'], 'SCANNED')
        self.assertIsNotNone(status_data['device'])
        self.assertEqual(status_data['device']['id'], target_dev.id)
        self.assertEqual(status_data['device']['asset_id'], 'REMOTE-CAM-7')

    def test_user_registration_and_admin_approval_workflow(self):
        """
        Tests self-service registration with 2-option role selection,
        initial inactive status pending admin approval, blocking login while inactive,
        and activation via admin approval.
        """
        from .forms import UserRegistrationForm

        # 1. Register a new user with MANAGEMENT role
        reg_data = {
            'first_name': 'Ananya',
            'last_name': 'Roy',
            'username': 'ananya_mgr',
            'email': 'ananya@example.com',
            'phone': '9876543210',
            'role': 'MANAGEMENT',
            'password': 'StrongPassword123',
            'confirm_password': 'StrongPassword123',
        }
        form = UserRegistrationForm(data=reg_data)
        self.assertTrue(form.is_valid(), form.errors)
        new_user = form.save()

        # User is saved but is_active=False
        self.assertFalse(new_user.is_active)
        self.assertEqual(new_user.role, 'MANAGEMENT')
        self.assertEqual(new_user.phone, '9876543210')

        # 2. Inactive user cannot log in
        login_resp = self.client.post(reverse('login'), {
            'username': 'ananya_mgr',
            'password': 'StrongPassword123'
        })
        self.assertEqual(login_resp.status_code, 200)
        self.assertIn('pending Administrator Approval', login_resp.content.decode())

        # 3. Admin views pending users in User Management
        self.client.login(username='admin_test', password='password123')
        mgmt_resp = self.client.get(reverse('user_management'))
        self.assertEqual(mgmt_resp.status_code, 200)
        self.assertIn('ananya_mgr', mgmt_resp.content.decode())
        self.assertIn('Pending User Registrations Awaiting Admin Approval', mgmt_resp.content.decode())

        # 4. Admin approves the user
        approve_resp = self.client.post(reverse('user_approve', kwargs={'user_id': new_user.id}))
        self.assertRedirects(approve_resp, reverse('user_management'))

        new_user.refresh_from_db()
        self.assertTrue(new_user.is_active)

        # 5. Now the approved user can log in
        self.client.logout()
        approved_login_resp = self.client.post(reverse('login'), {
            'username': 'ananya_mgr',
            'password': 'StrongPassword123'
        })
        self.assertRedirects(approved_login_resp, reverse('dashboard'))

        # 6. Register a second user with POSTMAN role and test Admin Rejection
        postman_reg = {
            'first_name': 'Kunal',
            'last_name': 'Sharma',
            'username': 'kunal_post',
            'email': 'kunal@example.com',
            'phone': '9812345678',
            'role': 'POSTMAN',
            'password': 'StrongPassword123',
            'confirm_password': 'StrongPassword123',
        }
        form2 = UserRegistrationForm(data=postman_reg)
        self.assertTrue(form2.is_valid(), form2.errors)
        postman_user = form2.save()
        self.assertFalse(postman_user.is_active)
        self.assertEqual(postman_user.role, 'POSTMAN')

        # Admin rejects
        self.client.login(username='admin_test', password='password123')
        reject_resp = self.client.post(reverse('user_reject', kwargs={'user_id': postman_user.id}))
        self.assertRedirects(reject_resp, reverse('user_management'))
        self.assertFalse(User.objects.filter(username='kunal_post').exists())

    def test_change_password_workflow(self):
        """
        Verify password reset / change feature:
        - Incorrect old password rejected
        - Mismatched confirmation rejected
        - Min length enforced
        - Successful change persists password and keeps active session
        """
        self.client.login(username='admin_test', password='password123')

        # 1. Incorrect current password
        bad_old = self.client.post(reverse('change_password'), {
            'old_password': 'wrongpassword',
            'new_password': 'NewStrongPassword123!',
            'confirm_new_password': 'NewStrongPassword123!',
        })
        self.assertEqual(bad_old.status_code, 200)
        self.assertIn('Current password is incorrect', bad_old.content.decode())

        # 2. Mismatched confirmation
        mismatch = self.client.post(reverse('change_password'), {
            'old_password': 'password123',
            'new_password': 'NewStrongPassword123!',
            'confirm_new_password': 'DifferentPassword123!',
        })
        self.assertEqual(mismatch.status_code, 200)
        self.assertIn('New passwords do not match', mismatch.content.decode())

        # 3. Successful change
        success_resp = self.client.post(reverse('change_password'), {
            'old_password': 'password123',
            'new_password': 'NewStrongPassword123!',
            'confirm_new_password': 'NewStrongPassword123!',
        })
        self.assertRedirects(success_resp, reverse('dashboard'))

        # Verify password updated in DB
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.check_password('NewStrongPassword123!'))
        self.assertFalse(self.admin.check_password('password123'))

        # Can log in with new password
        self.client.logout()
        new_login = self.client.post(reverse('login'), {
            'username': 'admin_test',
            'password': 'NewStrongPassword123!'
        })
        self.assertRedirects(new_login, reverse('dashboard'))

    def test_system_data_purge_security_and_execution(self):
        """
        Verify Admin Data Purge / Factory Reset:
        - Non-admins blocked
        - Incorrect admin password rejected
        - Incorrect confirmation phrase rejected
        - Operational Purge wipes devices/movements/logs while preserving accounts
        - Complete Factory Reset wipes everything except requesting admin
        """
        # 1. Non-admin access is blocked
        self.client.login(username='collector1_test', password='password123')
        blocked_resp = self.client.get(reverse('system_reset_data'))
        self.assertEqual(blocked_resp.status_code, 302)  # Redirected by admin_required

        # 2. Admin logs in
        self.client.login(username='admin_test', password='password123')
        purge_page = self.client.get(reverse('system_reset_data'))
        self.assertEqual(purge_page.status_code, 200)
        self.assertIn('Danger Zone: System Data Purge', purge_page.content.decode())

        # 3. Rejected if confirmation phrase is wrong
        bad_phrase = self.client.post(reverse('system_reset_data'), {
            'purge_scope': 'INVENTORY_ONLY',
            'confirm_phrase': 'WRONG-PHRASE',
            'admin_password': 'password123'
        })
        self.assertEqual(bad_phrase.status_code, 200)
        self.assertIn('Confirmation phrase does not match', bad_phrase.content.decode())

        # 4. Rejected if admin password is wrong
        bad_pwd = self.client.post(reverse('system_reset_data'), {
            'purge_scope': 'INVENTORY_ONLY',
            'confirm_phrase': 'CONFIRM-ERASE-ALL-DATA',
            'admin_password': 'wrongadminpassword'
        })
        self.assertEqual(bad_pwd.status_code, 200)
        self.assertIn('Incorrect administrator password', bad_pwd.content.decode())

        # 5. Populate some devices and test INVENTORY_ONLY purge
        devices_data = [{
            'device_type': 'CAMERA',
            'brand_and_model': 'Canon 5D Mark IV',
            'imei_or_serial': 'SER-PURGE-001',
            'condition': 'GOOD'
        }]
        pickup, created = intake_devices(
            client=self.client_a,
            collecting_user=self.collector1,
            devices_data=devices_data,
            actual_poc=self.poc
        )
        self.assertEqual(Device.objects.count(), 1)
        self.assertEqual(Pickup.objects.count(), 1)

        # Execute Operational Purge
        op_purge_resp = self.client.post(reverse('system_reset_data'), {
            'purge_scope': 'INVENTORY_ONLY',
            'confirm_phrase': 'CONFIRM-ERASE-ALL-DATA',
            'admin_password': 'password123'
        })
        self.assertRedirects(op_purge_resp, reverse('dashboard'))

        # Devices, Pickups, Movements wiped to 0
        self.assertEqual(Device.objects.count(), 0)
        self.assertEqual(Pickup.objects.count(), 0)
        self.assertEqual(DeviceMovement.objects.count(), 0)

        # Clients, Workers, and Staff Accounts are PRESERVED
        self.assertTrue(ClientCompany.objects.filter(id=self.client_a.id).exists())
        self.assertTrue(Worker.objects.filter(id=self.worker1.id).exists())
        self.assertTrue(User.objects.filter(id=self.collector1.id).exists())

        # 6. Execute Complete Factory Reset
        factory_reset_resp = self.client.post(reverse('system_reset_data'), {
            'purge_scope': 'COMPLETE_FACTORY_RESET',
            'confirm_phrase': 'CONFIRM-ERASE-ALL-DATA',
            'admin_password': 'password123'
        })
        self.assertRedirects(factory_reset_resp, reverse('dashboard'))

        # Everything wiped except current admin
        self.assertEqual(ClientCompany.objects.count(), 0)
        self.assertEqual(Worker.objects.count(), 0)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.first().id, self.admin.id)

    def test_client_contact_creation_and_retrieval_workflows(self):
        """
        Verify that Client Contacts (POCs) are reliably stored in the database:
        1. Via client creation with primary contact
        2. Via client detail page contact form
        3. Via Quick Add POC API
        4. Dynamic contacts API returns all active contacts for intake dropdown
        """
        self.client.login(username='admin_test', password='password123')

        # 1. Create new client with primary contact person
        create_resp = self.client.post(reverse('client_create'), {
            'name': 'Titan Watch Co',
            'code': 'TTN-99',
            'status': 'ACTIVE',
            'address': 'Electronic City Phase 1',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'pin_code': '560100',
            'poc_name': 'Anil Kumble',
            'poc_designation': 'Area Manager',
            'poc_phone': '9876543210',
            'poc_email': 'anil@titan.com'
        })
        new_client = ClientCompany.objects.get(code='TTN-99')
        self.assertRedirects(create_resp, reverse('client_detail', kwargs={'client_id': new_client.id}))
        self.assertEqual(new_client.contacts.count(), 1)
        primary_poc = new_client.contacts.first()
        self.assertEqual(primary_poc.name, 'Anil Kumble')
        self.assertEqual(primary_poc.phone, '9876543210')
        self.assertTrue(primary_poc.is_active)

        # 2. Add second contact via Client Detail page
        add_contact_resp = self.client.post(reverse('client_detail', kwargs={'client_id': new_client.id}), {
            'add_contact': '1',
            'name': 'Rahul Dravid',
            'designation': 'Security Supervisor',
            'phone': '9845012345',
            'email': 'rahul@titan.com'
        })
        self.assertRedirects(add_contact_resp, reverse('client_detail', kwargs={'client_id': new_client.id}))
        self.assertEqual(new_client.contacts.count(), 2)
        second_poc = new_client.contacts.get(name='Rahul Dravid')
        self.assertTrue(second_poc.is_active)

        # 3. Add third contact via API (Quick Add POC on Intake)
        import json
        api_resp = self.client.post(
            reverse('client_contact_create_api', kwargs={'client_id': new_client.id}),
            data=json.dumps({
                'name': 'VVS Laxman',
                'designation': 'Logistics Lead',
                'phone': '9700011223',
                'email': 'laxman@titan.com'
            }),
            content_type='application/json'
        )
        self.assertEqual(api_resp.status_code, 200)
        self.assertTrue(api_resp.json()['success'])
        self.assertEqual(new_client.contacts.count(), 3)

        # 4. Fetch dynamic contacts API for dropdown
        contacts_api_resp = self.client.get(reverse('client_contacts_api', kwargs={'client_id': new_client.id}))
        self.assertEqual(contacts_api_resp.status_code, 200)
        contacts_list = contacts_api_resp.json()['contacts']
        self.assertEqual(len(contacts_list), 3)
        names = [c['name'] for c in contacts_list]
        self.assertIn('Anil Kumble', names)
        self.assertIn('Rahul Dravid', names)
        self.assertIn('VVS Laxman', names)

    def test_admin_device_delete_with_password(self):
        """
        Verify that:
        1. Non-admin users cannot delete a device.
        2. Admin entering incorrect password is rejected and device remains intact.
        3. Admin entering correct password permanently deletes the device and cleans related records.
        4. Audit log is created with responsible admin and deletion reason.
        """
        # Create a test device
        test_dev = Device.objects.create(
            asset_id='CAM-DEL-TEST-01',
            brand_and_model='Nikon Z6 II',
            source_client=self.client_a,
            current_status='AVAILABLE_STORAGE',
            current_custodian_type='STORAGE'
        )

        # 1. Non-admin is blocked
        self.client.login(username='collector1_test', password='password123')
        blocked_resp = self.client.post(reverse('device_delete', kwargs={'device_id': test_dev.id}), {
            'admin_password': 'password123'
        })
        self.assertEqual(blocked_resp.status_code, 302)  # Blocked by admin_required
        self.assertTrue(Device.objects.filter(id=test_dev.id).exists())

        # 2. Admin logs in with wrong password
        self.client.login(username='admin_test', password='password123')
        wrong_pwd_resp = self.client.post(reverse('device_delete', kwargs={'device_id': test_dev.id}), {
            'admin_password': 'wrongpassword'
        })
        self.assertRedirects(wrong_pwd_resp, reverse('device_detail', kwargs={'device_id': test_dev.id}))
        self.assertTrue(Device.objects.filter(id=test_dev.id).exists())

        # 3. Admin enters correct password
        correct_resp = self.client.post(reverse('device_delete', kwargs={'device_id': test_dev.id}), {
            'admin_password': 'password123',
            'deletion_reason': 'Defective sensor unit scrapped'
        })
        self.assertRedirects(correct_resp, reverse('master_inventory'))
        self.assertFalse(Device.objects.filter(id=test_dev.id).exists())

        # 4. Verify audit log
        audit = AuditLog.objects.filter(action='DEVICE_DELETED', record_id=str(test_dev.id)).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.admin)
        self.assertIn('CAM-DEL-TEST-01', audit.safe_metadata)
        self.assertIn('Defective sensor unit scrapped', audit.safe_metadata)


class DynamicObjectFieldBuilderTests(TestCase):
    """
    Comprehensive acceptance and unit test suite for Salesforce-style
    dynamic object and field builder, metadata engine, cascading lookups,
    and mass camera assignment bulk workflows.
    """
    def setUp(self):
        # Users
        self.admin = User.objects.create_user(
            username='admin_builder',
            password='password123',
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            is_active=True,
            is_profile_completed=True,
            approval_status='APPROVED'
        )
        self.manager = User.objects.create_user(
            username='manager_builder',
            password='password123',
            role='MANAGEMENT',
            is_active=True,
            is_profile_completed=True,
            approval_status='APPROVED'
        )
        self.postman = User.objects.create_user(
            username='postman_builder',
            password='password123',
            role='POSTMAN',
            is_active=True,
            is_profile_completed=True,
            approval_status='APPROVED'
        )

        # Seed initial objects and fields
        seed_initial_objects_and_fields()

        # Core test data
        self.client_a = ClientCompany.objects.create(
            name='Acme Security Corp',
            code='ACM-99',
            address='100 Tech Blvd',
            city='Bangalore',
            state='Karnataka',
            pin_code='560001'
        )
        self.client_b = ClientCompany.objects.create(
            name='Global Media Ltd',
            code='GML-88',
            address='200 Press Ave',
            city='Mumbai',
            state='Maharashtra',
            pin_code='400001'
        )
        self.contact_a1 = ClientContact.objects.create(
            client=self.client_a,
            name='Priya Sharma',
            phone='9811122233',
            email='priya@acme.com',
            designation='Security Manager'
        )
        self.contact_a2 = ClientContact.objects.create(
            client=self.client_a,
            name='Rohan Verma',
            phone='9822233344',
            email='rohan@acme.com',
            designation='Operations Lead'
        )
        self.contact_b1 = ClientContact.objects.create(
            client=self.client_b,
            name='Vikram Patel',
            phone='9833344455',
            email='vikram@global.com',
            designation='Field Director'
        )

        self.employer = EmployerCompany.objects.create(
            name='Apex Staffing Solutions',
            code='APX-77',
            address='7th Cross Road',
            contact_details='ops@apex.com'
        )
        self.worker = Worker.objects.create(
            worker_id='WRK-BUILDER-01',
            name='Arjun Das',
            phone='9844455566',
            employer_company=self.employer,
            aadhaar_number='1234-5678-9999',
            bank_account_number='987654321111'
        )

        self.dev1 = Device.objects.create(
            asset_id='DEV-MASS-01',
            brand_and_model='Axon Body 3',
            imei_or_serial='AXON-1001',
            source_client=self.client_a,
            current_status='AVAILABLE_STORAGE',
            current_custodian_type='STORAGE'
        )
        self.dev2 = Device.objects.create(
            asset_id='DEV-MASS-02',
            brand_and_model='Axon Body 3',
            imei_or_serial='AXON-1002',
            source_client=self.client_a,
            current_status='AVAILABLE_STORAGE',
            current_custodian_type='STORAGE'
        )

        self.client_test = Client()

    def test_seed_initial_objects_and_fields(self):
        """
        Verify that all standard business entities are properly seeded
        with their system designations and active fields.
        """
        expected_apis = ['client', 'client_contact', 'worker', 'employer_company', 'postman', 'mass_camera_assignment']
        for api in expected_apis:
            obj = ObjectDefinition.objects.filter(api_name=api).first()
            self.assertIsNotNone(obj, f"ObjectDefinition '{api}' was not seeded.")
            self.assertTrue(obj.is_system)
            self.assertTrue(obj.is_active)
            self.assertTrue(obj.fields.filter(is_active=True).exists(), f"Object '{api}' has no active fields.")

    def test_studio_access_permissions(self):
        """
        Verify role-based access control for Object and Field Setup Studio:
        - Admin has full access (200 OK)
        - Management is blocked (redirects to dashboard)
        - Postman is blocked (redirects to dashboard)
        - Unauthenticated user redirects to login
        """
        studio_url = reverse('builder_studio')

        # 1. Admin access
        self.client_test.login(username='admin_builder', password='password123')
        admin_resp = self.client_test.get(studio_url)
        self.assertEqual(admin_resp.status_code, 200)
        self.assertIn('Object & Field Builder', admin_resp.content.decode())

        # 2. Management blocked
        self.client_test.login(username='manager_builder', password='password123')
        mgr_resp = self.client_test.get(studio_url)
        self.assertEqual(mgr_resp.status_code, 302)
        self.assertRedirects(mgr_resp, reverse('dashboard'))

        # 3. Postman blocked
        self.client_test.login(username='postman_builder', password='password123')
        post_resp = self.client_test.get(studio_url)
        self.assertEqual(post_resp.status_code, 302)
        self.assertRedirects(post_resp, reverse('dashboard'))

        # 4. Unauthenticated redirects to login
        self.client_test.logout()
        anon_resp = self.client_test.get(studio_url)
        self.assertEqual(anon_resp.status_code, 302)
        self.assertIn('/login/', anon_resp.url)

    def test_add_mandatory_field_and_validation(self):
        """
        Verify that adding a mandatory custom field enforces validation:
        - Empty submission is rejected with field error
        - Invalid format (e.g. phone) is rejected
        - Valid submission saves properly into custom_fields JSON
        """
        contact_obj = ObjectDefinition.objects.get(api_name='client_contact')

        # Add mandatory phone field
        custom_f = FieldDefinition.objects.create(
            object_definition=contact_obj,
            label='Emergency Contact Phone',
            api_name='emergency_phone',
            field_type='phone',
            is_required=True,
            display_order=50
        )

        self.client_test.login(username='admin_builder', password='password123')
        create_url = reverse('dynamic_record_create', kwargs={'api_name': 'client_contact'})

        # 1. Missing mandatory field
        payload_missing = {
            'name': 'Dev Sharma',
            'client': str(self.client_a.id),
            'phone': '9876543210',
            'email': 'dev@acme.com',
            'emergency_phone': ''
        }
        resp_missing = self.client_test.post(create_url, payload_missing)
        self.assertEqual(resp_missing.status_code, 200)
        self.assertIn('Emergency Contact Phone is required', resp_missing.content.decode())
        self.assertFalse(ClientContact.objects.filter(name='Dev Sharma').exists())

        # 2. Invalid phone format
        payload_invalid = payload_missing.copy()
        payload_invalid['emergency_phone'] = '12345'
        resp_invalid = self.client_test.post(create_url, payload_invalid)
        self.assertEqual(resp_invalid.status_code, 200)
        self.assertIn('10-digit Indian mobile number', resp_invalid.content.decode())

        # 3. Valid submission
        payload_valid = payload_missing.copy()
        payload_valid['emergency_phone'] = '9812345678'
        resp_valid = self.client_test.post(create_url, payload_valid)
        self.assertEqual(resp_valid.status_code, 302)

        created_contact = ClientContact.objects.filter(name='Dev Sharma').first()
        self.assertIsNotNone(created_contact)
        self.assertEqual(created_contact.custom_fields.get('emergency_phone'), '9812345678')

    def test_optional_field_submission(self):
        """
        Verify that an optional field can be omitted without validation error.
        """
        client_obj = ObjectDefinition.objects.get(api_name='client')

        FieldDefinition.objects.create(
            object_definition=client_obj,
            label='Secondary Notes',
            api_name='secondary_notes',
            field_type='textarea',
            is_required=False,
            display_order=60
        )

        self.client_test.login(username='admin_builder', password='password123')
        create_url = reverse('dynamic_record_create', kwargs={'api_name': 'client'})

        # Submit without optional field
        payload = {
            'name': 'Zeta Logistics Corp',
            'code': 'ZLC-01',
            'address': '55 Ring Road',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'pin_code': '600001',
            'status': 'ACTIVE'
        }
        resp = self.client_test.post(create_url, payload)
        self.assertEqual(resp.status_code, 302)

        created_client = ClientCompany.objects.filter(code='ZLC-01').first()
        self.assertIsNotNone(created_client)
        self.assertNotIn('secondary_notes', created_client.custom_fields)

        # Submit with optional field
        payload2 = payload.copy()
        payload2['code'] = 'ZLC-02'
        payload2['name'] = 'Zeta Logistics Branch 2'
        payload2['secondary_notes'] = 'Key Client Account'
        resp2 = self.client_test.post(create_url, payload2)
        self.assertEqual(resp2.status_code, 302)

        created_client2 = ClientCompany.objects.filter(code='ZLC-02').first()
        self.assertIsNotNone(created_client2)
        self.assertEqual(created_client2.custom_fields.get('secondary_notes'), 'Key Client Account')

    def test_picklist_choices_validation(self):
        """
        Verify that picklist (select) fields reject invalid options
        and accept configured choices.
        """
        client_obj = ObjectDefinition.objects.get(api_name='client')

        tier_field = FieldDefinition.objects.create(
            object_definition=client_obj,
            label='Service Tier',
            api_name='service_tier',
            field_type='select',
            is_required=True,
            display_order=70
        )
        FieldChoice.objects.create(field_definition=tier_field, value='PLATINUM', label='Platinum Tier', display_order=1)
        FieldChoice.objects.create(field_definition=tier_field, value='GOLD', label='Gold Tier', display_order=2)

        self.client_test.login(username='admin_builder', password='password123')
        create_url = reverse('dynamic_record_create', kwargs={'api_name': 'client'})

        base_payload = {
            'name': 'Tiered Client',
            'code': 'TIER-01',
            'address': '77 Market Road',
            'city': 'Delhi',
            'state': 'Delhi',
            'pin_code': '110001',
            'status': 'ACTIVE'
        }

        # Invalid choice
        bad_payload = base_payload.copy()
        bad_payload['service_tier'] = 'BRONZE'
        bad_resp = self.client_test.post(create_url, bad_payload)
        self.assertEqual(bad_resp.status_code, 200)
        self.assertIn('Invalid option selected for', bad_resp.content.decode())

        # Valid choice
        good_payload = base_payload.copy()
        good_payload['service_tier'] = 'PLATINUM'
        good_resp = self.client_test.post(create_url, good_payload)
        self.assertEqual(good_resp.status_code, 302)

        saved = ClientCompany.objects.filter(code='TIER-01').first()
        self.assertIsNotNone(saved)
        self.assertEqual(saved.custom_fields.get('service_tier'), 'PLATINUM')
        self.assertIsNotNone(saved)
        self.assertEqual(saved.custom_fields.get('service_tier'), 'PLATINUM')

    def test_protected_system_field_cannot_be_overwritten(self):
        """
        Verify that system protected attributes (role, asset_id, current_status)
        cannot be hijacked as custom field API names.
        """
        self.client_test.login(username='admin_builder', password='password123')
        field_create_url = reverse('builder_field_create', kwargs={'api_name': 'client'})

        resp = self.client_test.post(field_create_url, {
            'label': 'Asset Identifier',
            'api_name': 'asset_id',
            'field_type': 'text'
        })
        self.assertEqual(resp.status_code, 302)

        # Field should NOT be created with protected api_name
        self.assertFalse(FieldDefinition.objects.filter(object_definition__api_name='client', api_name='asset_id').exists())

    def test_deactivating_field_preserves_historical_data(self):
        """
        Verify that deactivating a field hides it from active form entry
        while leaving previously stored data intact.
        """
        client_obj = ObjectDefinition.objects.get(api_name='client')
        field = FieldDefinition.objects.create(
            object_definition=client_obj,
            label='Historical Code',
            api_name='historical_code',
            field_type='text',
            is_required=False,
            is_active=True
        )

        # Save record with data
        c = ClientCompany.objects.create(
            name='Historical Co',
            code='HIST-01',
            address='Old Street',
            city='Pune',
            state='Maharashtra',
            pin_code='411001',
            custom_fields={'historical_code': 'OLD-VAL-99'}
        )

        # Deactivate field
        field.is_active = False
        field.save()

        # Check active fields excludes it
        active_api_names = [f.api_name for f in client_obj.active_fields]
        self.assertNotIn('historical_code', active_api_names)

        # Verify record still contains historical value
        c.refresh_from_db()
        self.assertEqual(c.custom_fields.get('historical_code'), 'OLD-VAL-99')

    def test_cascading_client_contacts_api(self):
        """
        Verify that the cascading contacts API endpoint filters contacts
        strictly according to the chosen client_id.
        """
        self.client_test.login(username='admin_builder', password='password123')
        api_url = reverse('cascading_client_contacts_api')

        # Filter by Client A
        resp_a = self.client_test.get(f"{api_url}?client_id={self.client_a.id}")
        self.assertEqual(resp_a.status_code, 200)
        data_a = resp_a.json()
        self.assertTrue(data_a['success'])
        contacts_a = data_a['contacts']
        self.assertEqual(len(contacts_a), 2)
        names_a = [c['name'] for c in contacts_a]
        self.assertIn('Priya Sharma', names_a)
        self.assertIn('Rohan Verma', names_a)
        self.assertNotIn('Vikram Patel', names_a)

        # Filter by Client B
        resp_b = self.client_test.get(f"{api_url}?client_id={self.client_b.id}")
        self.assertEqual(resp_b.status_code, 200)
        data_b = resp_b.json()
        contacts_b = data_b['contacts']
        self.assertEqual(len(contacts_b), 1)
        self.assertEqual(contacts_b[0]['name'], 'Vikram Patel')

    def test_mass_camera_assignment_atomic_batch(self):
        """
        Verify the Mass Camera Assignment bulk workflow:
        - Atomic batch creates individual Assignment records per device
        - Atomic batch creates individual DeviceMovement audit records
        - Devices status changes to ASSIGNED_WORKER with target worker custodian
        """
        self.client_test.login(username='admin_builder', password='password123')

        success, msg, batch = execute_mass_camera_assignment(
            user=self.admin,
            device_ids=[self.dev1.id, self.dev2.id],
            worker_id=self.worker.id,
            notes="Election Duty Batch Alpha",
            expected_return_date=timezone.now().date()
        )

        self.assertTrue(success)
        self.assertIsNotNone(batch)
        self.assertEqual(batch.status, 'COMPLETED')
        self.assertEqual(batch.successful_assignments, 2)
        self.assertEqual(batch.failed_assignments, 0)

        # Verify individual Assignment records
        assignments = Assignment.objects.filter(worker=self.worker, status='ACTIVE')
        self.assertEqual(assignments.count(), 2)
        assigned_dev_ids = {a.device_id for a in assignments}
        self.assertIn(self.dev1.id, assigned_dev_ids)
        self.assertIn(self.dev2.id, assigned_dev_ids)

        # Verify individual DeviceMovement audit logs
        movements = DeviceMovement.objects.filter(related_transaction_type='ASSIGNMENT', actor=self.admin)
        self.assertGreaterEqual(movements.count(), 2)

        # Verify device custody updated
        self.dev1.refresh_from_db()
        self.dev2.refresh_from_db()
        self.assertEqual(self.dev1.current_status, 'ASSIGNED_WORKER')
        self.assertEqual(self.dev1.current_custodian_worker, self.worker)
        self.assertEqual(self.dev2.current_status, 'ASSIGNED_WORKER')
        self.assertEqual(self.dev2.current_custodian_worker, self.worker)

    def test_mass_camera_assignment_skips_unavailable_device(self):
        """
        Verify that devices already assigned or in inspection are rejected
        during mass assignment, with exceptions recorded in batch report.
        """
        # dev1 is already assigned
        self.dev1.current_status = 'ASSIGNED_WORKER'
        self.dev1.save()

        # dev2 is available
        self.assertEqual(self.dev2.current_status, 'AVAILABLE_STORAGE')

        success, msg, batch = execute_mass_camera_assignment(
            user=self.admin,
            device_ids=[self.dev1.id, self.dev2.id],
            worker_id=self.worker.id,
            notes="Partial Test Batch"
        )

        self.assertTrue(success)
        self.assertEqual(batch.status, 'PARTIAL')
        self.assertEqual(batch.successful_assignments, 1)
        self.assertEqual(batch.failed_assignments, 1)

        # Verify report has failure reason
        summary = batch.summary_report
        dev1_row = next(r for r in summary if r['device_id'] == self.dev1.id)
        self.assertFalse(dev1_row['success'])
        self.assertIn('cannot be assigned', dev1_row['reason'])

    def test_mass_camera_assignment_csv_export(self):
        """
        Verify that the mass assignment CSV export endpoint returns
        valid CSV with headers and row data.
        """
        success, msg, batch = execute_mass_camera_assignment(
            user=self.admin,
            device_ids=[self.dev1.id],
            worker_id=self.worker.id,
            notes="CSV Export Batch"
        )
        self.assertTrue(success)

        self.client_test.login(username='admin_builder', password='password123')
        export_url = reverse('mass_assignment_export_csv', kwargs={'batch_id': batch.batch_id})
        resp = self.client_test.get(export_url)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp['Content-Type'], 'text/csv')
        self.assertIn(f'attachment; filename="Mass_Assignment_{batch.batch_id}.csv"', resp['Content-Disposition'])
        content = resp.content.decode()
        self.assertIn('Batch ID', content)
        self.assertIn(batch.batch_id, content)
        self.assertIn('DEV-MASS-01', content)





