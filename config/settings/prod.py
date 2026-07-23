import environ

from .base import *

env = environ.Env()
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT'),
    }
}
environ.Env.read_env(BASE_DIR / ".env")
ADMIN_USERNAME = env("ADMIN_USERNAME")
ADMIN_PASSWORD = env("ADMIN_PASSWORD")
ADMIN_EMAIL = env("ADMIN_EMAIL")
ALLOWED_HOSTS = env("ALLOWED_HOSTS").split(",")
SECRET_KEY = env("SECRET_KEY")

MEDIA_URL = "/media/"
MEDIA_ROOT = "/app/uploads"

STATIC_ROOT = BASE_DIR / "staticfiles"
