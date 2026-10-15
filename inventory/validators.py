import re
from django.core.exceptions import ValidationError

INDIAN_MOBILE_REGEX = re.compile(r'^[6-9]\d{9}$')
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')


def clean_indian_phone(value):
    """
    Cleans and standardizes an Indian mobile number.
    Strips spaces, hyphens, and leading +91 or 0 if present.
    Ensures the final value is exactly 10 digits starting with 6, 7, 8, or 9.
    """
    if not value:
        return ''
    
    # Remove whitespace, hyphens, parentheses, and dots
    cleaned = re.sub(r'[\s\-\(\)\.]', '', str(value))
    
    # Remove leading +91 or 91 if followed by 10 digits
    if cleaned.startswith('+91') and len(cleaned) == 13:
        cleaned = cleaned[3:]
    elif cleaned.startswith('91') and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith('0') and len(cleaned) == 11:
        cleaned = cleaned[1:]
        
    return cleaned


def validate_indian_mobile(value):
    """
    Validates that a mobile number contains exactly 10 digits
    and follows the Indian mobile number format (starts with 6-9).
    """
    if not value:
        return
    
    cleaned = clean_indian_phone(value)
    
    if not INDIAN_MOBILE_REGEX.match(cleaned):
        raise ValidationError(
            f"Invalid mobile number '{value}'. Mobile number must contain exactly 10 digits starting with 6, 7, 8, or 9 (Indian mobile format)."
        )


def validate_email_address(value):
    """
    Validates email format using rigorous regex.
    """
    if not value:
        return
        
    if not EMAIL_REGEX.match(value.strip()):
        raise ValidationError(
            f"Invalid email address '{value}'. Please enter a valid email format (e.g. user@domain.com)."
        )
