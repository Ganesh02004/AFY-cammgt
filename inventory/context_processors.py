from django.conf import settings
from .models import User

def global_context(request):
    pending_approvals_count = 0
    if hasattr(request, 'user') and request.user.is_authenticated and getattr(request.user, 'is_admin', False):
        try:
            pending_approvals_count = User.objects.filter(is_active=False).count()
        except Exception:
            pass

    return {
        'APP_NAME': getattr(settings, 'APP_NAME', 'AFY (Any Thing For You) Camera Inventory Management'),
        'APP_SHORT_NAME': getattr(settings, 'APP_SHORT_NAME', 'AFY Camera Inventory'),
        'GOOGLE_MAPS_API_KEY': getattr(settings, 'GOOGLE_MAPS_API_KEY', ''),
        'FIREBASE_WEB_CONFIG': getattr(settings, 'FIREBASE_WEB_CONFIG', {}),
        'FIREBASE_PROJECT_ID': getattr(settings, 'FIREBASE_PROJECT_ID', 'afy-camera-inventory'),
        'pending_approvals_count': pending_approvals_count,
    }
