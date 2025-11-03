# 🚀 Inicio Rápido - ERP Snabbit

Guía rápida para iniciar el proyecto desde cero en un nuevo entorno (notebook, PC, servidor).

## Opción 1: Script Automático (Recomendado) ⚡

Ejecuta el script de inicio rápido desde la raíz del proyecto:

```cmd
inicio-rapido.bat
```

Este script:
1. ✅ Verifica Python y Node.js
2. ✅ Crea entorno virtual si no existe
3. ✅ Instala dependencias backend y frontend
4. ✅ Aplica migraciones
5. ✅ Te guía para crear superusuario
6. ✅ Configura empresa y permisos (opcional)

---

## Opción 2: Manual Paso a Paso 📋

### 1. Prerequisitos

- **Python 3.11+**: [Descargar](https://www.python.org/downloads/)
- **Node.js 18+**: [Descargar](https://nodejs.org/)
- **Git**: [Descargar](https://git-scm.com/)

Verifica las instalaciones:
```cmd
python --version
node --version
git --version
```

### 2. Clonar Repositorio

```cmd
git clone https://github.com/Suikunstito/monorepo_erp.git
cd monorepo_erp
```

### 3. Backend

```cmd
cd backend

# Crear entorno virtual
python -m venv ENV

# Activar entorno (Windows)
ENV\Scripts\activate

# Instalar dependencias
pip install -r req.txt

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser
# Email: tu@email.com
# Password: ********

# Configurar empresa y permisos
python ..\scripts\setup\setup_superuser.py

# (Opcional) Poblar datos de prueba
python ..\scripts\setup\seed_data.py

# Iniciar servidor
python manage.py runserver
```

### 4. Frontend (nueva terminal)

```cmd
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### 5. Acceso

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/
- **Django Admin**: http://localhost:8000/admin/

Login con el superusuario creado → ¡Listo para desarrollar!

---

## Estructura del Proyecto

```
monorepo_erp/
├── backend/               # Django 5.1 + DRF + Celery + Channels
│   ├── ENV/              # Entorno virtual (no versionado)
│   ├── sw_erp/           # Configuración principal
│   ├── <apps>/           # Apps por dominio (bodegas, cuentas, etc.)
│   └── manage.py
├── frontend/             # Vite + React + TypeScript + TailwindCSS
│   ├── src/
│   ├── public/
│   └── package.json
├── scripts/              # Scripts de utilidad
│   ├── setup/            # Inicialización
│   ├── development/      # Desarrollo
│   └── maintenance/      # Mantenimiento
├── .github/
│   └── instructions/     # Documentación técnica
└── inicio-rapido.bat     # Script de inicio rápido
```

---

## Scripts Útiles

Los scripts se ejecutan desde la carpeta `backend/`:

### Setup (Inicialización)

```cmd
# Configurar superusuario con empresa
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py

# Resetear base de datos (⚠️ elimina todos los datos)
backend\ENV\Scripts\python.exe ..\scripts\setup\reset_db.py

# Poblar datos de prueba
backend\ENV\Scripts\python.exe ..\scripts\setup\seed_data.py
```

### Development (Desarrollo)

```cmd
# Crear grupos de permisos
backend\ENV\Scripts\python.exe ..\scripts\development\create_groups.py
```

### Maintenance (Mantenimiento)

```cmd
# Backup de base de datos
backend\ENV\Scripts\python.exe ..\scripts\maintenance\backup_db.py
```

Ver documentación completa en [`scripts/README.md`](scripts/README.md)

---

## Tareas de VS Code

El proyecto incluye tareas configuradas en `.vscode/tasks.json`:

**Ctrl+Shift+P** → **Tasks: Run Task**

- **Start: All (Backend + Frontend)** - Inicia todo el sistema
- **Backend: Runserver** - Solo backend
- **Frontend: Dev Server** - Solo frontend
- **Backend: Make Migrations** - Generar migraciones
- **Backend: Migrate** - Aplicar migraciones

Ver detalles en [`.github/instructions/tasks.instructions.md`](.github/instructions/tasks.instructions.md)

---

## Solución de Problemas Comunes

### "Sin permisos" al acceder al sistema

**Causa**: Usuario sin grupos asignados en `UsuarioEmpresa`.

**Solución**:
```cmd
cd backend
backend\ENV\Scripts\python.exe ..\scripts\setup\setup_superuser.py
```

Luego cierra sesión en frontend y vuelve a loguearte.

### Errores de migraciones

**Causa**: Conflictos entre migraciones.

**Solución**:
```cmd
# Listar migraciones
backend\ENV\Scripts\python.exe manage.py showmigrations

# Si hay conflictos, resetear (⚠️ CUIDADO):
backend\ENV\Scripts\python.exe ..\scripts\setup\reset_db.py
```

### Redis no disponible (Celery/Channels)

**Causa**: Redis no está corriendo.

**Solución**:
```cmd
# Windows: Instalar Redis con Docker
docker run -d -p 6379:6379 redis:latest

# O usar WSL2 con Redis nativo
```

### Puerto en uso (EADDRINUSE)

**Causa**: Backend/frontend ya están corriendo.

**Solución**:
```cmd
# Windows: Matar proceso en puerto
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

---

## Flujo de Desarrollo

### Nueva Funcionalidad

1. Crear rama feature:
   ```cmd
   git checkout -b feature/nueva-funcionalidad
   ```

2. Backend: Crear modelos, serializers, vistas
   ```cmd
   cd backend
   backend\ENV\Scripts\python.exe manage.py makemigrations
   backend\ENV\Scripts\python.exe manage.py migrate
   ```

3. Frontend: Crear componentes, servicios, estado

4. Tests:
   ```cmd
   # Backend
   backend\ENV\Scripts\python.exe manage.py test

   # Frontend
   cd frontend
   npm run test
   ```

5. Commit y push:
   ```cmd
   git add .
   git commit -m "Feat: nueva funcionalidad"
   git push origin feature/nueva-funcionalidad
   ```

6. Crear Pull Request en GitHub

### Actualizar desde Main

```cmd
git checkout main
git pull origin main
git checkout tu-rama
git merge main
```

---

## Recursos Adicionales

### Documentación Técnica

- [Sistema de Permisos](.github/instructions/permisos-sistema.md)
- [Backend (Django)](.github/instructions/backend-instructions.md)
- [Frontend (React)](.github/instructions/frontend-instructions.md)
- [Testing](.github/instructions/testing.md)
- [Seguridad](.github/instructions/security.md)
- [CI/CD](.github/instructions/ci-cd.md)

### Scripts

- [README de Scripts](scripts/README.md)
- [Setup Scripts](scripts/setup/)
- [Development Scripts](scripts/development/)
- [Maintenance Scripts](scripts/maintenance/)

### Comandos Útiles

```cmd
# Backend
cd backend
backend\ENV\Scripts\python.exe manage.py <comando>

# Shell interactivo
backend\ENV\Scripts\python.exe manage.py shell

# Crear app
backend\ENV\Scripts\python.exe manage.py startapp <nombre_app>

# Limpiar caché
backend\ENV\Scripts\python.exe manage.py clearsessions

# Frontend
cd frontend
npm run dev          # Desarrollo
npm run build        # Producción
npm run test         # Tests
npm run lint         # Linter
```

---

## Contacto y Soporte

- **Repositorio**: https://github.com/Suikunstito/monorepo_erp
- **Issues**: https://github.com/Suikunstito/monorepo_erp/issues

---

**Última actualización**: 2025-11-03
