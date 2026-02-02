# Dockerfile corregido
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /codigo_proyecto

# Copia e instala dependencias
COPY req.txt /codigo_proyecto/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r req.txt && \
    pip install --no-cache-dir \
      daphne \
      gunicorn \
      celery \
      notebook

# Si quieres forzar el symlink, usa -f; si python3 ya existe, este paso no fallará:
## RUN ln -sf /usr/local/bin/python /usr/local/bin/python3

# Copia el código y el entrypoint
COPY . /codigo_proyecto/
COPY entrypoint.sh /codigo_proyecto/entrypoint.sh
RUN chmod +x /codigo_proyecto/entrypoint.sh

ENTRYPOINT ["/codigo_proyecto/entrypoint.sh"]

# Por defecto ejecuta el servidor web (Daphne)
# Para Celery worker: docker run <image> celery-worker
# Para Celery beat: docker run <image> celery-beat
CMD ["web"]
