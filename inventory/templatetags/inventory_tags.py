from django import template

register = template.Library()

@register.filter(name='dict_get')
def dict_get(dictionary, key):
    """
    Safely retrieves a value from a dictionary or QueryDict by key in Django templates.
    Usage: {{ data|dict_get:field.api_name }}
    """
    if not dictionary:
        return ''
    try:
        if isinstance(dictionary, dict) or hasattr(dictionary, 'get'):
            val = dictionary.get(key)
            if val is None and isinstance(key, str) and key.isdigit():
                val = dictionary.get(int(key))
            return val if val is not None else ''
        elif hasattr(dictionary, '__getitem__'):
            return dictionary[key]
    except Exception:
        return ''
    return ''

@register.filter(name='get_item')
def get_item(dictionary, key):
    """
    Alias for dict_get.
    """
    return dict_get(dictionary, key)
