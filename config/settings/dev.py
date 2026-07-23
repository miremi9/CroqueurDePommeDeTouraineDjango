from .base import *

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "0011"
ADMIN_EMAIL = "mymail@gmail.com"

ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
SECRET_KEY = 'django-insecure-w9io2oc$(5r(%hzbx#4&hi)+v77u-@p$#z&6t7ss6j_mp)v411'
