#!/bin/sh

if [ -f /codigo_proyecto/.env ]; then
    echo ">>> Cargando variables de entorno desde .env..."
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ''|\#*) continue ;;
        esac
        key="${line%%=*}"
        # Extraer valor y stripear comillas simples o dobles
        value="${line#*=}"
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        # Solo exportar si la variable NO está ya definida por K8s
        if [ -z "$(eval echo \${$key+x})" ]; then
            export "$key=$value"
        fi
    done < /codigo_proyecto/.env
else
    echo ">>> ADVERTENCIA: No se encontró /codigo_proyecto/.env"
fi

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
        echo ">>> Ejecutando comando personalizado: $@"
        exec "$@"
        ;;
esac