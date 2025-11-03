@echo off
REM Script de inicio rápido para desarrollo del ERP
REM Autor: GitHub Copilot
REM Uso: Doble clic en este archivo o ejecutar desde cmd

echo ============================================================
echo Inicio Rapido - ERP Snabbit
echo ============================================================
echo.

REM Verificar que estamos en la raíz del proyecto
if not exist "backend\" (
    echo ERROR: No se encuentra la carpeta backend/
    echo Este script debe ejecutarse desde la raiz del monorepo
    pause
    exit /b 1
)

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no esta instalado o no esta en el PATH
    echo Instala Python 3.11 o superior desde python.org
    pause
    exit /b 1
)

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado o no esta en el PATH
    echo Instala Node.js 18 o superior desde nodejs.org
    pause
    exit /b 1
)

echo [1/5] Verificando entorno virtual de Python...
if not exist "backend\ENV\" (
    echo   Creando entorno virtual...
    cd backend
    python -m venv ENV
    cd ..
    echo   Entorno virtual creado
) else (
    echo   Entorno virtual ya existe
)

echo.
echo [2/5] Instalando dependencias de Python...
cd backend
if not exist "ENV\Scripts\python.exe" (
    echo   ERROR: No se pudo crear el entorno virtual
    cd ..
    pause
    exit /b 1
)
ENV\Scripts\python.exe -m pip install --quiet --upgrade pip
ENV\Scripts\pip.exe install --quiet -r req.txt
echo   Dependencias instaladas
cd ..

echo.
echo [3/5] Aplicando migraciones...
cd backend
ENV\Scripts\python.exe manage.py migrate --no-input
if %errorlevel% neq 0 (
    echo   ERROR: Fallo al aplicar migraciones
    cd ..
    pause
    exit /b 1
)
echo   Migraciones aplicadas
cd ..

echo.
echo [4/5] Instalando dependencias de Node.js...
cd frontend
if not exist "node_modules\" (
    echo   Instalando paquetes npm (esto puede tardar)...
    call npm install --quiet
    echo   Dependencias instaladas
) else (
    echo   Dependencias ya instaladas
)
cd ..

echo.
echo [5/5] Verificando configuracion...
if not exist "backend\db.sqlite3" (
    echo.
    echo   ATENCION: Base de datos vacia
    echo.
    echo   Necesitas crear un superusuario y configurar la empresa.
    echo.
    echo   Opciones:
    echo   1. Manual - Django Admin:
    echo      cd backend
    echo      backend\ENV\Scripts\python.exe manage.py createsuperuser
    echo      backend\ENV\Scripts\python.exe manage.py runserver
    echo      Accede a http://localhost:8000/admin/
    echo.
    echo   2. Automatico - Script de setup:
    echo      cd backend
    echo      backend\ENV\Scripts\python.exe manage.py createsuperuser
    echo      backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
    echo.
    choice /C 12 /M "Selecciona una opcion"
    
    if %errorlevel%==1 (
        echo   Configuracion manual seleccionada
        cd backend
        ENV\Scripts\python.exe manage.py createsuperuser
        cd ..
    ) else (
        echo   Configuracion automatica seleccionada
        cd backend
        ENV\Scripts\python.exe manage.py createsuperuser
        ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
        cd ..
    )
)

echo.
echo ============================================================
echo Entorno listo para desarrollo
echo ============================================================
echo.
echo Servicios disponibles:
echo   - Backend API:    http://localhost:8000/api/
echo   - Django Admin:   http://localhost:8000/admin/
echo   - Frontend:       http://localhost:5173/
echo.
echo Para iniciar los servicios:
echo   - Backend:  cd backend ^&^& backend\ENV\Scripts\python.exe manage.py runserver
echo   - Frontend: cd frontend ^&^& npm run dev
echo.
echo O usa las tareas de VS Code (Ctrl+Shift+P -^> Tasks: Run Task)
echo.
pause
