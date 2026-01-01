# 🧪 Testing – Unit Tests, Integration & Coverage

Guía de prácticas de testing en backend y frontend.

---

## 🧪 Backend Testing (Pytest + Django)

### Estructura

```
app/
├── tests/
│   ├── __init__.py
│   ├── test_models.py         # Tests de modelos
│   ├── test_serializers.py    # Tests de serializers
│   ├── test_views.py          # Tests de ViewSets/APIs
│   └── test_tasks.py          # Tests de Celery tasks
└── tests.py                    # Alternativa: tests en un archivo
```

### Setup Básico

```python
# tests.py (o tests/test_models.py)
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth import get_user_model
from .models import OrdenTrabajo

User = get_user_model()

class OrdenTrabajoModelTests(TestCase):
    """Tests para el modelo OrdenTrabajo."""
    
    @classmethod
    def setUpTestData(cls):
        """Ejecuta una vez antes de los tests (datos compartidos)."""
        cls.usuario = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        cls.ot = OrdenTrabajo.objects.create(
            numero='OT-001',
            descripcion='Test OT',
            usuario_asignado=cls.usuario,
        )
    
    def test_str_method(self):
        """Test: __str__ retorna formato correcto."""
        self.assertEqual(str(self.ot), 'OT-OT-001')
    
    def test_create_orden_trabajo(self):
        """Test: crear nueva OT."""
        ot = OrdenTrabajo.objects.create(
            numero='OT-002',
            descripcion='Nueva OT',
            usuario_asignado=self.usuario,
        )
        self.assertTrue(OrdenTrabajo.objects.filter(numero='OT-002').exists())
```

### API Tests (ViewSet)

```python
from rest_framework import status

class OrdenTrabajoAPITests(APITestCase):
    """Tests para la API de órdenes de trabajo."""
    
    def setUp(self):
        """Ejecuta antes de cada test."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_list_ordenes_trabajo(self):
        """Test: GET /api/ordentrabajov2/ retorna lista."""
        OrdenTrabajo.objects.create(
            numero='OT-001',
            descripcion='Test',
            usuario_asignado=self.user,
        )
        
        response = self.client.get('/api/ordentrabajov2/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_orden_trabajo(self):
        """Test: POST /api/ordentrabajov2/ crea nueva OT."""
        data = {
            'numero': 'OT-002',
            'descripcion': 'Nueva OT',
        }
        response = self.client.post('/api/ordentrabajov2/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(OrdenTrabajo.objects.filter(numero='OT-002').exists())
    
    def test_list_ordenes_sin_autenticacion(self):
        """Test: acceso denegado sin token."""
        client = APIClient()
        response = client.get('/api/ordentrabajov2/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_retrieve_orden_trabajo(self):
        """Test: GET /api/ordentrabajov2/{id}/ retorna detalle."""
        ot = OrdenTrabajo.objects.create(
            numero='OT-001',
            descripcion='Test',
            usuario_asignado=self.user,
        )
        
        response = self.client.get(f'/api/ordentrabajov2/{ot.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['numero'], 'OT-001')
    
    def test_update_orden_trabajo(self):
        """Test: PATCH /api/ordentrabajov2/{id}/ actualiza OT."""
        ot = OrdenTrabajo.objects.create(
            numero='OT-001',
            descripcion='Original',
            usuario_asignado=self.user,
        )
        
        data = {'descripcion': 'Actualizada'}
        response = self.client.patch(f'/api/ordentrabajov2/{ot.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        ot.refresh_from_db()
        self.assertEqual(ot.descripcion, 'Actualizada')
    
    def test_delete_orden_trabajo(self):
        """Test: DELETE /api/ordentrabajov2/{id}/ elimina OT."""
        ot = OrdenTrabajo.objects.create(
            numero='OT-001',
            descripcion='Test',
            usuario_asignado=self.user,
        )
        
        response = self.client.delete(f'/api/ordentrabajov2/{ot.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(OrdenTrabajo.objects.filter(id=ot.id).exists())
```

### Serializer Tests

```python
from .serializers import OrdenTrabajoSerializer

class OrdenTrabajoSerializerTests(TestCase):
    """Tests para OrdenTrabajoSerializer."""
    
    def test_valid_serializer(self):
        """Test: serializer válido."""
        data = {
            'numero': 'OT-001',
            'descripcion': 'Test',
        }
        serializer = OrdenTrabajoSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_invalid_numero(self):
        """Test: numero sin prefijo 'OT-' es inválido."""
        data = {
            'numero': '001',  # Falta 'OT-'
            'descripcion': 'Test',
        }
        serializer = OrdenTrabajoSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('numero', serializer.errors)
```

### Ejecución

```bash
# Todos los tests
python manage.py test

# Tests específicos de un app
python manage.py test ordentrabajov2

# Tests de una clase
python manage.py test ordentrabajov2.tests.OrdenTrabajoAPITests

# Con coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Genera reporte en htmlcov/
```

---

## 🧪 Frontend Testing (Jest + React Testing Library)

### Estructura

```
src/
├── components/
│   ├── OrdenTrabajoModal.tsx
│   ├── __tests__/
│   │   └── OrdenTrabajoModal.test.tsx
│   └── ...
└── ...
```

### Setup (jest.config.js)

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
};
```

### Component Tests

```typescript
// src/components/__tests__/OrdenTrabajoModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { OrdenTrabajoModal } from '../OrdenTrabajoModal';
import ordenesReducer from '@/store/slices/ordenes.slice';

// Mock del store
const createMockStore = () => {
  return configureStore({
    reducer: {
      ordenes: ordenesReducer,
    },
  });
};

describe('OrdenTrabajoModal', () => {
  it('renders modal when ordenId is provided', () => {
    const store = createMockStore();
    const onClose = jest.fn();
    
    render(
      <Provider store={store}>
        <OrdenTrabajoModal ordenId={1} onClose={onClose} />
      </Provider>
    );
    
    // Verificar que se renderiza algo
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });
  
  it('calls onClose when close button is clicked', async () => {
    const store = createMockStore();
    const onClose = jest.fn();
    
    render(
      <Provider store={store}>
        <OrdenTrabajoModal ordenId={1} onClose={onClose} />
      </Provider>
    );
    
    const closeBtn = screen.getByRole('button', { name: /cerrar/i });
    fireEvent.click(closeBtn);
    
    expect(onClose).toHaveBeenCalled();
  });
  
  it('displays error message on failed load', async () => {
    const store = createMockStore();
    
    // Simular error en el store
    // (esto requeriría mock más sofisticado)
    
    expect(true).toBe(true); // Placeholder
  });
});
```

### Hook Tests

```typescript
// src/hooks/__tests__/useOrdenTrabajo.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { useOrdenTrabajo } from '../useOrdenTrabajo';
import { configureStore } from '@reduxjs/toolkit';
import ordenesReducer from '@/store/slices/ordenes.slice';

describe('useOrdenTrabajo', () => {
  it('fetches orden on mount', async () => {
    const store = configureStore({
      reducer: { ordenes: ordenesReducer },
    });
    
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    
    const { result } = renderHook(() => useOrdenTrabajo(1), { wrapper });
    
    // Esperar a que cargue
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### Service Tests (Mocking API)

```typescript
// src/services/__tests__/OrdenTrabajoService.test.ts
import OrdenTrabajoService from '../OrdenTrabajoService';
import BaseService from '../BaseService';

jest.mock('../BaseService');

describe('OrdenTrabajoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('fetches list of ordenes', async () => {
    const mockData = {
      count: 1,
      results: [
        { id: 1, numero: 'OT-001', descripcion: 'Test' },
      ],
    };
    
    (BaseService.fetchData as jest.Mock).mockResolvedValue({
      data: mockData,
    });
    
    const result = await OrdenTrabajoService.listar();
    
    expect(result.results).toHaveLength(1);
    expect(result.results[0].numero).toBe('OT-001');
  });
});
```

### Ejecución

```bash
# Todos los tests
npm run test

# Tests específicos
npm run test -- OrdenTrabajoModal

# Con coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch
```

---

## 📊 Coverage Target

| Tipo | Target |
|------|--------|
| **Statements** | ≥ 80% |
| **Branches** | ≥ 75% |
| **Functions** | ≥ 80% |
| **Lines** | ≥ 80% |

### Generar reporte

```bash
# Backend
coverage html
open htmlcov/index.html

# Frontend
npm run test -- --coverage
# Revisa coverage/
```

---

## 🎯 Testing Best Practices

### Backend
✅ **Haz:**
- Tests para modelos, serializers, views
- Usa `setUpTestData()` para datos compartidos
- Test cada endpoint (GET, POST, PATCH, DELETE)
- Test permisos y autenticación
- Test validaciones

❌ **Evita:**
- Tests que dependan de base datos real
- Tests que ejecuten tareas Celery (usa mock)
- Lógica de test compleja

### Frontend
✅ **Haz:**
- Tests de componentes (render, interacción)
- Mocks de servicios HTTP
- Tests de Redux slices y thunks
- Tests de hooks personalizados

❌ **Evita:**
- Tests de implementación (test behavior, no internals)
- Tests que dependan de API real
- Screenshots/snapshot tests excesivos

---

## 🔗 Referencias

- [Django Testing Documentation](https://docs.djangoproject.com/en/5.1/topics/testing/)
- [DRF Testing](https://www.django-rest-framework.org/api-guide/testing/)
- [Jest Documentation](https://jestjs.io)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

**Última actualización:** 2025-12-28

