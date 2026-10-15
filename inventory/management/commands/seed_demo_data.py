from django.core.management.base import BaseCommand
from django.utils import timezone
from inventory.models import (
    User, ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Task, Incident
)
from inventory.services import intake_devices, assign_device_to_worker, initiate_transfer, accept_transfer, process_return, complete_inspection


class Command(BaseCommand):
    help = "Seeds comprehensive demo data for Camera & Device Inventory Portal"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo users...")

        # 1. Users
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@camera-inventory.local",
                "first_name": "Aarav",
                "last_name": "Mehta",
                "role": "ADMIN",
                "is_staff": True,
                "is_superuser": True,
                "phone": "+91 98200 11223"
            }
        )
        admin.set_password("admin123")
        admin.save()

        manager, _ = User.objects.get_or_create(
            username="manager",
            defaults={
                "email": "manager@camera-inventory.local",
                "first_name": "Deepa",
                "last_name": "Nair",
                "role": "MANAGEMENT",
                "is_staff": False,
                "phone": "+91 98200 44556"
            }
        )
        manager.set_password("manager123")
        manager.save()

        collector1, _ = User.objects.get_or_create(
            username="collector1",
            defaults={
                "email": "collector1@camera-inventory.local",
                "first_name": "Rahul",
                "last_name": "Joshi",
                "role": "POSTMAN",
                "is_staff": False,
                "phone": "+91 98200 77889"
            }
        )
        collector1.set_password("collector123")
        collector1.save()

        collector2, _ = User.objects.get_or_create(
            username="collector2",
            defaults={
                "email": "collector2@camera-inventory.local",
                "first_name": "Sunil",
                "last_name": "Verma",
                "role": "POSTMAN",
                "is_staff": False,
                "phone": "+91 98200 99001"
            }
        )
        collector2.set_password("collector123")
        collector2.save()

        self.stdout.write("Seeding clients and contacts...")

        # 2. Clients
        apex, _ = ClientCompany.objects.get_or_create(
            code="APX",
            defaults={
                "name": "Apex Security Solutions",
                "address": "402 Cyber City, Sector 24",
                "city": "Gurugram",
                "state": "Haryana",
                "pin_code": "122002",
                "status": "ACTIVE"
            }
        )
        ClientContact.objects.get_or_create(
            client=apex,
            name="Vikram Sethi",
            defaults={"designation": "Asset Manager", "phone": "+91 98765 43210", "email": "vikram@apexsecurity.in"}
        )

        omni, _ = ClientCompany.objects.get_or_create(
            code="OMN",
            defaults={
                "name": "Omni Express Logistics",
                "address": "Unit 12, Logistics Park, Andheri East",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pin_code": "400069",
                "status": "ACTIVE"
            }
        )
        ClientContact.objects.get_or_create(
            client=omni,
            name="Pooja Kulkarni",
            defaults={"designation": "Operations Lead", "phone": "+91 98765 88990", "email": "pooja@omnielog.com"}
        )

        self.stdout.write("Seeding employer companies and workers...")

        # 3. Employers & Workers
        rapid, _ = EmployerCompany.objects.get_or_create(
            code="RDS",
            defaults={
                "name": "Rapid Dispatch Services",
                "address": "77 Ring Road Industrial Area",
                "contact_details": "dispatch@rapidsvc.com | 011-45678900",
                "status": "ACTIVE"
            }
        )
        bluecollar, _ = EmployerCompany.objects.get_or_create(
            code="BCS",
            defaults={
                "name": "BlueCollar Staffing Solutions",
                "address": "Level 3, Business Gateway, Whitefield",
                "contact_details": "hr@bluecollarstaff.in | 080-23456789",
                "status": "ACTIVE"
            }
        )

        worker1, _ = Worker.objects.get_or_create(
            worker_id="WRK-1001",
            defaults={
                "name": "Amit Sharma",
                "phone": "+91 91234 56780",
                "email": "amit.sharma@example.com",
                "address": "Flat 301, Shanti Nagar, Delhi",
                "employer_company": rapid,
                "role_or_status": "Delivery Associate",
                "aadhaar_number": "4589-1234-9871",
                "bank_account_number": "50100456789123",
                "bank_ifsc": "HDFC0001234",
                "upi_id": "amit@okhdfcbank"
            }
        )

        worker2, _ = Worker.objects.get_or_create(
            worker_id="WRK-1002",
            defaults={
                "name": "Suresh Babu",
                "phone": "+91 91234 56781",
                "email": "suresh.b@example.com",
                "address": "Plot 14, Koramangala, Bengaluru",
                "employer_company": bluecollar,
                "role_or_status": "Field Inspection Executive",
                "aadhaar_number": "9812-4321-5544",
                "bank_account_number": "91800123456789",
                "bank_ifsc": "SBIN0004321",
                "upi_id": "suresh@oksbi"
            }
        )

        worker3, _ = Worker.objects.get_or_create(
            worker_id="WRK-1003",
            defaults={
                "name": "Kiran Deshmukh",
                "phone": "+91 91234 56782",
                "email": "kiran.d@example.com",
                "address": "B-204, Viman Nagar, Pune",
                "employer_company": rapid,
                "role_or_status": "Senior Field Agent",
                "aadhaar_number": "3344-5566-7788",
                "bank_account_number": "10293847561029",
                "bank_ifsc": "ICIC0000987",
                "upi_id": "kiran@icici"
            }
        )

        # 4. Intake batch 1 (3 devices for collector1) -> Acceptance Test 1 scenario
        if not Device.objects.filter(asset_id="CAM-2026-0001").exists():
            self.stdout.write("Intaking 3 devices for collector1...")
            poc1 = apex.contacts.first()
            devices_apex = [
                {
                    "asset_id": "CAM-2026-0001",
                    "device_type": "CAMERA",
                    "brand_and_model": "Sony Alpha 7 IV",
                    "imei_or_serial": "SN-SONY-77801",
                    "accessories": "Charger, Strap, 64GB SD Card, Lens 28-70mm",
                    "condition": "EXCELLENT",
                    "notes": "Intake in pristine condition"
                },
                {
                    "asset_id": "CAM-2026-0002",
                    "device_type": "CAMERA",
                    "brand_and_model": "Canon EOS R6",
                    "imei_or_serial": "SN-CANON-99022",
                    "accessories": "Charger, 2x Batteries, Bag",
                    "condition": "GOOD",
                    "notes": "Minor scuff on body"
                },
                {
                    "asset_id": "CAM-2026-0003",
                    "device_type": "BODYCAM",
                    "brand_and_model": "Axon Body 3",
                    "imei_or_serial": "AXN-33491-X",
                    "accessories": "Dock Mount, Magnetic Clip",
                    "condition": "EXCELLENT",
                    "notes": "Law enforcement spec"
                }
            ]
            intake_devices(
                client=apex,
                collecting_user=collector1,
                devices_data=devices_apex,
                actual_poc=poc1,
                notes="Initial fleet collection from Apex Gurugram"
            )

        # 5. Intake batch 2 (2 devices for manager) -> Acceptance Test 2 scenario
        if not Device.objects.filter(asset_id="DEV-2026-0004").exists():
            self.stdout.write("Intaking 2 devices for manager...")
            poc2 = omni.contacts.first()
            devices_omni = [
                {
                    "asset_id": "DEV-2026-0004",
                    "device_type": "SMARTPHONE",
                    "brand_and_model": "Samsung Galaxy S22 Enterprise",
                    "imei_or_serial": "358901234567891",
                    "accessories": "Fast Charger, Rugged Protective Case",
                    "condition": "GOOD",
                    "notes": "Pre-configured with field tracking app"
                },
                {
                    "asset_id": "DEV-2026-0005",
                    "device_type": "SMARTPHONE",
                    "brand_and_model": "Samsung Galaxy S22 Enterprise",
                    "imei_or_serial": "358901234567892",
                    "accessories": "Fast Charger, Rugged Protective Case",
                    "condition": "EXCELLENT",
                    "notes": "Brand new sealed in box"
                }
            ]
            intake_devices(
                client=omni,
                collecting_user=manager,
                devices_data=devices_omni,
                actual_poc=poc2,
                notes="Omni Logistics batch handover"
            )

        # 6. Assign CAM-2026-0001 to worker1 -> Acceptance Test 3 scenario
        dev1 = Device.objects.filter(asset_id="CAM-2026-0001").first()
        if dev1 and dev1.current_status == 'WITH_COLLECTOR':
            self.stdout.write(f"Assigning {dev1.asset_id} to worker {worker1.name}...")
            assign_device_to_worker(
                device=dev1,
                worker=worker1,
                delivering_user=collector1,
                condition="EXCELLENT",
                accessories=dev1.accessories,
                acknowledgement="Worker Amit Sharma verified equipment and serials on-site.",
                expected_return_date=timezone.now().date() + timezone.timedelta(days=30),
                notes="Assigned for monthly delivery route surveillance."
            )

        # 7. Add a device in Company Storage (Available Stock)
        if not Device.objects.filter(asset_id="CAM-2026-0006").exists():
            dev_storage = Device.objects.create(
                asset_id="CAM-2026-0006",
                device_type="CAMERA",
                brand_and_model="Nikon Z6 II",
                imei_or_serial="SN-NIKON-44331",
                accessories="Battery Charger, 35mm f/1.8 Lens",
                condition="EXCELLENT",
                source_client=apex,
                current_status="AVAILABLE_STORAGE",
                current_custodian_type="STORAGE",
                received_date=timezone.now() - timezone.timedelta(days=10)
            )
            dev_storage.generate_qr_code()
            dev_storage.save(update_fields=['qr_code_image'])

        # 8. Sample Tasks
        Task.objects.get_or_create(
            title="Collect 5 Bodycams from Apex Sector 24",
            assigned_user=collector1,
            defaults={
                "task_type": "PICKUP",
                "client": apex,
                "priority": "HIGH",
                "status": "PENDING",
                "scheduled_time": timezone.now() + timezone.timedelta(hours=4)
            }
        )
        Task.objects.get_or_create(
            title="Inspect returned Samsung S22 at central hub",
            assigned_user=manager,
            defaults={
                "task_type": "INSPECTION",
                "priority": "MEDIUM",
                "status": "PENDING",
                "scheduled_time": timezone.now() + timezone.timedelta(hours=2)
            }
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("Credentials:")
        self.stdout.write("  Admin:      admin / admin123")
        self.stdout.write("  Management: manager / manager123")
        self.stdout.write("  Collector1: collector1 / collector123")
        self.stdout.write("  Collector2: collector2 / collector123")
