# Seed Demo RRHH — Base de Datos de Pruebas

Comando Django para poblar la base de datos con datos de demostración para el módulo RRHH.

## Ejecución rápida

```bash
cd backend
python manage.py seed_demo_rrhh
```

## ¿Qué se crea?

### Empresa demo
- **Nombre**: Demo RRHH SpA
- **Dirección**: Av. Demo 123, Santiago, Región Metropolitana
- **Sucursal**: Casa Matriz

### 4 Usuarios de prueba
Todos con password `Demo1234!`:

| Email | Nombre | Rol |
|---|---|---|
| admin@demo.cl | Admin Demo | Superuser (Gerente General) |
| ana.perez@demo.cl | Ana Pérez | Trabajadora (Desarrollador) |
| juan.soto@demo.cl | Juan Soto | Trabajador (Analista) |
| carla.rojas@demo.cl | Carla Rojas | Trabajadora (Administrativo) |

### 3 Contratos de prueba en estados diferentes
- **Ana Pérez**: Contrato indefinido en estado **BORRADOR**
- **Juan Soto**: Contrato a plazo fijo en estado **VIGENTE** (activo)
- **Carla Rojas**: Contrato indefinido en estado **TERMINADO**

### Catálogos de RRHH
- **AFP**: 7 opciones (Provida, Habitat, Capital, Cuprum, Modelo, PlanVital, Uno AFP)
- **Bancos**: 10 opciones (BancoEstado, Santander, BCI, Chile, Itaú, Scotiabank, Security, Bice, Falabella, Ripley)
- **Cargos**: 5 cargos por empresa
- **Turnos globales**: Mañana, Tarde, Noche
- **Configuración laboral**: Jornada 45h semanales, gratificación base

### Plantillas de contrato B2B (desde `seed_plantillas_default`)
- `CONTRATO DE SERVICIOS TECNOLOGICOS Y ASESORIAS`
- `CONTRATO DE LICENCIAMIENTO DE SOFTWARE`
- `CONTRATO DE VENTA DE EQUIPOS Y SERVICIOS`

### Plantillas de contrato laboral (desde `seed_demo_rrhh`)

**Todas contienen placeholders** que se interpolan automáticamente (`[empresa.nombre]`, `[trabajador.rut]`, etc.):

1. **Contrato Individual de Trabajo** ⭐ (por defecto)
   - 6 secciones (encabezado, partes, funciones, remuneración, jornada, firmas)
   - Úsalo para contratos indefinidos

2. **Contrato a Plazo Fijo**
   - 6 secciones (encabezado, partes, duración, funciones, remuneración, firmas)
   - Úsalo para contratos con fecha de término

3. **Contrato de Reemplazo**
   - 6 secciones (encabezado, partes, causal, funciones, remuneración, firmas)
   - Úsalo para reemplazos temporales

4. **Anexo de Modificación de Remuneración**
   - 5 secciones (encabezado, antecedentes, modificación, efectos, firmas)
   - Úsalo para cambios de sueldo o beneficios

## Flujos que puedes probar

### 1. Login y navegación
```
Ir a Frontend → Login como admin@demo.cl / Demo1234!
Navegar a RRHH → Trabajadores
Ver lista completa de trabajadores con sus contratos
```

### 2. Ver contrato vigente
```
RRHH → Trabajadores → Juan Soto
Ver contrato en estado VIGENTE con plantilla y secciones
```

### 3. Cambiar estado de un contrato (Máquina de estados)
```
RRHH → Trabajadores → Ana Pérez
Contrato en BORRADOR → [Cambiar estado]
Seleccionar PENDIENTE_APROBACION
Validar transición de estado
```

### 4. Crear nuevo contrato (Wizard multi-paso)
```
RRHH → Trabajadores → [+ Crear Contrato]
Paso 1: Datos del trabajador
Paso 2: Seleccionar contrato o crear nuevo
Paso 3: Jornada
Paso 4: Prevision/Banco
Paso 5: Términos laborales
Paso 6: Revisar y guardar
```

### 5. Generar/Firmar PDF de contrato
```
RRHH → Trabajadores → [Contrato vigente]
[Generar PDF] o [Vista previa]
Validar que interpolación de placeholders funciona
```

## Opciones del comando

### Ejecutar normalmente (idempotente)
```bash
python manage.py seed_demo_rrhh
```
No crea duplicados. Puedes ejecutar múltiples veces sin problemas.

### Reset + recrear
```bash
python manage.py seed_demo_rrhh --reset
```
⚠️ **CUIDADO**: Elimina la empresa demo y TODOS sus datos, luego recrear.

**Úsalo solo en BD de pruebas locales**.

## Idempotencia

El comando usa `get_or_create()` en todos los puntos, así que es seguro ejecutar múltiples veces:

```bash
# Primer run: crea todo
python manage.py seed_demo_rrhh

# Segundo run: no hace nada (idempotente)
python manage.py seed_demo_rrhh

# Tercer run: idem
python manage.py seed_demo_rrhh
```

## Requisitos

1. **Django 5.1.x** instalado en tu virtualenv
2. **Migraciones ejecutadas**: `python manage.py migrate`
3. **BD limpia o nueva** (recomendado en desarrollo)

## Troubleshooting

### Error: `ModuleNotFoundError: No module named 'django'`
```bash
pip install -r requirements.txt
```

### Error: `relation "rrhh_contratotrabajador" does not exist`
```bash
python manage.py migrate
```

### Error: `UNIQUE constraint failed`
Hay datos parciales de un run anterior:
```bash
python manage.py seed_demo_rrhh --reset
```

### El comando no se encuentra
Verifica que el archivo esté en:
```
backend/rrhh/management/commands/seed_demo_rrhh.py
```

## Diseño del comando

- **Ubicación**: `backend/rrhh/management/commands/seed_demo_rrhh.py`
- **Patrón**: Maestro que orquestra steps
- **Reutilización**: Llama `call_command()` a otros seeds existentes (turnos, etiquetas, bloques)
- **Output**: Coloreado con `self.style` para claridad
- **BD**: Todas las operaciones dentro de `transaction.atomic()`

---

**Última actualización**: 2026-06-03
**Mantenido por**: Plan `spicy-prancing-porcupine.md`
