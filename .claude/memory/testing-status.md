---
name: testing-status
description: Estado actual testing — sin cobertura funcional, patrones esperados documentados
lastUpdated: 2026-06-01
relatedFiles:
  - backend/*/tests.py
  - frontend/src/__tests__/
  - .github/instructions/testing.md
---

# Testing Status — Cobertura Actual & Patrones

## Estado Actual

🔴 **Sin cobertura de tests funcionales implementada**

- Backend: `tests.py` existen pero vacíos/minimal
- Frontend: `__tests__/` directorio creado, sin tests
- CI/CD: Sin ejecutor de tests automatizado

## Patrones Esperados

### Backend (Django)

```python
# backend/app/tests.py
from django.test import TestCase
from app.models import MiModelo

class MiModeloTestCase(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Test")
        self.objeto = MiModelo.objects.create(empresa=self.empresa, ...)
    
    def test_modelo_creacion(self):
        self.assertEqual(self.objeto.nombre, "Test")
    
    def test_multi_tenancy_filtro(self):
        qs = MiModelo.objects.filter(empresa=self.empresa)
        self.assertIn(self.objeto, qs)
```

### Frontend (React)

```typescript
// frontend/src/__tests__/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import Button from '@/components/ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Comandos (Cuando esté implementado)

```bash
# Backend
cd backend
python manage.py test                    # Todos los tests
python manage.py test app.tests          # App específica
python manage.py test --verbosity=2      # Con detalles

# Frontend
cd frontend
npm run test                             # Jest
npm run test -- --coverage              # Con cobertura
npm run test -- --watch                 # Watch mode
```

## Requisitos de Cobertura Deseados

```
Backend:
  - ≥ 80% coverage en models.py
  - ≥ 70% coverage en views.py (endpoints)
  - ≥ 100% en services.py (lógica crítica)
  - Multi-tenancy tests obligatorios

Frontend:
  - ≥ 80% coverage en componentes UI
  - ≥ 70% coverage en pages
  - RTK Query hooks testeados
  - Integration tests para flows críticos
```

## Próximos Pasos

1. Agregar dependencias (`pytest`, `pytest-django`, `jest`, `@testing-library/react`)
2. Escribir test suite por app (backend)
3. Escribir test suite por página (frontend)
4. Integrar con CI/CD (GitHub Actions)
5. Enforcement: CI rechaza PR si cobertura < 70%

---

**Cuándo usar:** Documentar patrón de tests, planeamiento de test suite, CI setup
