from django.core.management.base import BaseCommand
from inventory.models import ClientCompany, ClientContact, Device, DeviceActivityLog, Worker
from inventory.firebase_service import (
    sync_client_to_rtdb, sync_contact_to_rtdb,
    sync_device_to_rtdb, sync_activity_log_to_rtdb,
    sync_worker_to_rtdb, rtdb_rest_call
)


class Command(BaseCommand):
    help = "Synchronizes all local database records (clients, contacts, devices, workers, logs) to Firebase Realtime Database."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("=== AFY Camera Inventory — Firebase Realtime Database Sync ==="))

        # 0. Test permissions first
        self.stdout.write("Testing write permissions on Firebase Realtime Database...")
        ok, res = rtdb_rest_call('PUT', 'connectivity_check', {'status': 'connected', 'app': 'AFY Camera Inventory'})
        if not ok:
            self.stdout.write(self.style.ERROR(f"\n[BLOCKED] Firebase returned: {res}"))
            self.stdout.write(self.style.WARNING(
                "\nFirebase Realtime Database is rejecting writes because of its Security Rules.\n"
                "To fix this in 30 seconds:\n"
                "1. Open Firebase Console: https://console.firebase.google.com/project/afy-camera-inventory/database/afy-camera-inventory-default-rtdb/rules\n"
                "2. Change the rules to:\n"
                '   {\n     "rules": {\n       ".read": true,\n       ".write": true\n     }\n   }\n'
                "3. Click 'Publish'.\n"
                "4. Then re-run this command: python manage.py sync_to_firebase_rtdb\n\n"
                "Alternatively, download your service account key from:\n"
                "Firebase Console -> Project Settings -> Service Accounts -> Generate new private key\n"
                "and save it as 'firebase-credentials.json' in this folder."
            ))
            return

        self.stdout.write(self.style.SUCCESS("  Write permissions verified! Proceeding with data sync...\n"))

        # 1. Clients & Contacts
        clients = ClientCompany.objects.all()
        self.stdout.write(f"Syncing {clients.count()} Client Companies...")
        for c in clients:
            sync_client_to_rtdb(c)
            for contact in c.contacts.all():
                sync_contact_to_rtdb(contact)
        self.stdout.write(self.style.SUCCESS(f"  Synced {clients.count()} clients and {ClientContact.objects.count()} contacts."))

        # 2. Devices
        devices = Device.objects.select_related('source_client').all()
        self.stdout.write(f"Syncing {devices.count()} Devices...")
        for d in devices:
            sync_device_to_rtdb(d)
        self.stdout.write(self.style.SUCCESS(f"  Synced {devices.count()} devices."))

        # 3. Activity Logs
        logs = DeviceActivityLog.objects.select_related('device').all()
        self.stdout.write(f"Syncing {logs.count()} Device Activity Logs...")
        for l in logs:
            sync_activity_log_to_rtdb(l)
        self.stdout.write(self.style.SUCCESS(f"  Synced {logs.count()} activity logs."))

        # 4. Workers
        workers = Worker.objects.select_related('employer_company').all()
        self.stdout.write(f"Syncing {workers.count()} Workers...")
        for w in workers:
            sync_worker_to_rtdb(w)
        self.stdout.write(self.style.SUCCESS(f"  Synced {workers.count()} workers."))

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] All records successfully synchronized to Firebase Realtime Database!"))
