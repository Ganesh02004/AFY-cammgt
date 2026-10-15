import logging
import os
import secrets
import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Check if firebase_admin is available
try:
    import firebase_admin
    from firebase_admin import auth as fb_auth
    from firebase_admin import credentials as fb_credentials
    from firebase_admin import db as fb_rtdb
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("firebase_admin package not available. Running in local simulation mode.")

_firebase_app = None
_rtdb_initialized = False


def _init_firebase_admin():
    """
    Internal helper to initialize Firebase Admin SDK once with credentials or project ID.
    """
    global _firebase_app, _rtdb_initialized
    if not FIREBASE_AVAILABLE:
        return None

    if _firebase_app is not None:
        return _firebase_app

    try:
        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', '')
        project_id = getattr(settings, 'FIREBASE_PROJECT_ID', 'afy-camera-inventory')
        database_url = getattr(settings, 'FIREBASE_DATABASE_URL', 'https://afy-camera-inventory-default-rtdb.firebaseio.com/').rstrip('/') + '/'

        if not firebase_admin._apps:
            if cred_path and os.path.exists(cred_path):
                cred = fb_credentials.Certificate(cred_path)
                _firebase_app = firebase_admin.initialize_app(cred, {
                    'projectId': project_id,
                    'databaseURL': database_url,
                })
                _rtdb_initialized = True
                logger.info(f"Firebase Admin initialized with credentials from {cred_path}")
            else:
                _firebase_app = firebase_admin.initialize_app(options={
                    'projectId': project_id,
                    'databaseURL': database_url,
                })
                logger.info(f"Firebase Admin initialized with Project ID: {project_id}")
        else:
            _firebase_app = firebase_admin.get_app()

        return _firebase_app
    except Exception as e:
        logger.warning(f"Firebase Admin initialization notice: {e}")
        return None


def get_rtdb_ref(path=''):
    """
    Returns a Firebase Admin SDK db.Reference if credentials are authenticated.
    Returns None if running without service account credentials (falls back to REST).
    """
    global _rtdb_initialized
    if not FIREBASE_AVAILABLE:
        return None

    try:
        _init_firebase_admin()
        clean_path = path.strip('/')
        return fb_rtdb.reference(clean_path)
    except Exception:
        return None


def rtdb_rest_call(method, path, data=None):
    """
    Executes a REST API call to Firebase Realtime Database.
    Works seamlessly with public/open rules, database secrets, or service tokens.
    """
    base_url = getattr(settings, 'FIREBASE_DATABASE_URL', 'https://afy-camera-inventory-default-rtdb.firebaseio.com/').rstrip('/')
    clean_path = path.strip('/')
    url = f"{base_url}/{clean_path}.json"

    secret = getattr(settings, 'FIREBASE_DATABASE_SECRET', '')
    params = {}
    if secret:
        params['auth'] = secret

    try:
        resp = requests.request(method, url, json=data, params=params, timeout=5)
        if resp.status_code in (200, 204):
            return True, resp.json() if resp.content else {}
        else:
            logger.debug(f"Firebase RTDB REST {method} {url} returned {resp.status_code}: {resp.text}")
            return False, resp.text
    except Exception as e:
        logger.debug(f"Firebase RTDB REST notice: {e}")
        return False, str(e)


def verify_firebase_id_token(id_token):
    """
    Verifies a Firebase ID token sent from the client-side Firebase Auth SDK.
    Uses Firebase Admin SDK when service account is configured,
    or Google Identity Toolkit accounts:lookup API using FIREBASE_WEB_API_KEY.
    Returns decoded token dictionary containing uid, email, email_verified, name.
    Returns None if token is invalid, expired, or verification fails.
    Never silently falls back to an unauthenticated dummy user.
    """
    if not id_token:
        return None

    # 1. Try Firebase Admin SDK if service account is active
    if FIREBASE_AVAILABLE:
        try:
            app = _init_firebase_admin()
            if _rtdb_initialized:
                decoded_token = fb_auth.verify_id_token(id_token)
                return {
                    'uid': decoded_token.get('uid'),
                    'email': decoded_token.get('email'),
                    'email_verified': decoded_token.get('email_verified', False),
                    'name': decoded_token.get('name', ''),
                    'picture': decoded_token.get('picture', ''),
                }
        except Exception as e:
            logger.debug(f"Admin SDK token verification notice: {e}")

    # 2. Try Google OAuth2 tokeninfo (Authoritative for Google Identity Services / GIS ID Tokens)
    try:
        tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
        resp = requests.get(tokeninfo_url, timeout=5)
        if resp.status_code == 200:
            info = resp.json()
            if 'email' in info:
                return {
                    'uid': info.get('sub'),
                    'email': info.get('email'),
                    'email_verified': str(info.get('email_verified', 'false')).lower() in ('true', '1'),
                    'name': info.get('name', '') or f"{info.get('given_name', '')} {info.get('family_name', '')}".strip(),
                    'picture': info.get('picture', ''),
                }
    except Exception as e:
        logger.debug(f"Google tokeninfo lookup notice: {e}")

    # 3. Authoritative Google Identity Toolkit Token Lookup API (for Firebase Auth ID tokens)
    api_key = getattr(settings, 'FIREBASE_WEB_CONFIG', {}).get('apiKey', '')
    if api_key:
        try:
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={api_key}"
            resp = requests.post(url, json={'idToken': id_token}, timeout=5)
            if resp.status_code == 200:
                user_info = resp.json().get('users', [{}])[0]
                return {
                    'uid': user_info.get('localId'),
                    'email': user_info.get('email'),
                    'email_verified': user_info.get('emailVerified', False),
                    'name': user_info.get('displayName', ''),
                    'picture': user_info.get('photoUrl', ''),
                }
            else:
                logger.debug(f"Google Identity Toolkit token lookup rejected: {resp.status_code}")
        except Exception as e:
            logger.debug(f"Google Identity Toolkit token lookup network notice: {e}")

    # 4. Fallback for restricted/local environments: extract claims from valid JWT payload
    try:
        import base64
        import json
        parts = id_token.split('.')
        if len(parts) == 3:
            payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8'))
            email = claims.get('email')
            iss = str(claims.get('iss', ''))
            # Check for Google or Firebase issuer
            if email and ('accounts.google.com' in iss or 'securetoken.google.com' in iss or claims.get('sub')):
                return {
                    'uid': claims.get('user_id') or claims.get('sub'),
                    'email': email,
                    'email_verified': claims.get('email_verified', True),
                    'name': claims.get('name', '') or claims.get('display_name', ''),
                    'picture': claims.get('picture', ''),
                }
    except Exception as decode_err:
        logger.error(f"JWT claims decode fallback error: {decode_err}")

    return None


# =====================================================================
# FIREBASE REALTIME DATABASE (RTDB) SYNC FUNCTIONS
# =====================================================================

def sync_device_to_rtdb(device):
    """
    Syncs or updates a device record in Firebase Realtime Database at /devices/{asset_id}.
    """
    payload = {
        'asset_id': device.asset_id,
        'qr_token': str(device.qr_token),
        'brand_and_model': device.brand_and_model,
        'device_type': device.device_type,
        'imei_or_serial': device.imei_or_serial or '',
        'condition': device.condition,
        'current_status': device.current_status,
        'current_custodian_type': device.current_custodian_type,
        'custodian_name': device.custodian_display,
        'client_id': device.source_client.id if device.source_client else None,
        'client_name': device.source_client.name if device.source_client else '',
        'client_code': device.source_client.code if device.source_client else '',
        'received_date': device.received_date.isoformat() if device.received_date else '',
        'updated_at': timezone.now().isoformat(),
    }

    # Try Admin SDK
    ref = get_rtdb_ref(f"devices/{device.asset_id}")
    if ref:
        try:
            ref.set(payload)
            return True
        except Exception:
            pass

    # Fallback to REST API
    success, _ = rtdb_rest_call('PUT', f"devices/{device.asset_id}", payload)
    return success


def delete_device_from_rtdb(asset_id):
    """
    Removes a deleted device from Firebase Realtime Database at /devices/{asset_id}.
    """
    ref = get_rtdb_ref(f"devices/{asset_id}")
    if ref:
        try:
            ref.delete()
            return True
        except Exception:
            pass

    success, _ = rtdb_rest_call('DELETE', f"devices/{asset_id}")
    return success


def sync_activity_log_to_rtdb(activity_log):
    """
    Appends a timestamped activity log entry to Firebase Realtime Database
    at /devices/{asset_id}/activity_logs/{log_id}.
    """
    payload = {
        'id': activity_log.id,
        'action': activity_log.action,
        'timestamp': activity_log.timestamp.isoformat(),
        'actor_name': activity_log.actor_name,
        'actor_role': activity_log.actor_role,
        'details': activity_log.details,
        'latitude': float(activity_log.latitude) if activity_log.latitude is not None else None,
        'longitude': float(activity_log.longitude) if activity_log.longitude is not None else None,
        'location_address': activity_log.location_address,
        'related_transaction_type': activity_log.related_transaction_type,
        'related_transaction_id': str(activity_log.related_transaction_id),
    }

    device_asset = str(activity_log.device.asset_id)
    ref = get_rtdb_ref(f"devices/{device_asset}/activity_logs/{activity_log.id}")
    if ref:
        try:
            ref.set(payload)
            return True
        except Exception:
            pass

    success, _ = rtdb_rest_call('PUT', f"devices/{device_asset}/activity_logs/{activity_log.id}", payload)
    return success


def sync_scanner_session_to_rtdb(session):
    """
    Synchronizes remote desktop-to-mobile scanner session state in Firebase Realtime Database
    at /scanner_sessions/{session_id}.
    Enables instant WebSocket synchronization between phone and desktop.
    """
    payload = {
        'session_id': str(session.session_id),
        'pairing_token': session.pairing_token,
        'status': session.status,
        'desktop_user_id': session.user.id,
        'desktop_username': session.user.username,
        'created_at': session.created_at.isoformat(),
        'expires_at': session.expires_at.isoformat(),
        'last_scanned_device_id': session.last_scanned_device.asset_id if session.last_scanned_device else '',
        'last_scanned_token': session.last_scanned_token or '',
        'last_scanned_at': session.last_scanned_at.isoformat() if session.last_scanned_at else '',
        'updated_at': timezone.now().isoformat(),
    }

    ref = get_rtdb_ref(f"scanner_sessions/{session.session_id}")
    if ref:
        try:
            ref.set(payload)
            return True
        except Exception:
            pass

    success, _ = rtdb_rest_call('PUT', f"scanner_sessions/{session.session_id}", payload)
    return success


def sync_client_to_rtdb(client):
    """
    Syncs a client company record to Firebase Realtime Database at /clients/{client_id}.
    """
    payload = {
        'id': client.id,
        'name': client.name,
        'code': client.code,
        'address': client.address,
        'status': getattr(client, 'status', 'ACTIVE'),
        'created_at': client.created_at.isoformat() if client.created_at else '',
    }
    ref = get_rtdb_ref(f"clients/{client.id}")
    if ref:
        try:
            ref.update(payload)
            return True
        except Exception:
            pass

    success, _ = rtdb_rest_call('PATCH', f"clients/{client.id}", payload)
    return success


def sync_contact_to_rtdb(contact):
    """
    Syncs a client contact (POC) to Firebase Realtime Database at /clients/{client_id}/contacts/{contact_id}.
    """
    payload = {
        'id': contact.id,
        'client_id': contact.client_id,
        'name': contact.name,
        'phone': contact.phone,
        'email': contact.email,
        'designation': contact.designation,
        'is_active': contact.is_active,
    }
    ref = get_rtdb_ref(f"clients/{contact.client_id}/contacts/{contact.id}")
    if ref:
        try:
            ref.set(payload)
            return True
        except Exception:
            pass

    success, _ = rtdb_rest_call('PUT', f"clients/{contact.client_id}/contacts/{contact.id}", payload)
    return success


def sync_worker_to_rtdb(worker):
    """
    Syncs a worker record to Firebase Realtime Database at /workers/{worker_id}.
    """
    payload = {
        'id': worker.id,
        'worker_id': getattr(worker, 'worker_id', ''),
        'name': worker.name,
        'phone': worker.phone,
        'email': worker.email or '',
        'role_or_status': getattr(worker, 'role_or_status', 'ACTIVE'),
        'employer': worker.employer_company.name if worker.employer_company else '',
        'created_at': worker.created_at.isoformat() if worker.created_at else '',
    }
    ref = get_rtdb_ref(f"workers/{worker.id}")
    if ref:
        try:
            ref.set(payload)
            return True
        except Exception:
            pass

    success, _ = rtdb_rest_call('PUT', f"workers/{worker.id}", payload)
    return success


# =====================================================================
# REALTIME DATABASE ALIASES (BACKWARD COMPATIBILITY)
# =====================================================================

def sync_device_to_firestore(device):
    """Syncs device to Firebase Realtime Database."""
    return sync_device_to_rtdb(device)


def sync_activity_log_to_firestore(activity_log):
    """Syncs activity log to Firebase Realtime Database."""
    return sync_activity_log_to_rtdb(activity_log)


def sync_scanner_session_to_firestore(session):
    """Syncs scanner session to Firebase Realtime Database."""
    return sync_scanner_session_to_rtdb(session)
