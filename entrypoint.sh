#!/bin/sh
set -e

uv run python manage.py migrate
uv run python manage.py collectstatic --noinput
uv run python manage.py init_data

exec uv run gunicorn config.wsgi:application --bind 0.0.0.0:8000