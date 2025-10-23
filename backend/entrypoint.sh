#!/bin/sh
set -e

# Carga variables del .env
export $(grep -v '^#' /codigo_proyecto/.env | xargs)

echo ">>> Ejecutando collectstatic..."
python manage.py collectstatic --noinput

echo ">>> Iniciando servidor ASGI..."
exec daphne -b 0.0.0.0 -p 8000 sw_erp.asgi:application
