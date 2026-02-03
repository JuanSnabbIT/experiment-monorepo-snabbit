# Scripts de Setup - Guía de Uso

Scripts para inicializar y poblar la base de datos del ERP desde cero.

---

## 📋 Orden de Ejecución Recomendado

### 1️⃣ **reset_db.py** - Limpiar Base de Datos
```powershell
cd backend
ENV\Scripts\python.exe ..\dev\scripts\setup\reset_db.py
```

**¿Qué hace?**
- Elimina `backend/db.sqlite3` completamente
- Ejecuta `python manage.py migrate` para crear tablas limpias
- Solicita confirmación interactiva (usar `-y` para omitir)

**Cuándo usar:**
- Primera vez que inicializas el proyecto
- Después de cambios estructurales en modelos
- Cuando necesitas un entorno limpio de testing

**Salida esperada:**
```
WARNING: This will delete ALL local data in db.sqlite3.
Type YES to continue: YES
OK: Deleted c:\...\backend\db.sqlite3
Running migrations...
OK: Migrations completed
```

---

### 2️⃣ **setup_superuser.py** - Crear Superusuario (DEPRECATED - Ver seed_base.py)
```powershell
cd backend
ENV\Scripts\python.exe ..\dev\scripts\setup\setup_superuser.py
```

⚠️ **NOTA:** Este script es ahora redundante. `seed_base.py` crea/valida automáticamente el superusuario. Úsalo solo si necesitas recrear el admin sin poblador datos maestros completos.

**¿Qué hace?**
- Crea grupos de permisos (`staff`, `superadmin`, `multi-empresas`, etc.)
- Crea empresa base **"Snabbit"** (RUT: 11111111-1)
- Crea sucursal "Casa Matriz" con datos de ubicación
- Asocia superusuario a la empresa
- Crea PersonalizacionUsuario para el superusuario

**Prerequisitos:**
- Base de datos con migraciones aplicadas
- NO tener superusuario existente (o el script lo reutilizará)

**Datos creados:**
- ✅ 1 Empresa: Snabbit
- ✅ 1 Sucursal: Casa Matriz (Región 13, Provincia 131, Comuna 13101)
- ✅ 6 Grupos: staff, superadmin, multi-empresas, tecnico, bodeguero, representante_legal
- ✅ 1 Superusuario asociado a Snabbit
- ✅ 1 PersonalizacionUsuario

---

### 3️⃣ **seed_base.py** - Poblar TODO (Maestros + Superusuario Interactivo)
```powershell
cd backend
ENV\Scripts\python.exe ..\dev\scripts\setup\seed_base.py
```

**¿Qué hace?** (FLUJO COMPLETO - RECOMMENDED)
- ✅ **Valida superusuario existente** o pide crear uno de forma interactiva
- ✅ Crea grupos de permisos
- ✅ Crea **SOLO datos maestros** (NO procesos transaccionales)
- ✅ Genera empresas cliente con recargo (22-28%) y PPM (3-7%) variables
- ✅ Crea usuarios, items, proveedores, bodegas, stock inicial
- ✅ Establece RelacionEmpresa (Snabbit → clientes)
- ✅ Genera catálogos de servicios, visitas, licencias

**Prerequisitos:**
- Base de datos con migraciones aplicadas
- No necesita setup_superuser.py previo

**Flujo Interactivo Superusuario:**
Si NO existe superusuario:
```
⚠️  No se encontró ningún superusuario en el sistema.

¿Deseas crear uno ahora? (s/n): s

============================================================
CREACIÓN DE SUPERUSUARIO
============================================================

Email: admin@snabbit.cl
RUT (formato: 12345678-9): 11111111-9
Nombre: Admin
Apellido: Snabbit
Contraseña (mínimo 8 caracteres): ********
Confirma contraseña: ********

✅ Superusuario 'admin@snabbit.cl' creado exitosamente
```

Si respondes "n", el script se cancela (no puede continuar sin superusuario).

**Datos creados:**
- ✅ Superusuario (creado interactivamente si no existe)
- ✅ 6 Grupos de permisos
- ✅ Empresa base "Snabbit" con recargo/PPM variables
- ✅ 1 Sucursal "Casa Matriz"
- ✅ 5 Usuarios internos Snabbit
- ✅ 12 Empresas cliente (con recargo/PPM únicos)
- ✅ 12 Sucursales (una por empresa, con región/provincia/comuna)
- ✅ 36 Usuarios cliente (3 por empresa: admin, compras, operaciones)
- ✅ 41 PersonalizacionUsuario (TODAS las cuentas incluida admin)
- ✅ 12 RelacionEmpresa (Snabbit como prestador)
- ✅ 30 Items con categorías, fabricantes y proveedores
- ✅ 10 Proveedores
- ✅ 9 Categorías de productos
- ✅ 8 Fabricantes
- ✅ 2 Bodegas (Principal y Secundaria)
- ✅ 30 Registros de stock distribuidos
- ✅ Catálogos de servicios, visitas, licencias

**⚠️ QUÉ NO CREA (por diseño):**
- ❌ Cotizaciones
- ❌ Órdenes de Compra
- ❌ Guías de Salida
- ❌ Órdenes de Trabajo
- ❌ Contratos
- ❌ Compras y movimientos de stock

**Razón:** Estos son procesos transaccionales que deben probarse manualmente creándolos a través de la UI o API.

**Contraseña de usuarios NO superusuarios:** `test1234`  
**Contraseña de superusuario:** La que definas al crearlo interactivamente

**Salida esperada (con superusuario existente):**
```
┌──────────────────────────────────────────────────────────────┐
│          SEED BASE V2 - Población de Datos Maestros          │
└──────────────────────────────────────────────────────────────┘

================================================================================
  0. Validando Superusuario
================================================================================
  [1/1] Superusuario existente: admin@snabbit.cl

================================================================================
  1. Creando Grupos de Permisos
================================================================================
  [1/6] staff: existente
  ...
```

**Salida esperada (sin superusuario, creación interactiva):**
```
================================================================================
  0. Validando Superusuario
================================================================================

⚠️  No se encontró ningún superusuario en el sistema.

¿Deseas crear uno ahora? (s/n): s

============================================================
CREACIÓN DE SUPERUSUARIO
============================================================

Email: admin@snabbit.cl
RUT (formato: 12345678-9): 11111111-9
Nombre: Admin
Apellido: Snabbit
Contraseña (mínimo 8 caracteres): ********
Confirma contraseña: ********

✅ Superusuario 'admin@snabbit.cl' creado exitosamente

================================================================================
  1. Creando Grupos de Permisos
================================================================================
  [1/6] staff: existente
  ...
================================================================================
  ✅ SEED BASE COMPLETADO EXITOSAMENTE
================================================================================

  📊 Datos Creados:
     ✓ Superusuario creado/validado
     ✓ Empresa base (Snabbit) con recargo/PPM variables
     ...
```

---

### 4️⃣ **check_seed.py** - Verificar Datos Creados
```powershell
cd backend
ENV\Scripts\python.exe ..\dev\scripts\setup\check_seed.py
```

**¿Qué hace?**
- Verifica que datos maestros fueron creados correctamente
- Muestra conteo de empresas, sucursales, items, usuarios, etc.
- Valida existencia de empresa base, superusuario y relaciones

**18 Validaciones incluidas:**
1. Empresa base Snabbit
2. Recargo en rango (22-28%)
3. PPM en rango (3-7%)
4. Sucursal Casa Matriz
5. Región correcta
6. Provincia correcta
7. Comuna correcta
8. Empresas cliente creadas
9. Recargos variables
10. PPMs variables
11. Total de usuarios
12. PersonalizacionUsuario coincidencia
13. Usuarios internos Snabbit
14. Superusuario existe
15. RelacionEmpresa count
16. Items creados
17. Proveedores creados
18. Catálogos (servicios, visitas, licencias)

**Salida esperada:**
```
┌────────────────────────────────────────────────┐
│      VERIFICACIÓN DE DATOS - seed_base.py      │
└────────────────────────────────────────────────┘

✅ Empresa Snabbit existe
✅ Recargo en rango (22-28%): 26%
✅ PPM en rango (3-7%): 5.17%
...
══════════════════════════════════════════════════
           🎉 TODAS LAS VERIFICACIONES PASARON
══════════════════════════════════════════════════
```

---

### 5️⃣ **crear_datos_ordentrabajo.py** - Crear OT de Prueba (Opcional)
```powershell
cd backend
ENV\Scripts\python.exe ..\dev\scripts\setup\crear_datos_ordentrabajo.py
```

**¿Qué hace?**
- Crea Órdenes de Trabajo completas con todas sus relaciones
- Genera objetos relacionados: Cotización, VisitaSoporte, Compra, GuíaSalida
- Crea detalles de trabajo, seguimientos, adjuntos, gastos
- Crea preguntas de retroalimentación

**Prerequisitos:**
- `seed_base.py` ejecutado exitosamente
- Empresas, usuarios, items y bodegas deben existir

**Datos creados:**
- ✅ Cotizaciones de prueba
- ✅ Visitas de soporte
- ✅ Compras asociadas
- ✅ Guías de salida
- ✅ Órdenes de Trabajo completas con:
  - Usuarios asignados
  - Detalles de trabajo
  - Seguimientos
  - Historial de cambios
  - Adjuntos
  - Gastos de rendición
  - Retroalimentación

**⚠️ Nota:** Este script crea datos TRANSACCIONALES. Solo usar para testing específico de OT.

---

## 🗂️ Archivos en esta Carpeta

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `reset_db.py` | Limpia BD y recrea tablas | ✅ Activo |
| `setup_superuser.py` | Crea superusuario + empresa base | ⚠️ Redundante (ver seed_base.py) |
| `seed_base.py` | Pobla TODO (superusuario + datos maestros) | ✅ **RECOMENDADO** |
| `check_seed.py` | Verifica creación correcta (18 validaciones) | ✅ Activo |
| `crear_datos_ordentrabajo.py` | Crea OT de prueba (testing) | ✅ Activo (opcional) |
| `codex_web_setup.sh` | Setup para Codex Web (bash) | ✅ Activo (Linux/CI) |
| `README.md` | Esta documentación | ✅ Actualizado |

---

## 🔧 Flujo Completo de Inicialización

### Setup desde Cero (Primera Vez) - **RECOMENDADO**

```powershell
# 1. Limpiar BD
cd backend
ENV\Scripts\python.exe ..\dev\scripts\setup\reset_db.py -y

# 2. Poblar TODO (superusuario + datos maestros en un paso)
ENV\Scripts\python.exe ..\dev\scripts\setup\seed_base.py

# 3. Verificar creación (opcional pero recomendado)
ENV\Scripts\python.exe ..\dev\scripts\setup\check_seed.py

# 4. (Opcional) Crear OT de prueba
ENV\Scripts\python.exe ..\dev\scripts\setup\crear_datos_ordentrabajo.py
```

**Resultado:**
- ✅ Base de datos limpia
- ✅ Superusuario creado: admin@snabbit.cl (password: test1234)
- ✅ 6 grupos de permisos
- ✅ 13 empresas (1 base + 12 clientes)
- ✅ 41 usuarios con PersonalizacionUsuario
- ✅ 30 items con stock
- ✅ 10 proveedores
- ✅ Catálogos y configuración

**Tiempo estimado:** 2-3 minutos

---

### Setup Legacy (Paso a Paso - Alternativa)

Si prefieres máximo control o necesitas solo ciertos pasos:

```powershell
cd backend

# 1. Limpiar BD
ENV\Scripts\python.exe ..\dev\scripts\setup\reset_db.py -y

# 2. Crear SOLO superusuario (si no quieres seed_base.py completo)
ENV\Scripts\python.exe ..\dev\scripts\setup\setup_superuser.py

# 3. Poblar datos maestros
ENV\Scripts\python.exe ..\dev\scripts\setup\seed_base.py

# 4. Verificar
ENV\Scripts\python.exe ..\dev\scripts\setup\check_seed.py
```

**Nota:** Este flujo es más lento pero idéntico al recomendado. `seed_base.py` crea el superusuario de todas formas.

---

## 🐛 Troubleshooting

### Error: "UNIQUE constraint failed: cuentas_user.rut"
**Causa:** Intentando crear usuario con RUT duplicado  
**Solución:** Ejecutar `reset_db.py` para limpiar BD completamente

### Error: "Empresa matching query does not exist"
**Causa:** No se ejecutó `reset_db.py` antes de `seed_base.py`  
**Solución:** Ejecutar scripts en orden correcto (ver flujo arriba)

### Error: "FOREIGN KEY constraint failed"
**Causa:** Migraciones no aplicadas o datos inconsistentes  
**Solución:** 
```powershell
cd backend
ENV\Scripts\python.exe manage.py migrate
ENV\Scripts\python.exe ..\dev\scripts\setup\reset_db.py -y
```

### Error: "django.setup() ImportError"
**Causa:** No estás en directorio `backend/`  
**Solución:** Siempre ejecutar desde `backend/` o scripts manejan rutas automáticamente

---

## 📝 Notas Importantes

1. **Entorno de Desarrollo:** Estos scripts están diseñados para **desarrollo local** únicamente. NO usar en producción.

2. **Contraseñas:** Todos los usuarios creados tienen contraseña `test1234`. Cambiar en producción.

3. **Datos Maestros vs Transaccionales:**
   - **Maestros:** Empresas, usuarios, items, bodegas → Creados por `seed_base.py`
   - **Transaccionales:** Cotizaciones, OT, OC, contratos → Crear manualmente o con scripts específicos

4. **Recargo y PPM Variables:** Cada empresa cliente recibe valores aleatorios:
   - Recargo: 22-28%
   - PPM: 3.0-7.0%

5. **PersonalizacionUsuario:** CRÍTICO - todos los usuarios deben tener uno. Sin esto, los filtros de datos fallan.

6. **RelacionEmpresa:** Establece relación prestador→cliente necesaria para flujos de cotización/OC.

---

## 🔄 Versionado

- **v2.1** (2026-02-03): Limpieza final
  - Eliminadas carpetas deprecadas (Git maneja historial)
  - Mantener solo archivos en uso
  - Reducción a 7 archivos necesarios

- **v2.0** (2026-02-03): Refactor completo con análisis profundo de arquitectura
  - Eliminada creación de datos transaccionales
  - Respeta restricciones OneToOne (UsuarioEmpresa, StockItemEnBodega)
  - Crea PersonalizacionUsuario para todos los usuarios
  - Genera RelacionEmpresa correctamente
  - Valores variables de recargo/PPM por empresa

- **v1.0** (2025-12-31): Versión inicial orquestadora

---

**Última actualización:** 2026-02-03  
**Mantenedor:** Equipo de Desarrollo Snabbit ERP
