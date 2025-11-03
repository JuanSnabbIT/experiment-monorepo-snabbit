# Instrucciones de tareas (VS Code)

## Directivas operativas para la IA

- La IA debe, en Windows, invocar el backend con `backend/ENV/Scripts/python.exe` (cwd: `backend/`).
- La IA debe preferir tareas de VS Code existentes en `/.vscode/tasks.json` (evitar comandos manuales si hay tarea equivalente).
- La IA debe mostrar comandos en bloques `cmd` y una línea por comando cuando sea necesario documentarlos.
- La IA debe validar que Redis esté disponible antes de iniciar Celery/Channels o indicar cómo iniciarlo.

Este proyecto incluye tareas de VS Code en `.vscode/tasks.json` para iniciar y operar los servicios locales del monorepo (backend, Celery y frontend).

## Requisitos previos
- Python 3.11+ instalado. El backend usa un entorno virtual local en `backend/ENV` que las tareas invocan directamente.
  - Si no existe, créalo e instala dependencias desde la carpeta `backend/`:
    - Windows (cmd): `python -m venv ENV && ENV\\Scripts\\activate && pip install -r req.txt`
    - Alternativa sin activar: `ENV\\Scripts\\python.exe -m pip install -r req.txt`
- Node.js y npm instalados, dependencias en `frontend/` (`npm install`).
- Redis disponible localmente (servicio o contenedor) si vas a usar Celery/Channels.

## Tareas disponibles
- Backend:
  - "Backend: Runserver" — inicia `python manage.py runserver` en `backend/`.
  - "Backend: Daphne (ASGI)" — inicia Daphne con `sw_erp.asgi:application` (ASGI + Channels).
  - "Backend: Celery Worker" — inicia el worker de Celery.
  - "Backend: Celery Beat" — inicia el scheduler de tareas programadas.
  - "Backend: Make Migrations" — ejecuta `makemigrations`.
  - "Backend: Migrate" — ejecuta `migrate`.
  - "Backend: Run Tests" — ejecuta los tests de Django.
- Frontend:
  - "Frontend: Dev Server" — inicia Vite en modo desarrollo (`npm run dev`).
  - "Frontend: Build" — construye el frontend (`npm run build`).
  - "Frontend: Test" — ejecuta los tests (`npm run test`) si está configurado.
- Compuestos:
  - "Start: Backend (Runserver + Celery)" — levanta runserver, worker y beat en paralelo.
  - "Start: All (Backend + Frontend)" — levanta backend (runserver+celery) y frontend en paralelo.

## Uso sugerido
1. Ejecuta "Backend: Make Migrations" y "Backend: Migrate" si has modificado modelos.
2. Ejecuta "Start: All (Backend + Frontend)" para entorno de desarrollo completo.
3. Para producción o pruebas de ASGI: usa "Backend: Daphne (ASGI)" en lugar de runserver.

## Notas y consejos
- Las tareas de backend usan explícitamente `backend/ENV/Scripts/python.exe` y ejecutan módulos (`-m daphne`, `-m celery`) para evitar problemas de PATH. Asegúrate de tener el entorno en esa ruta.
- Si tu entorno tiene otro nombre o ubicación, edita `/.vscode/tasks.json` y actualiza la ruta del intérprete.
- Redis es necesario para Celery y Channels; si no está disponible, las tareas de Celery/ASGI pueden fallar.
- Personaliza `tasks.json` si quieres usar puertos distintos o añadir variables de entorno.

## Problemas comunes
- No existe `backend/ENV`: créalo con `python -m venv backend/ENV` desde `backend/` e instala `pip install -r req.txt`.
- Paquetes como Celery/Daphne no encontrados: instala dependencias en el entorno (`backend/ENV/Scripts/python.exe -m pip install -r req.txt`).
- Redis no disponible: ejecuta Redis localmente (Docker o servicio) y ajusta `REDIS_HOST`/`REDIS_PORT`.
- Errores de CORS/CSRF: revisa `settings.py` (CORS y CSRF_TRUSTED_ORIGINS) y la URL del frontend (`VITE_API_URL`).