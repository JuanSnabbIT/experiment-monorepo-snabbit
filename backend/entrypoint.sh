#!/bin/sh
set -e

# Carga variables del .env (requerido para SMTP, DB, etc.)
if [ -f /codigo_proyecto/.env ]; then
    echo ">>> Cargando variables de entorno desde .env..."
    export $(grep -v '^#' /codigo_proyecto/.env | xargs)
else
    echo ">>> ADVERTENCIA: No se encontró /codigo_proyecto/.env"
fi

# Determina el modo de ejecución basado en el primer argumento
MODE="${1:-web}"

case "$MODE" in
    web)
        echo ">>> Ejecutando collectstatic..."
        python manage.py collectstatic --noinput
        echo ">>> Iniciando servidor ASGI (Daphne)..."
        exec daphne -b 0.0.0.0 -p 8000 sw_erp.asgi:application
        ;;
    celery-worker)
        echo ">>> Iniciando Celery Worker..."
        exec celery -A sw_erp worker --loglevel=info
        ;;
    celery-beat)
        echo ">>> Iniciando Celery Beat..."
        exec celery -A sw_erp beat --loglevel=info
        ;;
    *)
        # Si se pasa un comando arbitrario, ejecutarlo
        echo ">>> Ejecutando comando personalizado: $@"
        exec "$@"
        ;;
esac
