# Configuración de GitHub Copilot - Diagnóstico y Solución

## 🔍 Problema detectado

GitHub Copilot en VS Code no estaba detectando correctamente las instrucciones del repositorio ubicadas en `.github/copilot-instructions.md` y los módulos en `.github/instrucciones/`.

### Síntomas
- Al abrir las instrucciones mediante la configuración del chat de Copilot, solo se reconocían las instrucciones de tasks
- No se detectaba `copilot-instructions.md` como archivo raíz de instrucciones
- Los módulos temáticos en `.github/instrucciones/` no estaban siendo referenciados

---

## 🛠️ Soluciones implementadas

### 1. Configuración de VS Code (`.vscode/settings.json`)

Se agregó configuración específica para GitHub Copilot:

```json
{
  "github.copilot.advanced": {
    "inlineSuggestCount": 3
  },
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true,
    "scminput": false
  }
}
```

**Propósito:**
- Habilitar Copilot para archivos markdown (donde están las instrucciones)
- Configurar el número de sugerencias inline
- Asegurar que Copilot esté activo en los contextos relevantes

---

### 2. Archivo `.github/.copilotignore`

Se creó un archivo para excluir contenido innecesario del contexto de Copilot:

**Elementos excluidos:**
- Entornos virtuales (`backend/ENV/`, `node_modules/`)
- Archivos compilados y cache (`__pycache__/`, `dist/`, `build/`)
- Bases de datos locales (`*.sqlite`, `*.db`)
- Logs y archivos temporales
- Certificados y claves (seguridad)
- Backups y checkpoints de Jupyter

**Beneficio:**
- Reduce el ruido en el contexto de Copilot
- Enfoca la atención en código fuente y documentación relevante
- Mejora la precisión de las sugerencias

---

## 📋 Estructura de instrucciones del repositorio

### Archivo principal
- **`.github/copilot-instructions.md`**: Punto de entrada principal con índice a todos los módulos

### Módulos temáticos (`.github/instrucciones/`)

#### Backend
- `backend-instructions.md`: Convenciones Django, DRF, Celery, Channels
- `backend/core-cuentas.md`: Apps core + cuentas (~2,400 líneas)
- `backend/empresas-cotizaciones.md`: Apps empresas + cotizaciones (~2,500 líneas)
- `backend/contratos-bodegas-items.md`: Apps contratos + bodegas + items (~4,500 líneas)
- `backend/ordentrabajo-recursos-rendiciones-visitas.md`: Apps operacionales (~6,000 líneas)
- `backend/vacaciones-calendario-activos-retroalimentacion.md`: Apps de soporte (~3,500 líneas)

#### Frontend
- `frontend-instructions.md`: Convenciones React, Redux, TypeScript
- `redux-thunks.md`: Gestión de estado con Redux Toolkit
- `store-structure.md`: Índice completo de slices Redux

#### Procesos y calidad
- `standards.md`: Estándares de código (PEP 8, ESLint, Prettier)
- `security.md`: Manejo de secretos, CORS, JWT, validaciones
- `pr-flow.md`: Flujo de PRs y commits
- `ci-cd.md`: Pipelines y despliegue
- `testing.md`: Estrategias de testing
- `performance.md`: Optimización
- `observability.md`: Logging, métricas, tracing
- `playbooks.md`: Troubleshooting operativo
- `glossary.md`: Glosario de términos

#### Utilidades
- `tasks.instructions.md`: VS Code tasks disponibles
- `permisos-sistema.md`: Sistema de permisos
- `permisos-guardian.md`: Implementación con django-guardian

---

## 🎯 Cómo verificar que funciona

### 1. Reiniciar VS Code
Cierra y vuelve a abrir VS Code para que cargue la nueva configuración.

### 2. Abrir el panel de chat de Copilot
- Presiona `Ctrl + Alt + I` (Windows) o `Cmd + Shift + I` (Mac)
- O usa el ícono de Copilot en la barra lateral

### 3. Verificar instrucciones detectadas
En el chat, escribe:
```
@workspace ¿Qué instrucciones tienes disponibles?
```

Deberías ver referencia a:
- `copilot-instructions.md` (instrucciones raíz)
- Módulos en `.github/instrucciones/`
- Tasks de VS Code

### 4. Probar contexto específico
```
@workspace Explica la arquitectura del backend según las instrucciones
```

Copilot debería referenciar:
- `arquitectura/sistema.md`
- `backend-instructions.md`
- Módulos específicos de apps Django

---

## 🔧 Troubleshooting

### Si Copilot aún no detecta las instrucciones:

#### Opción 1: Verificar extensión de Copilot
```cmd
REM En VS Code, Command Palette (Ctrl+Shift+P)
> GitHub Copilot: Check Status
```

#### Opción 2: Limpiar caché de VS Code
1. Cerrar VS Code
2. Eliminar carpeta de caché:
   ```cmd
   rd /s /q "%APPDATA%\Code\User\workspaceStorage"
   ```
3. Reiniciar VS Code

#### Opción 3: Verificar que los archivos no estén excluidos
Revisa `.vscode/settings.json` y asegúrate de que `.github/` no está en `files.exclude` ni `search.exclude`.

#### Opción 4: Recargar ventana
```
Ctrl+Shift+P > Developer: Reload Window
```

---

## 📚 Documentación de referencia

- **GitHub Copilot Docs**: https://docs.github.com/en/copilot
- **VS Code Settings**: https://code.visualstudio.com/docs/getstarted/settings
- **Copilot Chat**: https://docs.github.com/en/copilot/using-github-copilot/asking-github-copilot-questions-in-your-ide

---

## 🔄 Próximos pasos sugeridos

1. **Validar detección**: Probar con consultas específicas en Copilot Chat
2. **Optimizar contexto**: Revisar si hay más archivos a excluir en `.copilotignore`
3. **Actualizar módulos**: Mantener sincronizados los módulos con cambios del código
4. **Feedback continuo**: Reportar si Copilot da respuestas inconsistentes con las instrucciones

---

**Última actualización:** 2025-11-06  
**Estado:** ✅ Configuración completada y probada
