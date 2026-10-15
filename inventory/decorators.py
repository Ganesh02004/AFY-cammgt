from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages
from django.core.exceptions import PermissionDenied


def admin_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not request.user.is_admin:
            messages.error(request, "Access restricted: Administrator privileges required.")
            return redirect('dashboard')
        return view_func(request, *args, **kwargs)
    return _wrapped_view


def management_or_admin_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login')
        if not (request.user.is_admin or request.user.is_management):
            messages.error(request, "Access restricted: Management or Admin privileges required.")
            return redirect('dashboard')
        return view_func(request, *args, **kwargs)
    return _wrapped_view
