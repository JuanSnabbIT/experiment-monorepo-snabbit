````markdown
# Testing y Validaciones (Documento Exhaustivo)

Guía completa de pruebas y validaciones del proyecto.

---

## 1. Estado Actual de Testing

### 1.1 Backend

| Herramienta | Estado | Comando |
|-------------|--------|---------|
| Django Test Runner | ✅ Disponible | `python manage.py test` |
| pytest | ❌ No configurado | - |
| Coverage | ❌ No configurado | - |

### 1.2 Frontend

| Herramienta | Estado | Comando |
|-------------|--------|---------|
| Tests unitarios | ❌ No configurado | - |
| ESLint | ✅ Disponible | `npm run lint` |
| TypeScript Check | ✅ Vía build | `npm run build` |
| Prettier | ✅ Disponible | `npm run prettier:fix` |

---

## 2. Backend - Django Tests

### 2.1 Ejecutar Tests

```bash
# Todos los tests
python manage.py test

# Tests de una app específica
python manage.py test nombre_app

# Test específico
python manage.py test nombre_app.tests.TestClass.test_method

# Con verbosidad
python manage.py test -v 2

# Con paralelismo
python manage.py test --parallel
```

### 2.2 Estructura de Tests

```
app/
└── tests.py          # Tests de la app
    # o
└── tests/            # Directorio de tests
    ├── __init__.py
    ├── test_models.py
    ├── test_views.py
    └── test_serializers.py
```

### 2.3 Patrón de Test

```python
# app/tests.py
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

class MiModeloTest(TestCase):
    def setUp(self):
        # Preparar datos de prueba
        self.objeto = MiModelo.objects.create(nombre="Test")
    
    def test_crear_objeto(self):
        self.assertEqual(self.objeto.nombre, "Test")
    
    def tearDown(self):
        # Limpiar después del test
        pass


class MiAPITest(APITestCase):
    def setUp(self):
        # Crear usuario y autenticar
        self.user = User.objects.create_user(
            email="test@test.com",
            password="testpass123"
        )
        self.client.force_authenticate(user=self.user)
    
    def test_listar_objetos(self):
        response = self.client.get('/api/mis-objetos/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_crear_objeto(self):
        data = {'nombre': 'Nuevo'}
        response = self.client.post('/api/mis-objetos/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

### 2.4 Fixtures y Factories

```python
# Usar fixtures JSON
class MiTest(TestCase):
    fixtures = ['datos_prueba.json']

# O crear datos en setUp
def setUp(self):
    self.empresa = Empresa.objects.create(nombre="Test Corp")
    self.sucursal = SucursalEmpresa.objects.create(
        empresa=self.empresa,
        nombre="Sucursal Central"
    )
```

---

## 3. Frontend - Validaciones

### 3.1 ESLint

```bash
# Verificar errores
npm run lint

# Arreglar automáticamente (si existe script)
npm run lint:fix
```

**Configuración:** `.eslintrc.js` o `eslint.config.js`

### 3.2 TypeScript

```bash
# Verificar tipos (via build)
npm run build

# Solo verificar tipos (si existe tsc script)
npx tsc --noEmit
```

**Configuración:** `tsconfig.json`

### 3.3 Prettier

```bash
# Formatear código
npm run prettier:fix

# Verificar formato
npm run prettier:check
```

**Configuración:** `prettier.config.cjs`

---

## 4. Validaciones Pre-Commit

### 4.1 Checklist Manual Backend

Antes de commit en backend:

```bash
# 1. Verificar migraciones
python manage.py makemigrations --dry-run

# 2. Ejecutar tests
python manage.py test

# 3. Verificar imports (si hay flake8)
flake8 .
```

### 4.2 Checklist Manual Frontend

Antes de commit en frontend:

```bash
# 1. Lint
npm run lint

# 2. Build (verifica TypeScript)
npm run build

# 3. Formatear
npm run prettier:fix
```

---

## 5. Tests de API (Postman)

### 5.1 Colecciones Disponibles

```
postman/
├── ordentrabajov2.postman_collection.json
└── OT-Cierre.postman_collection.json
```

### 5.2 Uso

1. Importar colección en Postman
2. Configurar variable `{{base_url}}` = `http://localhost:8000`
3. Configurar variable `{{token}}` con JWT válido
4. Ejecutar requests

---

## 6. Validaciones de Negocio

### 6.1 Validaciones en Serializers

```python
class MiSerializer(serializers.ModelSerializer):
    def validate_campo(self, value):
        if value < 0:
            raise serializers.ValidationError("El valor no puede ser negativo")
        return value
    
    def validate(self, data):
        # Validación cruzada de campos
        if data['fecha_fin'] < data['fecha_inicio']:
            raise serializers.ValidationError({
                'fecha_fin': 'Debe ser posterior a fecha_inicio'
            })
        return data
```

### 6.2 Validaciones en Modelos

```python
class MiModelo(models.Model):
    def clean(self):
        if self.cantidad < 0:
            raise ValidationError({'cantidad': 'No puede ser negativo'})
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
```

### 6.3 Validaciones en ViewSets

```python
class MiViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        # Validación adicional antes de guardar
        if not self.request.user.has_perm('app.add_modelo'):
            raise PermissionDenied("No tiene permiso para crear")
        serializer.save(creado_por=self.request.user)
```

---

## 7. Validaciones Frontend (Formik + Yup)

### 7.1 Esquema de Validación

```typescript
import * as Yup from 'yup';

const validationSchema = Yup.object({
    nombre: Yup.string()
        .required('El nombre es requerido')
        .min(3, 'Mínimo 3 caracteres'),
    
    email: Yup.string()
        .email('Email inválido')
        .required('El email es requerido'),
    
    cantidad: Yup.number()
        .required('La cantidad es requerida')
        .min(1, 'Mínimo 1')
        .max(100, 'Máximo 100'),
    
    fecha: Yup.date()
        .required('La fecha es requerida')
        .min(new Date(), 'Debe ser fecha futura'),
});
```

### 7.2 Validación Condicional

```typescript
const validationSchema = Yup.object({
    tipo: Yup.string().required(),
    
    // Campo requerido solo si tipo === 'especial'
    detalle: Yup.string().when('tipo', {
        is: 'especial',
        then: (schema) => schema.required('Requerido para tipo especial'),
        otherwise: (schema) => schema.optional(),
    }),
});
```

---

## 8. Pruebas de Integración

### 8.1 Probar Flujo Completo

Ejemplo: Flujo de cotización

```python
class FlujoCotizacionTest(APITestCase):
    def test_flujo_completo_cotizacion(self):
        # 1. Crear cotización
        response = self.client.post('/api/cotizaciones/', {...})
        cotizacion_id = response.data['id']
        
        # 2. Agregar items
        self.client.post(f'/api/cotizaciones/{cotizacion_id}/items/', {...})
        
        # 3. Agregar solicitantes
        self.client.post(f'/api/cotizaciones/{cotizacion_id}/solicitantes/', {...})
        
        # 4. Enviar cotización
        self.client.post(f'/api/cotizaciones/{cotizacion_id}/enviar/')
        
        # 5. Verificar estado
        response = self.client.get(f'/api/cotizaciones/{cotizacion_id}/')
        self.assertEqual(response.data['estado'], 'enviada')
```

---

## 9. Debugging

### 9.1 Backend

```python
# Usar logging
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Variable: {variable}")

# Breakpoints con pdb
import pdb; pdb.set_trace()

# Django Debug Toolbar (si está instalado)
# Ver panel de debug en navegador
```

### 9.2 Frontend

```typescript
// Console
console.log('Debug:', variable);
console.table(arrayData);

// React DevTools (extensión navegador)
// Redux DevTools (extensión navegador)

// Breakpoints en código
debugger;
```

---

## 10. Recomendaciones para Testing

### 10.1 Backend

1. **Mínimo:** Tests para lógica de negocio crítica
2. **Ideal:** Tests para todos los endpoints
3. **Cobertura:** Apuntar a 70%+ en código crítico

### 10.2 Frontend

1. **Mínimo:** Validar build sin errores
2. **Ideal:** Tests para componentes complejos
3. **Recomendado:** Configurar Vitest o Jest

### 10.3 Setup Recomendado para Tests Frontend

```bash
# Instalar Vitest
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Agregar script a package.json
"test": "vitest",
"test:coverage": "vitest --coverage"
```

---

## 11. CI/CD (Estado Actual)

### 11.1 Estado

- No hay GitHub Actions configuradas
- No hay pipeline de CI/CD automatizado

### 11.2 Recomendación

Crear `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/req.txt
      - run: cd backend && python manage.py test
  
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run build
```

---

Última actualización: 2026-02-03
````
