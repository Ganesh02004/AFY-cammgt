import os
from django import forms
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from .models import (
    ClientCompany, ClientContact, EmployerCompany, Worker,
    Device, Assignment, Transfer, DeviceReturn, Task, Incident
)
from .validators import clean_indian_phone, validate_indian_mobile, validate_email_address

User = get_user_model()


class DeviceIntakeRowForm(forms.Form):
    asset_id = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': 'Leave blank to auto-generate (e.g. CAM-2026-0001)'
    }))
    device_type = forms.ChoiceField(choices=Device.DEVICE_TYPE_CHOICES, widget=forms.Select(attrs={'class': 'form-select'}))
    brand_and_model = forms.CharField(max_length=150, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': 'e.g. Sony Alpha 7 IV / Samsung S22'
    }))
    imei_or_serial = forms.CharField(max_length=100, required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': 'IMEI or Serial Number'
    }))
    condition = forms.ChoiceField(choices=Device.CONDITION_CHOICES, initial='GOOD', widget=forms.Select(attrs={'class': 'form-select'}))
    accessories = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': 'e.g. Charger, USB Cable, Bag, 64GB SD'
    }))
    notes = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': 'Optional condition notes'
    }))
    allow_duplicate_serial = forms.BooleanField(required=False, label="Authorized duplicate/exception serial")


class PickupHeaderForm(forms.Form):
    client = forms.ModelChoiceField(
        queryset=ClientCompany.objects.filter(status='ACTIVE'),
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'client-select'})
    )
    actual_poc = forms.ModelChoiceField(
        queryset=ClientContact.objects.filter(is_active=True),
        required=False,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'poc-select'})
    )
    collecting_user = forms.ModelChoiceField(
        queryset=User.objects.filter(is_active=True),
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    scheduled_time = forms.DateTimeField(
        required=False,
        widget=forms.DateTimeInput(attrs={'class': 'form-input', 'type': 'datetime-local'})
    )
    location = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': 'Pickup Location / Branch Address', 'id': 'id_location'
    }))
    location_address = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'id': 'id_location_address', 'placeholder': 'Pinpointed address on map'
    }))
    latitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_latitude'}))
    longitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_longitude'}))
    pickup_notes = forms.CharField(required=False, widget=forms.Textarea(attrs={
        'class': 'form-textarea', 'rows': 2, 'placeholder': 'General pickup batch notes'
    }))

    def clean(self):
        cleaned_data = super().clean()
        client = cleaned_data.get('client')
        actual_poc = cleaned_data.get('actual_poc')
        if client and actual_poc:
            if actual_poc.client != client:
                raise ValidationError("The selected Contact Person (POC) does not belong to the selected Client Company.")
        return cleaned_data


class AssignmentForm(forms.ModelForm):
    latitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_latitude'}))
    longitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_longitude'}))
    location_address = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'id': 'id_location_address', 'placeholder': 'Handover location / address'
    }))

    class Meta:
        model = Assignment
        fields = ['worker', 'condition', 'accessories', 'acknowledgement', 'expected_return_date', 'notes', 'latitude', 'longitude', 'location_address']
        widgets = {
            'worker': forms.Select(attrs={'class': 'form-select'}),
            'condition': forms.Select(choices=Device.CONDITION_CHOICES, attrs={'class': 'form-select'}),
            'accessories': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Confirm accessories handed over'}),
            'acknowledgement': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'e.g. Worker physically received and acknowledged receipt.'}),
            'expected_return_date': forms.DateInput(attrs={'class': 'form-input', 'type': 'date'}),
            'notes': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Operational remarks'}),
        }


class TransferInitiateForm(forms.ModelForm):
    latitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_latitude'}))
    longitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_longitude'}))
    location_address = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'id': 'id_location_address', 'placeholder': 'Transfer handover location'
    }))

    class Meta:
        model = Transfer
        fields = ['receiver', 'condition', 'notes', 'latitude', 'longitude', 'location_address']
        widgets = {
            'receiver': forms.Select(attrs={'class': 'form-select'}),
            'condition': forms.Select(choices=Device.CONDITION_CHOICES, attrs={'class': 'form-select'}),
            'notes': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Reason for transfer / handover remarks'}),
        }


class ReturnProcessForm(forms.ModelForm):
    latitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_latitude'}))
    longitude = forms.FloatField(required=False, widget=forms.HiddenInput(attrs={'id': 'id_longitude'}))
    location_address = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'form-input', 'id': 'id_location_address', 'placeholder': 'Return collection location'
    }))

    class Meta:
        model = DeviceReturn
        fields = ['worker', 'condition', 'accessories', 'notes', 'evidence', 'latitude', 'longitude', 'location_address']
        widgets = {
            'worker': forms.Select(attrs={'class': 'form-select'}),
            'condition': forms.Select(choices=Device.CONDITION_CHOICES, attrs={'class': 'form-select'}),
            'accessories': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Accessories returned with device'}),
            'notes': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Worker comments / return notes'}),
            'evidence': forms.ClearableFileInput(attrs={'class': 'form-file'}),
        }


class InspectionCompleteForm(forms.Form):
    inspection_result = forms.ChoiceField(
        choices=DeviceReturn.INSPECTION_RESULT_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    outcome = forms.ChoiceField(
        choices=DeviceReturn.OUTCOME_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    notes = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3, 'placeholder': 'Detailed technician inspection remarks'})
    )


class AuditedAdjustmentForm(forms.Form):
    new_status = forms.ChoiceField(
        choices=Device.STATUS_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    new_custodian_type = forms.ChoiceField(
        choices=Device.CUSTODIAN_TYPE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'custodian-type-select'})
    )
    new_custodian_user = forms.ModelChoiceField(
        queryset=User.objects.filter(is_active=True),
        required=False,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'user-custodian-select'})
    )
    new_custodian_worker = forms.ModelChoiceField(
        queryset=Worker.objects.all(),
        required=False,
        widget=forms.Select(attrs={'class': 'form-select', 'id': 'worker-custodian-select'})
    )
    reason = forms.CharField(
        required=True,
        min_length=5,
        widget=forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3, 'placeholder': 'Mandatory audited justification for this manual adjustment.'})
    )


class IncidentReportForm(forms.ModelForm):
    class Meta:
        model = Incident
        fields = ['device', 'incident_type', 'notes', 'evidence']
        widgets = {
            'device': forms.Select(attrs={'class': 'form-select'}),
            'incident_type': forms.Select(attrs={'class': 'form-select'}),
            'notes': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 4, 'placeholder': 'Detailed incident description (loss location, damage cause, etc.)'}),
            'evidence': forms.ClearableFileInput(attrs={'class': 'form-file'}),
        }


class IncidentResolveForm(forms.Form):
    status = forms.ChoiceField(
        choices=[('INVESTIGATING', 'Under Investigation'), ('RESOLVED', 'Resolved')],
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    resolution_notes = forms.CharField(
        widget=forms.Textarea(attrs={'class': 'form-textarea', 'rows': 3, 'placeholder': 'Investigation outcome and corrective measures taken'})
    )


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['title', 'task_type', 'assigned_user', 'client', 'worker', 'device', 'priority', 'status', 'scheduled_time', 'outcome']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. Collect 4 Cameras from Client'}),
            'task_type': forms.Select(attrs={'class': 'form-select'}),
            'assigned_user': forms.Select(attrs={'class': 'form-select'}),
            'client': forms.Select(attrs={'class': 'form-select'}),
            'worker': forms.Select(attrs={'class': 'form-select'}),
            'device': forms.Select(attrs={'class': 'form-select'}),
            'priority': forms.Select(attrs={'class': 'form-select'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
            'scheduled_time': forms.DateTimeInput(attrs={'class': 'form-input', 'type': 'datetime-local'}),
            'outcome': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Outcome / resolution notes'}),
        }


class ClientCompanyForm(forms.ModelForm):
    # Optional Primary POC fields upon company creation
    poc_name = forms.CharField(
        required=False,
        label="Primary Contact Name",
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Full Name of primary contact'})
    )
    poc_designation = forms.CharField(
        required=False,
        label="Designation",
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. Store Manager / Branch Lead'})
    )
    poc_phone = forms.CharField(
        required=False,
        label="Mobile Phone",
        widget=forms.TextInput(attrs={
            'class': 'form-input', 'placeholder': '10-digit mobile (e.g. 9876543210)',
            'pattern': '[6-9][0-9]{9}', 'maxlength': '10'
        })
    )
    poc_email = forms.EmailField(
        required=False,
        label="Email Address",
        widget=forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'contact@client.com'})
    )

    class Meta:
        model = ClientCompany
        fields = ['name', 'code', 'address', 'city', 'state', 'pin_code', 'status']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Company or Store Name'}),
            'code': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. CLI-002'}),
            'address': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2, 'placeholder': 'Street Address / Branch Location'}),
            'city': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'City'}),
            'state': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'State'}),
            'pin_code': forms.TextInput(attrs={'class': 'form-input', 'placeholder': '6-digit PIN code'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
        }

    def clean_poc_phone(self):
        phone = self.cleaned_data.get('poc_phone', '').strip()
        if phone:
            cleaned = clean_indian_phone(phone)
            validate_indian_mobile(cleaned)
            return cleaned
        return ''


class ClientContactForm(forms.ModelForm):
    is_active = forms.BooleanField(required=False, initial=True, widget=forms.CheckboxInput(attrs={'class': 'form-checkbox'}))

    class Meta:
        model = ClientContact
        fields = ['client', 'name', 'designation', 'phone', 'email', 'is_active']
        widgets = {
            'client': forms.Select(attrs={'class': 'form-select'}),
            'name': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Full Name'}),
            'designation': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. Store Manager, POC'}),
            'phone': forms.TextInput(attrs={
                'class': 'form-input', 'placeholder': '10-digit mobile (e.g. 9876543210)',
                'pattern': '[6-9][0-9]{9}', 'maxlength': '10'
            }),
            'email': forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'email@example.com'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if 'client' in self.fields:
            self.fields['client'].required = False
        if 'is_active' in self.fields:
            self.fields['is_active'].initial = True


    def clean_phone(self):
        phone = self.cleaned_data.get('phone', '').strip()
        if phone:
            cleaned = clean_indian_phone(phone)
            validate_indian_mobile(cleaned)
            return cleaned
        return ''

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        if email:
            validate_email_address(email)
        return email



class EmployerCompanyForm(forms.ModelForm):
    class Meta:
        model = EmployerCompany
        fields = ['name', 'code', 'address', 'contact_details', 'status']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-input'}),
            'code': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. EMP-002'}),
            'address': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2}),
            'contact_details': forms.TextInput(attrs={'class': 'form-input'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
        }


class WorkerForm(forms.ModelForm):
    class Meta:
        model = Worker
        fields = ['worker_id', 'name', 'phone', 'email', 'address', 'employer_company', 'role_or_status', 'aadhaar_number', 'bank_account_number', 'bank_ifsc', 'upi_id']
        widgets = {
            'worker_id': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'e.g. WRK-1005'}),
            'name': forms.TextInput(attrs={'class': 'form-input'}),
            'phone': forms.TextInput(attrs={
                'class': 'form-input', 'placeholder': '10-digit mobile (e.g. 9876543210)',
                'pattern': '[6-9][0-9]{9}', 'maxlength': '10'
            }),
            'email': forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'worker@example.com'}),
            'address': forms.Textarea(attrs={'class': 'form-textarea', 'rows': 2}),
            'employer_company': forms.Select(attrs={'class': 'form-select'}),
            'role_or_status': forms.TextInput(attrs={'class': 'form-input'}),
            'aadhaar_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': '12-digit Aadhaar'}),
            'bank_account_number': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Bank Account'}),
            'bank_ifsc': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'IFSC Code'}),
            'upi_id': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'UPI ID (e.g. name@upi)'}),
        }

    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        cleaned = clean_indian_phone(phone)
        validate_indian_mobile(cleaned)
        return cleaned

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            validate_email_address(email)
        return email


class UserManagementForm(forms.ModelForm):
    password = forms.CharField(required=False, widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Leave blank to keep existing password'}))

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'role', 'requested_role', 'approval_status', 'phone', 'is_active', 'address', 'work_location']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-input'}),
            'email': forms.EmailInput(attrs={'class': 'form-input'}),
            'first_name': forms.TextInput(attrs={'class': 'form-input'}),
            'last_name': forms.TextInput(attrs={'class': 'form-input'}),
            'role': forms.Select(attrs={'class': 'form-select'}),
            'requested_role': forms.Select(attrs={'class': 'form-select'}),
            'approval_status': forms.Select(attrs={'class': 'form-select'}),
            'phone': forms.TextInput(attrs={
                'class': 'form-input', 'placeholder': '10-digit mobile (e.g. 9876543210)',
                'pattern': '[6-9][0-9]{9}', 'maxlength': '10'
            }),
            'address': forms.TextInput(attrs={'class': 'form-input'}),
            'work_location': forms.TextInput(attrs={'class': 'form-input'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-checkbox'}),
        }

    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone:
            cleaned = clean_indian_phone(phone)
            validate_indian_mobile(cleaned)
            return cleaned
        return ''

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            validate_email_address(email)
        return email


class UserRegistrationForm(forms.Form):
    """
    Self-service registration form for new staff members.
    Presents the 2 selectable operational roles (Management vs Postman/Collector).
    New registrations are set to is_active=False and approval_status='PENDING'
    until explicitly approved by an Admin.
    """
    ROLE_CHOICES = [
        ('MANAGEMENT', 'Management Staff — Inventory oversight, dispatches & inspection approval'),
        ('POSTMAN', 'Postman / Field Collector — Physical pickups, deliveries & returns'),
    ]

    first_name = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'First Name'})
    )
    last_name = forms.CharField(
        max_length=50,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Last Name'})
    )
    username = forms.CharField(
        max_length=30,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Choose a unique username'})
    )
    email = forms.EmailField(
        widget=forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'Official Email Address'})
    )
    phone = forms.CharField(
        max_length=15,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': '10-digit mobile number (e.g. 9876543210)',
            'pattern': '[6-9][0-9]{9}',
            'maxlength': '10'
        })
    )
    role = forms.ChoiceField(
        choices=ROLE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Create a secure password (min. 8 chars)'})
    )
    confirm_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Re-enter your password'})
    )

    def clean_username(self):
        username = self.cleaned_data.get('username', '').strip()
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError(f"The username '{username}' is already taken. Please choose another.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get('email', '').strip()
        validate_email_address(email)
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError(f"An account with email '{email}' already exists.")
        return email

    def clean_phone(self):
        phone = self.cleaned_data.get('phone', '').strip()
        cleaned = clean_indian_phone(phone)
        validate_indian_mobile(cleaned)
        return cleaned

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
        if password and confirm_password and password != confirm_password:
            self.add_error('confirm_password', "Passwords do not match.")
        return cleaned_data

    def save(self):
        cleaned_data = self.cleaned_data
        user = User.objects.create_user(
            username=cleaned_data['username'],
            email=cleaned_data['email'],
            first_name=cleaned_data['first_name'],
            last_name=cleaned_data['last_name'],
            password=cleaned_data['password'],
            role=cleaned_data['role'],
            requested_role=cleaned_data['role'],
            phone=cleaned_data['phone'],
            approval_status='PENDING',
            is_active=False,  # Requires Admin Approval!
            is_profile_completed=False,
            email_verified=False
        )
        return user


class UserProfileCompletionForm(forms.ModelForm):
    """
    Mandatory first-time profile completion form for newly authenticated users.
    Enforces photo upload, Indian mobile validation, requested role, address, and work location.
    """
    first_name = forms.CharField(max_length=50, required=True, widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'First Name'}))
    last_name = forms.CharField(max_length=50, required=True, widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Last Name'}))
    phone = forms.CharField(max_length=15, required=True, widget=forms.TextInput(attrs={
        'class': 'form-input', 'placeholder': '10-digit mobile number', 'pattern': '[6-9][0-9]{9}', 'maxlength': '10'
    }))
    requested_role = forms.ChoiceField(
        choices=User.REQUESTED_ROLE_CHOICES,
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    profile_photo = forms.ImageField(
        required=True,
        widget=forms.FileInput(attrs={'class': 'form-input', 'accept': 'image/*'})
    )
    address = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'class': 'form-input', 'rows': 2, 'placeholder': 'Residential or operational address'})
    )
    work_location = forms.CharField(
        required=False,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Operating area / branch location', 'id': 'selected-address-input'})
    )
    work_latitude = forms.DecimalField(required=False, widget=forms.HiddenInput(attrs={'id': 'selected-lat-input'}))
    work_longitude = forms.DecimalField(required=False, widget=forms.HiddenInput(attrs={'id': 'selected-lng-input'}))

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'requested_role', 'profile_photo', 'address', 'work_location', 'work_latitude', 'work_longitude']

    def clean_profile_photo(self):
        photo = self.cleaned_data.get('profile_photo')
        if not photo:
            raise ValidationError("A profile photograph is required to complete registration.")
        if photo.size > 5 * 1024 * 1024:
            raise ValidationError("Profile photograph file size must not exceed 5 MB.")
        ext = os.path.splitext(photo.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            raise ValidationError("Please upload a valid image file (JPG, PNG, or WEBP).")
        return photo

    def clean_phone(self):
        phone = self.cleaned_data.get('phone', '').strip()
        cleaned = clean_indian_phone(phone)
        validate_indian_mobile(cleaned)
        return cleaned


class UserProfileUpdateForm(forms.ModelForm):
    """
    Allows approved users to view and update their personal details and photograph.
    Cannot modify approved role or approval status.
    """
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'profile_photo', 'address', 'work_location', 'work_latitude', 'work_longitude']
        widgets = {
            'first_name': forms.TextInput(attrs={'class': 'form-input'}),
            'last_name': forms.TextInput(attrs={'class': 'form-input'}),
            'phone': forms.TextInput(attrs={'class': 'form-input', 'pattern': '[6-9][0-9]{9}', 'maxlength': '10'}),
            'profile_photo': forms.FileInput(attrs={'class': 'form-input', 'accept': 'image/*'}),
            'address': forms.Textarea(attrs={'class': 'form-input', 'rows': 2}),
            'work_location': forms.TextInput(attrs={'class': 'form-input', 'id': 'selected-address-input'}),
            'work_latitude': forms.HiddenInput(attrs={'id': 'selected-lat-input'}),
            'work_longitude': forms.HiddenInput(attrs={'id': 'selected-lng-input'}),
        }

    def clean_profile_photo(self):
        photo = self.cleaned_data.get('profile_photo')
        if photo and hasattr(photo, 'size'):
            if photo.size > 5 * 1024 * 1024:
                raise ValidationError("Profile photograph file size must not exceed 5 MB.")
            ext = os.path.splitext(photo.name)[1].lower()
            if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
                raise ValidationError("Please upload a valid image file (JPG, PNG, or WEBP).")
        return photo

    def clean_phone(self):
        phone = self.cleaned_data.get('phone', '').strip()
        if phone:
            cleaned = clean_indian_phone(phone)
            validate_indian_mobile(cleaned)
            return cleaned
        return ''


class ChangePasswordForm(forms.Form):
    old_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Enter your current password'})
    )
    new_password = forms.CharField(
        min_length=8,
        widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Enter new password (min. 8 characters)'})
    )
    confirm_new_password = forms.CharField(
        widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Re-enter new password'})
    )

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_old_password(self):
        old_password = self.cleaned_data.get('old_password')
        if not self.user.check_password(old_password):
            raise ValidationError("Current password is incorrect.")
        return old_password

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get('new_password')
        confirm_new_password = cleaned_data.get('confirm_new_password')
        if new_password and confirm_new_password and new_password != confirm_new_password:
            self.add_error('confirm_new_password', "New passwords do not match.")
        return cleaned_data


class DataPurgeForm(forms.Form):
    PURGE_SCOPE_CHOICES = [
        ('INVENTORY_ONLY', 'Operational Purge: Erase all Devices, Movements, Pickups, Assignments, Returns & Logs (Keeps Clients & Staff Accounts)'),
        ('COMPLETE_FACTORY_RESET', 'Complete Factory Reset: Erase Everything (All Inventory, Transactions, Clients, Workers & Non-Admin Staff Accounts)'),
    ]

    purge_scope = forms.ChoiceField(
        choices=PURGE_SCOPE_CHOICES,
        initial='INVENTORY_ONLY',
        widget=forms.RadioSelect(attrs={'class': 'form-radio'})
    )
    confirm_phrase = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'form-input font-mono',
            'placeholder': 'Type CONFIRM-ERASE-ALL-DATA'
        })
    )
    admin_password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Re-enter your Administrator Password to authorize'
        })
    )

    def __init__(self, user, *args, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_confirm_phrase(self):
        phrase = self.cleaned_data.get('confirm_phrase', '').strip()
        if phrase != 'CONFIRM-ERASE-ALL-DATA':
            raise ValidationError("Confirmation phrase does not match 'CONFIRM-ERASE-ALL-DATA'.")
        return phrase

    def clean_admin_password(self):
        pwd = self.cleaned_data.get('admin_password')
        if not self.user.check_password(pwd):
            raise ValidationError("Incorrect administrator password. Purge operation rejected.")
        return pwd
