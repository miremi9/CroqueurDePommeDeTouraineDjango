import environ

from .base import *

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
    }
}

ADMIN_USERNAME = env("ADMIN_USERNAME")
ADMIN_PASSWORD = env("ADMIN_PASSWORD")
ADMIN_EMAIL = env("ADMIN_EMAIL")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")
SECRET_KEY = env("SECRET_KEY")

MEDIA_URL = "/media/"
MEDIA_ROOT = "/app/uploads"

STATIC_ROOT = BASE_DIR / "staticfiles"

# Nginx termine le TLS et envoie X-Forwarded-Proto
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[f"https://{host}" for host in ALLOWED_HOSTS],
)
