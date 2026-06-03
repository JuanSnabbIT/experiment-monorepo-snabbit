# 📈 Diagramas de Secuencia: Usuario RRHH

---

## 1️⃣ SECUENCIA TEMPORAL: Crear → Aprobación → Vigente

```
ACTOR: Usuario RRHH
SISTEMA: Backend Django + Frontend React
TERCERO: Empleador (Client, no autenticado)
BD: Base de Datos

Tiempo ──────────────────────────────────────────────────────────────────────→

│
│   ┌─ T0: CREAR CONTRATO
│   │
│   ├──────────────────────────────────────────────────────────────────
│   │
│   └──► RRHH abre Modal "Crear Contrato"
│        └─ Selecciona empresa cliente
│           └─ Completa 7-step wizard
│              └─ Valida en FRONTEND (Yup schema)
│
│        ┌─────────────────────────────┐
│        │ POST /api/rrhh/contratos/   │
│        │ crear-con-trabajador/       │
│        └─────────────────────────────┘
│                    │
│                    ▼ BACKEND
│        ┌─────────────────────────────┐
│        │ CrearContratoConTrabajador  │
│        │ Serializer:                 │
│        │ • Valida schema             │
│        │ • Si NUEVO: guarda JSON     │
│        │ • Si EXISTENTE: linkea UE   │
│        └─────────────────────────────┘
│                    │
│                    ▼ BD
│        ┌─────────────────────────────┐
│        │ INSERT ContratoTrabajador   │
│        │ estado = 'borrador'         │
│        │ creado_por = RRHH user      │
│        └─────────────────────────────┘
│                    │
│                    ▼ RESPUESTA
│        ┌─────────────────────────────┐
│        │ 201 CREATED                 │
│        │ {contrato_id: 123}          │
│        └─────────────────────────────┘
│                    │
│   ◄────────────────┴─────────────────────────────────────────────
│
│   RESULTADO: Contrato en estado "borrador"
│   ├─ Listo para edición
│   ├─ Listo para generar PDF
│   └─ Listo para enviar aprobación
│
│
│   ┌─ T1: GENERAR PDF (OPCIONAL)
│   │
│   └──► RRHH clickea "Generar PDF"
│        
│        ┌─────────────────────────────┐
│        │ POST /api/rrhh/contratos/   │
│        │ 123/generar-pdf/            │
│        └─────────────────────────────┘
│                    │
│                    ▼ BACKEND
│        ┌─────────────────────────────┐
│        │ Motor Plantillas V2:         │
│        │ 1. Resuelve plantilla        │
│        │ 2. Interpola etiquetas      │
│        │ 3. Renderiza secciones      │
│        │ 4. Crea PDF (marca BORRADOR)│
│        └─────────────────────────────┘
│                    │
│                    ▼ STORAGE
│        ┌─────────────────────────────┐
│        │ Guarda:                      │
│        │ /rrhh/contratos/123/pdf     │
│        └─────────────────────────────┘
│                    │
│                    ▼ BD
│        ┌─────────────────────────────┐
│        │ UPDATE ContratoTrabajador   │
│        │ archivo_pdf = <file_path>   │
│        └─────────────────────────────┘
│                    │
│   ◄────────────────┴─────────────────────────────────────────────
│
│   RESULTADO: PDF generado y guardado
│
│
│   ┌─ T2: ENVIAR A APROBACIÓN
│   │
│   └──► RRHH clickea "Enviar a Aprobación"
│        └─ Ingresa email empleador: "gerente@cliente.com"
│
│        ┌──────────────────────────────────────┐
│        │ POST /api/rrhh/contratos/123/        │
│        │ enviar-aprobacion-empleador/         │
│        │ {email_empleador: "gerente@..."}     │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BACKEND
│        ┌──────────────────────────────────────┐
│        │ 1. Genera PDF congelado (final)      │
│        │ 2. Expira aprobs. anteriores         │
│        │ 3. Crea EnvioAprobacionEmpleador:    │
│        │    ├─ uuid = UUID único              │
│        │    ├─ pdf_congelado = bytes          │
│        │    ├─ enviado_a = "gerente@..."      │
│        │    ├─ fecha_envio = now()             │
│        │    └─ decision = "pendiente"          │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BD
│        ┌──────────────────────────────────────┐
│        │ INSERT EnvioAprobacionEmpleador      │
│        │ UPDATE Contrato                      │
│        │ estado = 'pendiente_aprobacion'      │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ EMAIL SERVICE
│        ┌──────────────────────────────────────┐
│        │ Envía email a gerente@cliente.com    │
│        │ Asunto: "Solicitud de aprobación..." │
│        │ Body:  "Haga clic aquí:"             │
│        │  /rrhh/aprobacion-empleador/        │
│        │  {uuid}/                             │
│        └──────────────────────────────────────┘
│                    │
│   ◄────────────────┴──────────────────────────────────────────────
│
│   RESULTADO: Contrato en "pendiente_aprobacion"
│   ├─ Email enviado al empleador
│   └─ Link público expira en 14 días
│
│
│   ┌─ T3: EMPLEADOR RESPONDE (FUERA DE CONTROL RRHH)
│   │
│   └──► Empleador recibe email
│        └─ Clickea link /rrhh/aprobacion-empleador/{uuid}/
│           └─ Portal público (sin auth)
│              
│        ┌──────────────────────────────────────┐
│        │ GET /api/public/contrato-aprobacion/ │
│        │ {uuid}/                              │
│        │ (AllowAny - sin autenticación)       │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BACKEND
│        ┌──────────────────────────────────────┐
│        │ Valida UUID                          │
│        │ Valida no expirado (< 14 días)       │
│        │ Retorna datos del contrato           │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ FRONTEND PÚBLICO
│        ┌──────────────────────────────────────┐
│        │ Muestra:                             │
│        │ • Datos trabajador                   │
│        │ • Cargo, tipo contrato, fechas       │
│        │ • Botones:                           │
│        │   - Descargar PDF BORRADOR           │
│        │   - ✅ APROBAR                       │
│        │   - ❌ RECHAZAR                      │
│        │   - ⚠️ SOLICITAR CAMBIOS             │
│        └──────────────────────────────────────┘
│                    │
│       ╔════════════════════════════════════════╗
│       ║ EMPLEADOR DECIDE Y RESPONDE            ║
│       ╚════════════════════════════════════════╝
│                    │
│                    ▼
│        ┌──────────────────────────────────────┐
│        │ POST /api/public/contrato-aprobacion/│
│        │ {uuid}/responder/                    │
│        │ {decision: "aprobado"}               │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BACKEND
│        ┌──────────────────────────────────────┐
│        │ EnvioAprobacionEmpleador:            │
│        │ • decision = "aprobado"              │
│        │ • fecha_respuesta = now()             │
│        │ • ip_respuesta = <IP empleador>      │
│        │                                      │
│        │ SI DECISION == "aprobado":           │
│        │ ├─ Contrato: pendiente → vigente     │
│        │ ├─ Si NUEVO: crea User + UsuarioEmp │
│        │ ├─ Si NUEVO: crea Invitación        │
│        │ └─ Envía email a trabajador          │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BD
│        ┌──────────────────────────────────────┐
│        │ UPDATE EnvioAprobacionEmpleador      │
│        │ UPDATE ContratoTrabajador estado →   │
│        │ 'vigente'                            │
│        │ INSERT User (si NUEVO)               │
│        │ INSERT UsuarioEmpresa (si NUEVO)     │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ EMAIL SERVICE
│        ┌──────────────────────────────────────┐
│        │ Email 1: A RRHH                      │
│        │ "Contrato aprobado por empleador"    │
│        │                                      │
│        │ Email 2: A TRABAJADOR (si NUEVO)     │
│        │ "Tu contrato está listo"             │
│        │ Link: /aceptar-invitacion/{token}/   │
│        │ (invitación con 7 días expiración)   │
│        └──────────────────────────────────────┘
│                    │
│   ◄────────────────┴──────────────────────────────────────────────
│
│   RESULTADO: Empleador respondió APROBADO
│   ├─ Contrato listo para ser aceptado por RRHH
│   └─ Trabajador notificado (si NUEVO)
│
│
│   ┌─ T4: RRHH ACEPTA EN SISTEMA
│   │
│   └──► RRHH ve estado: "Aprobado por empleador"
│        └─ Clickea botón "Aceptar en el sistema"
│
│        ┌──────────────────────────────────────┐
│        │ POST /api/rrhh/contratos/123/aceptar/│
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BACKEND
│        ┌──────────────────────────────────────┐
│        │ VALIDACIONES:                        │
│        │ ✓ estado = 'pendiente_aprobacion'    │
│        │ ✓ empleador aprobó                   │
│        │                                      │
│        │ TRANSICIÓN:                          │
│        │ estado: pendiente → vigente          │
│        │ fecha_aprobacion = now()              │
│        │ aceptado_por = RRHH user             │
│        │                                      │
│        │ SYNC UsuarioEmpresa:                 │
│        │ ue.cargo = contrato.cargo             │
│        │ ue.fecha_contrato = contrato.inicio   │
│        └──────────────────────────────────────┘
│                    │
│                    ▼ BD
│        ┌──────────────────────────────────────┐
│        │ UPDATE ContratoTrabajador            │
│        │ UPDATE UsuarioEmpresa (sync)         │
│        │ INSERT Historial (evento aprobacion) │
│        └──────────────────────────────────────┘
│                    │
│   ◄────────────────┴──────────────────────────────────────────────
│
│   ✅ CONTRATO VIGENTE Y ACTIVO
│      ├─ Trabajador con contrato activo
│      ├─ Listo para crear anexos
│      ├─ Listo para ver historial
│      └─ Puede ser terminado o anulado
│
│
│   ┌─ T5: OPERACIONES EN VIGENTE (Ejemplos)
│   │
│   ├──► CREAR ANEXO (Ej: cambio de sueldo)
│   │    ├─ POST /api/rrhh/contratos/123/anexos/
│   │    ├─ Tipo: "modificacion_sueldo"
│   │    ├─ Fecha efectiva
│   │    ├─ Generar PDF del anexo
│   │    └─ Estado anexo: vigente
│   │
│   ├──► CREAR COPIA (para nuevo contrato similar)
│   │    ├─ POST /api/rrhh/contratos/123/crear-copia/
│   │    ├─ Clona datos (no PDF, firma, aprobación)
│   │    ├─ Nuevo estado: borrador
│   │    └─ Vuelve al flujo inicial
│   │
│   ├──► VER HISTORIAL
│   │    ├─ GET /api/rrhh/contratos/123/historial/
│   │    ├─ Timeline con todos los cambios
│   │    ├─ Quién cambió, cuándo, qué cambió
│   │    └─ Aprobaciones, respuestas empleador
│   │
│   └──► TERMINAR CONTRATO
│        ├─ POST /api/rrhh/contratos/123/cambiar-estado/
│        ├─ Estado: vigente → terminado
│        ├─ Motivo: renuncia, mutuo acuerdo, etc.
│        ├─ Fecha término real
│        └─ Observaciones (opcional)
│
│
└──────────────────────────────────────────────────────────────────────────

LÍNEA DE TIEMPO RESUMEN:

T0: Crear Contrato (borrador)
  │
  ▼ Horas/Días
  │
T1: Generar PDF (opcional)
  │
  ▼ Minutos
  │
T2: Enviar Aprobación empleador
  ├─ Contrato: pendiente_aprobacion
  ├─ Expira: 14 días
  └─ Email: gerente@cliente.com
      │
      ▼ 1-7 días (típico)
      │
T3: Empleador responde (portal público)
  ├─ Aprobado / Rechazado / Cambios
  ├─ Email: notificación a RRHH
  └─ Si NUEVO: email a trabajador
      │
      ▼ Minutos (RRHH revisa email)
      │
T4: RRHH acepta en sistema
  ├─ Contrato: vigente
  ├─ Si NUEVO: crea User + UsuarioEmpresa
  └─ Sync datos
      │
      ▼ Meses (vida del contrato)
      │
T5: Operaciones en vigente
  ├─ Crear anexos
  ├─ Ver historial
  ├─ Terminar / Anular
  └─ Crear copias
      │
      ▼ Fin de contrato
      │
  ✅ Contrato finalizado (historial permanente)
```

---

## 2️⃣ SECUENCIA: TRABAJADOR NUEVO (Flujo especial)

```
ACTOR: Usuario RRHH
CASO: Crear contrato con TRABAJADOR NUEVO (no existe en BD)

Tiempo ──────────────────────────────────────────────────────────────────────→

│
│   PASO 1: RRHH crea contrato en MODO "NUEVO"
│
│   ┌─────────────────────────────────────────────────────────┐
│   │ WIZARD - PASO 2: TRABAJADOR                             │
│   │                                                         │
│   │ ☉ MODO: Nuevo                                          │
│   │ ├─ Email: juan@email.com                               │
│   │ ├─ Nombre: Juan García                                 │
│   │ ├─ RUT: 12.345.678-9                                   │
│   │ ├─ Sucursal: Sucursal Centro                           │
│   │ └─ Datos opcionales: AFP, banco, etc.                  │
│   └─────────────────────────────────────────────────────────┘
│                    │
│                    ▼ FRONTEND VALIDA
│        ┌───────────────────────────────────┐
│        │ • Email único (sin User existente) │
│        │ • RUT válido (dígito verificador) │
│        │ • Sucursal existe y accesible     │
│        └───────────────────────────────────┘
│                    │
│                    ▼
│        ┌───────────────────────────────────┐
│        │ BACKEND:                          │
│        │ POST crear-con-trabajador/        │
│        │ {                                 │
│        │   trabajador: {                   │
│        │     modo: "nuevo",                │
│        │     email: "juan@email.com",      │
│        │     first_name: "Juan",           │
│        │     last_name: "García",          │
│        │     rut: "12345678-9",            │
│        │     sucursal_id: 5,               │
│        │     afp: 1, banco: 2, ...         │
│        │   },                              │
│        │   contrato: { ... }               │
│        │ }                                 │
│        └───────────────────────────────────┘
│                    │
│                    ▼ VALIDACIONES
│        ┌───────────────────────────────────┐
│        │ ✓ Email no existe en User         │
│        │ ✓ Sucursal existe y accesible     │
│        │ ✓ Todos campos requeridos         │
│        │ ✓ Schema validado                 │
│        └───────────────────────────────────┘
│                    │
│                    ▼ BD ATOMIC TRANSACTION
│        ┌───────────────────────────────────┐
│        │ NO SE CREA User aún               │
│        │ NO SE CREA UsuarioEmpresa aún     │
│        │                                   │
│        │ SOLO SE GUARDA:                   │
│        │ INSERT ContratoTrabajador {       │
│        │   usuario_empresa: NULL,          │
│        │   datos_trabajador_nuevo: {       │
│        │     email: "juan@email.com",      │
│        │     first_name: "Juan",           │
│        │     last_name: "García",          │
│        │     rut: "12345678-9",            │
│        │     sucursal_id: 5,               │
│        │     afp_id: 1,                    │
│        │     banco_id: 2,                  │
│        │     ... (todos los datos)         │
│        │   },                              │
│        │   estado: "borrador"              │
│        │ }                                 │
│        └───────────────────────────────────┘
│                    │
│   ◄────────────────┴──────────────────────
│
│   RESULTADO: Contrato creado
│   ├─ usuario_empresa = NULL
│   ├─ datos_trabajador_nuevo = {JSON con todos datos}
│   └─ Estado: borrador
│
│
│   PASO 2: RRHH ENVÍA A APROBACIÓN
│   └─ POST enviar-aprobacion-empleador/
│      └─ Empleador aprueba (T2 flujo anterior)
│
│
│   PASO 3: EMPLEADOR APRUEBA
│   └─ POST /api/public/contrato-aprobacion/{uuid}/responder/
│      {decision: "aprobado"}
│                    │
│                    ▼ BACKEND MAGIA ✨
│        ┌───────────────────────────────────┐
│        │ if contrato.datos_trabajador_nuevo: │
│        │                                   │
│        │ AHORA SÍ SE CREA:                 │
│        │                                   │
│        │ 1. CREATE User                    │
│        │    ├─ email = juan@email.com      │
│        │    ├─ first_name = "Juan"         │
│        │    ├─ last_name = "García"        │
│        │    ├─ rut = "12345678-9"          │
│        │    ├─ is_active = False (!)       │
│        │    │  └─ Necesita aceptar invite  │
│        │    └─ password = (no seteado)     │
│        │                                   │
│        │ 2. CREATE UsuarioEmpresa          │
│        │    ├─ usuario = <nuevo User>      │
│        │    ├─ sucursal = <de datos_trab>  │
│        │    ├─ estado = "1" (activo)       │
│        │    ├─ rut = "12345678-9"          │
│        │    ├─ afp_id = 1                  │
│        │    ├─ banco_id = 2                │
│        │    └─ ... (todos los datos)       │
│        │                                   │
│        │ 3. CREATE Invitación              │
│        │    ├─ email = juan@email.com      │
│        │    ├─ first_name = "Juan"         │
│        │    ├─ activation_token = UUID     │
│        │    ├─ expiration_date = +7 días   │
│        │    └─ sucursal = <destino>        │
│        │                                   │
│        │ 4. UPDATE ContratoTrabajador      │
│        │    ├─ usuario_empresa = <nueva>   │
│        │    ├─ datos_trabajador_nuevo =NULL│
│        │    ├─ estado = "vigente"          │
│        │    └─ fecha_aprobacion = now()    │
│        └───────────────────────────────────┘
│                    │
│                    ▼ EMAIL SERVICE
│        ┌───────────────────────────────────┐
│        │ Email a: juan@email.com           │
│        │                                   │
│        │ Asunto:                           │
│        │ "Tu contrato laboral está listo"  │
│        │                                   │
│        │ Body:                             │
│        │ "Hola Juan,                       │
│        │                                   │
│        │  Tu contrato laboral fue          │
│        │  aprobado. Activa tu cuenta       │
│        │  haciendo clic aquí:              │
│        │                                   │
│        │  /aceptar-invitacion/{token}/     │
│        │                                   │
│        │  Link válido por 7 días."         │
│        └───────────────────────────────────┘
│                    │
│   ◄────────────────┴──────────────────────
│
│   RESULTADO: Trabajador NUEVO creado y notificado
│   ├─ User creado (is_active = False)
│   ├─ UsuarioEmpresa creado
│   ├─ Invitación enviada
│   └─ Email llegó a trabajador
│
│
│   PASO 4: TRABAJADOR ACEPTA INVITACIÓN
│   └─ Clickea link: /aceptar-invitacion/{token}/
│      ├─ Valida token (no expirado, existe)
│      ├─ Muestra formulario:
│      │  ├─ Confirma email
│      │  ├─ Ingresa password
│      │  └─ Acepta términos
│      │
│      └─ POST /api/public/invitacion/{token}/aceptar/
│         │
│         ▼ BACKEND
│         ├─ Update User:
│         │  ├─ is_active = True
│         │  └─ set_password(password_provided)
│         ├─ Delete Invitación
│         ├─ Notificar a RRHH
│         └─ Redirige a login
│
│
│   PASO 5: TRABAJADOR LOGUEADO
│   ├─ Ve su contrato en Dashboard
│   ├─ Puede ver todos sus datos
│   ├─ Puede descargar PDF
│   └─ Puede iniciar procesos (ej: solicitar vacaciones)
│
│
└──────────────────────────────────────────────────────────────────────────

CICLO DE VIDA DEL TRABAJADOR NUEVO:

T0: RRHH crea contrato (MODO "nuevo")
    ├─ usuario_empresa = NULL
    ├─ datos_trabajador_nuevo = {JSON}
    └─ Estado: borrador

    ... (ediciones en borrador)

T1: RRHH envía aprobación
    └─ Estado: pendiente_aprobacion

T2: Empleador aprueba
    ├─ Sistema crea User (is_active=False)
    ├─ Sistema crea UsuarioEmpresa
    ├─ Sistema crea Invitación (7 días)
    ├─ Email: invitación a juan@email.com
    └─ Estado contrato: vigente

T3: Trabajador clickea link invitación
    ├─ Activa su cuenta (is_active=True)
    ├─ Establece password
    ├─ Email: confirmación a RRHH
    └─ Email: bienvenida a trabajador

T4: Trabajador logueado
    ├─ Primero: completa perfil (si incompleto)
    ├─ Ve su contrato
    ├─ Ve su sueldo
    ├─ Puede solicitar vacaciones/rendiciones/etc.
    └─ Contrato vigente desde el inicio


IMPORTANTE:
  • El User nunca se crea hasta que EMPLEADOR APRUEBE
  • El trabajador nunca entra al sistema sin aceptar invitación
  • El JSON datos_trabajador_nuevo se limpia cuando se crea User
  • Si email ya existía: error, NO SE CREA el contrato
```

---

## 3️⃣ ALTERNATIVA: Rechazo por Empleador

```
Empleador recibirá link: /rrhh/aprobacion/{uuid}/

┌─────────────────────────────────────────────┐
│  EMPLEADOR VE: Contrato de Juan García      │
│  - Cargo: Ingeniero                         │
│  - Tipo: Indefinido                         │
│  - Fecha inicio: 15/02/2025                 │
│                                             │
│  [Descargar PDF] [Aprobar] [Rechazar] [+]  │
└─────────────────────────────────────────────┘

                  │
                  ▼ Empleador clickea [Rechazar]

┌──────────────────────────────────────────────┐
│ Formulario: Motivo del Rechazo (obligatorio) │
│                                              │
│ [Textarea: "El cargo no existe en nuestra    │
│  estructura. Necesitamos otra posición."]    │
│                                              │
│ [Cancelar] [Enviar Rechazo]                 │
└──────────────────────────────────────────────┘

                  │
                  ▼ Backend

        POST /api/public/contrato-aprobacion/
        {uuid}/responder/
        {
          decision: "rechazado",
          motivo_rechazo: "El cargo no existe..."
        }

                  │
                  ▼ BACKEND

        ┌────────────────────────────────────┐
        │ EnvioAprobacionEmpleador:          │
        │ ├─ decision = "rechazado"          │
        │ ├─ fecha_respuesta = now()          │
        │ ├─ motivo_rechazo = "El cargo..."   │
        │ └─ ip_respuesta = <IP>              │
        │                                    │
        │ ContratoTrabajador:                │
        │ ├─ Si estado == "pendiente":       │
        │ │  └─ estado → "anulado"           │
        │ └─ Si estado == "borrador":        │
        │    └─ estado → "descartado"        │
        └────────────────────────────────────┘

                  │
                  ▼ EMAIL SERVICE

        Email a: rrhh.juan@empresa.com
        Asunto: "Contrato rechazado"
        Body: "El empleador rechazó el contrato
               de Juan García.
               Motivo: El cargo no existe..."

                  │
        ◄─────────┴──────────────

        RESULTADO: Contrato ANULADO
        ├─ Empleador vio y rechazó
        ├─ RRHH notificado
        ├─ Puede editar y reenviar
        └─ O crear uno nuevo desde copia
```

---

## 4️⃣ FLUJO: Cambios Solicitados

```
┌──────────────────────────────────────────┐
│  EMPLEADOR VE: Contrato de Juan García   │
│                                          │
│  [Descargar PDF] [+] [Solicitar Cambios]│
└──────────────────────────────────────────┘

              │
              ▼

┌────────────────────────────────────────────┐
│ Formulario: Cambios Solicitados            │
│                                            │
│ [x] Agregar campos:                        │
│ • "Cambiar horario de 9-17 a 8-16"        │
│ • "Incluir bono por productividad"         │
│ • "Especificar días de home office"        │
│                                            │
│ [Cancelar] [Enviar Solicitud]              │
└────────────────────────────────────────────┘

              │
              ▼ Backend

    POST /api/public/contrato-aprobacion/
    {uuid}/responder/
    {
      decision: "cambios_solicitados",
      cambios_solicitados: [
        "Cambiar horario de 9-17 a 8-16",
        "Incluir bono por productividad",
        "Especificar días de home office"
      ]
    }

              │
              ▼ BACKEND LOGIC

    ┌─────────────────────────────────────┐
    │ EnvioAprobacionEmpleador:           │
    │ ├─ decision = "cambios_solicitados" │
    │ ├─ cambios_solicitados = [array]    │
    │ ├─ fecha_respuesta = now()           │
    │ └─ motivo_rechazo = NULL             │
    │                                     │
    │ ContratoTrabajador:                 │
    │ ├─ estado → "borrador" (REGRESA)    │
    │ └─ usuario_empresa/datos no cambien │
    └─────────────────────────────────────┘

              │
              ▼ EMAIL SERVICE

    Email a: rrhh.juan@empresa.com
    Asunto: "Cambios solicitados"
    Body: "El empleador solicito cambios:
           • Cambiar horario de 9-17 a 8-16
           • Incluir bono por productividad
           • Especificar días de home office"

              │
    ◄─────────┴────────────

    RESULTADO: Contrato VUELVE A BORRADOR
    ├─ RRHH puede editar
    ├─ Cambios solicitados mostrados
    ├─ Puede generar nuevo PDF
    ├─ Puede reenviar aprobación
    └─ Empleador puede revisar nuevamente


ACCIONES DE RRHH DESPUÉS:

1. EDITA EL CONTRATO (en borrador)
   ├─ Cambia horario: 9-17 → 8-16
   ├─ Agrega bono productividad
   └─ Especifica home office (lunes y viernes)

2. GENERA NUEVO PDF
   └─ Con los cambios aplicados

3. REENVÍA A APROBACIÓN
   ├─ Usa mismo email o nuevo
   ├─ Sistema expira aprobación anterior
   ├─ Crea nuevo EnvioAprobacionEmpleador
   └─ Empleador recibe nuevo link

4. ESPERA RESPUESTA
   └─ Esta vez: ✅ APROBADO
```

