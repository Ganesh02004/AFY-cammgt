import time
from django.conf import settings
from django.contrib import auth, messages
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse

SESSION_INACTIVITY_TIMEOUT = 300  # Exactly 5 minutes (300 seconds)

# Endpoints that are background polling or heartbeat and MUST NOT bump the inactivity timer
BACKGROUND_POLLING_URLS = [
    '/api/scanner/session/',  # QR pairing status poller
    '/status/',
    '/api/heartbeat/',
]


class SessionInactivityMiddleware:
    """
    Enforces a strict 5-minute inactivity session expiration policy on the backend.
    Tracks meaningful requests and expires sessions after 300 seconds of inactivity.
    Background pollers/heartbeats do NOT reset the timer.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # If user is not authenticated, continue
        if not request.user.is_authenticated:
            return self.get_response(request)

        # Check for session expiration
        last_activity = request.session.get('last_activity')
        now = time.time()

        if last_activity is not None:
            elapsed = now - last_activity
            if elapsed > SESSION_INACTIVITY_TIMEOUT:
                # Session has expired!
                auth.logout(request)
                request.session.flush()

                # Handle AJAX / JSON API requests
                if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.content_type == 'application/json' or path.startswith('/api/'):
                    return JsonResponse({
                        'error': 'session_expired',
                        'message': 'Your session has expired due to 5 minutes of inactivity. Please log in again.',
                        'redirect': '/login/?expired=1'
                    }, status=401)

                messages.warning(
                    request,
                    "Your session has expired due to 5 minutes of inactivity. Please log in again to continue."
                )
                return redirect('/login/?expired=1')

        # Check if the current request is a background polling URL
        is_background_poll = any(path.startswith(bp) for bp in BACKGROUND_POLLING_URLS)

        # Only update last_activity on meaningful user requests (not background pollers)
        if not is_background_poll:
            request.session['last_activity'] = now

        return self.get_response(request)


class UserProfileAndApprovalMiddleware:
    """
    Guarantees that:
    1. First-time users must complete their profile before accessing protected inventory pages.
    2. Pending users cannot access inventory operations before Admin approval.
    3. Deactivated or rejected accounts are locked out immediately.
    4. Administrators are never locked out.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user
        path = request.path

        if not user.is_authenticated:
            return self.get_response(request)

        # Admin and superusers always bypass profile/approval locks
        if user.is_admin or user.is_superuser:
            return self.get_response(request)

        # Handle deactivated or rejected accounts
        if not user.is_active or user.approval_status in ('DEACTIVATED', 'REJECTED'):
            auth.logout(request)
            request.session.flush()
            messages.error(request, "Your account is not active or has been deactivated by an Administrator.")
            return redirect('login')

        # Allowed routes for pending or incomplete profile users
        if path.startswith('/static/') or path.startswith('/media/') or path == '/logout/' or path.startswith('/api/auth/'):
            return self.get_response(request)

        # Check if profile completion is required
        if not user.is_profile_completed:
            if path != '/complete-profile/':
                return redirect('complete_profile')
            return self.get_response(request)

        # Check if account approval is pending
        if user.is_pending:
            if path != '/pending-approval/':
                return redirect('pending_approval')
            return self.get_response(request)

        # If user is fully approved, prevent them from accessing /pending-approval/ or /complete-profile/ unnecessarily
        if user.is_approved and user.is_profile_completed:
            if path in ('/pending-approval/', '/complete-profile/'):
                return redirect('dashboard')

        return self.get_response(request)
