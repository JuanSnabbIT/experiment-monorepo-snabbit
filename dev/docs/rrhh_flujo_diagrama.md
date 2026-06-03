# 📊 Diagramas: Usuario RRHH

---

## 1️⃣ DIAGRAMA DE FLUJO PRINCIPAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     USUARIO RRHH - FLUJO PRINCIPAL                          │
└─────────────────────────────────────────────────────────────────────────────┘

                            ╔════════════════╗
                            ║  INICIO SESIÓN ║
                            ║  (Usuario RRHH)║
                            ╚════════════════╝
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │   VER LISTA TRABAJADORES     │
                    │   (Contratos + Estados)      │
                    └──────────────────────────────┘
                                    │
                 ┌──────────────────┬──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
        │  CREAR NUEVO    │  │ VER DETALLE  │  │ CREAR COPIA  │
        │    CONTRATO     │  │   CONTRATO   │  │   CONTRATO   │
        └─────────────────┘  └──────────────┘  └──────────────┘
                 │                  │
                 ▼                  ▼
        ┌─────────────────┐  ┌──────────────────────────┐
        │ WIZARD 7 PASOS  │  │  DETALLE CONTRATO        │
        │ ────────────    │  │  ┌──────────────────────┐│
        │ 1. Básicos      │  │  │ ├─ Datos laborales  ││
        │ 2. Trabajador   │  │  │ ├─ Trabajador       ││
        │ 3. Términos     │  │  │ ├─ Remuneración     ││
        │ 4. Jornada      │  │  │ ├─ Previsión        ││
        │ 5. Remuneración │  │  │ ├─ Documento (PDF)  ││
        │ 6. Previsión    │  │  │ ├─ Anexos           ││
        │ 7. Revisión     │  │  │ ├─ Historial        ││
        └─────────────────┘  │  │ └─ Finiquito        ││
                 │           │  └──────────────────────┘│
                 ▼           │           │               │
        ┌──────────────────┐ │           ▼               │
        │ CONTRATO EN      │ │  ┌─────────────────────┐ │
        │ BORRADOR         │ │  │ ¿ESTADO CONTRATO?   │ │
        │ (Estado = draft) │ │  └─────────────────────┘ │
        └──────────────────┘ │           │               │
                 │           │    ┌──────┴──────┐        │
                 │           │    │             │        │
                 │           ▼    ▼             ▼        │
                 │    ┌──────────┐  ┌─────────────────┐ │
                 │    │ BORRADOR │  │ VIGENTE/OTRAS   │ │
                 │    └──────────┘  └─────────────────┘ │
                 │         │                    │        │
                 │         ▼                    ▼        │
                 │    ┌──────────────┐     ┌──────────┐ │
                 │    │ EDITAR DATOS │     │VER SOLO  │ │
                 │    │ - Trabajador │     │ LECTURA  │ │
                 │    │ - Términos   │     │(Historial)
                 │    │ - Jornada    │     └──────────┘ │
                 │    │ - Sueldo     │           │       │
                 │    │ - Previsión  │           └───┬───┘
                 │    └──────────────┘               │
                 │         │                        ▼
                 │         ▼                    ┌─────────────┐
                 │    ┌──────────────────┐      │CREAR ANEXOS │
                 │    │ GENERAR PDF      │      │─────────────│
                 │    │ ──────────────── │      │- Cambio     │
                 │    │ • Resuelve       │      │  sueldo     │
                 │    │   plantilla      │      │- Cambio     │
                 │    │ • Interpola      │      │  cargo      │
                 │    │   etiquetas      │      │- Cambio     │
                 │    │ • Marca BORRADOR │      │  jornada    │
                 │    │ • Persiste PDF   │      │- Prórroga   │
                 │    └──────────────────┘      │- Otro       │
                 │         │                    └─────────────┘
                 │         ▼                           │
                 │    ┌──────────────────┐            ▼
                 │    │ ENVIAR A         │      ┌──────────────┐
                 │    │ APROBACIÓN       │      │CREAR ANEXO EN│
                 │    │ EMPLEADOR        │      │ESTADO        │
                 │    │ ──────────────── │      │VIGENTE       │
                 │    │ • Ingresa email  │      └──────────────┘
                 │    │ • Genera PDF     │           │
                 │    │   congelado      │           ▼
                 │    │ • Crea UUID      │      ┌──────────────┐
                 │    │ • Transición a   │      │ ANEXO        │
                 │    │   pendiente_apro │      │ BORRADOR     │
                 │    │ • Expira 14 días │      └──────────────┘
                 │    └──────────────────┘           │
                 │         │                        ▼
                 │         ▼                   ┌──────────────┐
        ┌────────┴────────────────────┐       │GENERAR/SUBIR │
        │                             │       │PDF ANEXO     │
        │ ESTADO: pendiente_aprobacion│       └──────────────┘
        │                             │            │
        └─────────────────────────────┘            ▼
                 │                            ┌──────────────┐
                 │      📧 EMAIL AL EMPLEADOR │ ANEXO        │
                 │      (Link UUID público)   │ VIGENTE      │
                 │                            └──────────────┘
                 ▼
        ┌──────────────────────────────────┐
        │ VER ESTADO APROBACIÓN EMPLEADOR  │
        │                                  │
        │ Empleador responde en portal     │
        │ público (sin autenticarse)       │
        └──────────────────────────────────┘
                 │
         ┌───────┼───────┬──────────────┐
         │       │       │              │
         ▼       ▼       ▼              ▼
    ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐
    │APROBADO│ │RECHAZADO│ │CAMBIOS  │ │EXPIRADO│
    │        │ │        │ │SOLICITUD │ │        │
    └────────┘ └────────┘ └──────────┘ └────────┘
         │       │       │              │
         │       │       │              │
         ▼       ▼       ▼              ▼
    ┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
    │ESTADO: │ │ESTADO:│ │VOLVER A│ │REENVIAR  │
    │VIGENTE │ │ANULADO│ │BORRADOR│ │APROBACION│
    └────────┘ └──────┘ └────────┘ └──────────┘
         │       │       │
         ▼       ▼       ▼
    ┌──────────────────────────────┐
    │  ACEPTAR CONTRATO (RRHH)     │
    │  POST /api/aceptar/          │
    │  ──────────────────────────  │
    │  • Valida aprobación empleador│
    │  • Transición a vigente       │
    │  • Sync datos UsuarioEmpresa  │
    │  • Si NUEVO: crea User        │
    │  • Registra aprobación        │
    └──────────────────────────────┘
         │
         ▼
    ┌──────────────────┐
    │ CONTRATO         │
    │ VIGENTE ACTIVO   │
    │ (Listo para usar)│
    └──────────────────┘
         │
         ├─► CREAR ANEXOS (modificaciones)
         ├─► VER HISTORIAL COMPLETO
         ├─► TERMINAR (fin natural)
         │   ├─ Motivo: renuncia, vencimiento, etc.
         │   └─ Estado → terminado
         │
         └─► ANULAR (rescisión)
             ├─ Motivo obligatorio
             └─ Estado → anulado

                    ╔════════════════╗
                    ║  FIN - CONTRATO║
                    ║  FINALIZADO    ║
                    ╚════════════════╝
```

---

## 2️⃣ DIAGRAMA DE CASOS DE USO

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          SISTEMA RRHH                                     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                                                                     │ │
│  │  ╔═══════════════════════════════════════════════════════════════╗ │ │
│  │  ║              CASOS DE USO - USUARIO RRHH                      ║ │ │
│  │  ╚═══════════════════════════════════════════════════════════════╝ │ │
│  │                                                                     │ │
│  │  ┌─────────────┐                                                   │ │
│  │  │   USUARIO   │                                                   │ │
│  │  │    RRHH     │                                                   │ │
│  │  └─────────────┘                                                   │ │
│  │        │                                                           │ │
│  │        │                                                           │ │
│  │    ┌───┴────┬──────────┬──────────┬──────────┬──────────┐         │ │
│  │    │        │          │          │          │          │         │ │
│  │    ▼        ▼          ▼          ▼          ▼          ▼         │ │
│  │  ┌──────────────────────┐    ┌────────────────────────┐           │ │
│  │  │  UC1: Crear Contrato │    │ UC2: Ver Lista de      │           │ │
│  │  │                      │    │     Trabajadores       │           │ │
│  │  │ • Seleccionar empresa│    │                        │           │ │
│  │  │   cliente            │    │ • Filtrar por empresa  │           │ │
│  │  │ • Seleccionar/crear  │    │ • Ver estado contrato  │           │ │
│  │  │   trabajador         │    │ • Acciones rápidas     │           │ │
│  │  │ • Completar 7 pasos  │    │                        │           │ │
│  │  │ • Guardar borrador   │    │ ├─ Ver detalle         │           │ │
│  │  │                      │    │ ├─ Crear nuevo         │           │ │
│  │  └──────────────────────┘    │ └─ Crear copia         │           │ │
│  │                              └────────────────────────┘           │ │
│  │                                                                     │ │
│  │  ┌──────────────────────┐    ┌────────────────────────┐           │ │
│  │  │  UC3: Editar Datos   │    │ UC4: Generar PDF       │           │ │
│  │  │      (Borrador)      │    │                        │           │ │
│  │  │                      │    │ • Resuelve plantilla   │           │ │
│  │  │ • Editar trabajador  │    │ • Interpola etiquetas  │           │ │
│  │  │ • Editar términos    │    │ • Marca BORRADOR       │           │ │
│  │  │ • Editar jornada     │    │ • Persiste PDF         │           │ │
│  │  │ • Editar remuneración│    │                        │           │ │
│  │  │ • Editar previsión   │    │ ╭─────────────────────╮│           │ │
│  │  │                      │    │ │ ALTERNATIVA:        ││           │ │
│  │  │ ⚠️ Solo en BORRADOR │    │ │ • Subir PDF manual  ││           │ │
│  │  │                      │    │ ╰─────────────────────╯│           │ │
│  │  └──────────────────────┘    └────────────────────────┘           │ │
│  │                                                                     │ │
│  │  ┌──────────────────────┐    ┌────────────────────────┐           │ │
│  │  │  UC5: Crear Copia    │    │ UC6: Enviar a          │           │ │
│  │  │      Contrato        │    │     Aprobación         │           │ │
│  │  │                      │    │     Empleador          │           │ │
│  │  │ • Clona datos        │    │                        │           │ │
│  │  │ • Estado: borrador   │    │ • Ingresa email        │           │ │
│  │  │ • Omite: PDF, firma  │    │ • Genera PDF congelado │           │ │
│  │  │ • Ingresa nombre     │    │ • Crea UUID único      │           │ │
│  │  │                      │    │ • Transición: pendiente│           │ │
│  │  └──────────────────────┘    │ • Expira: 14 días      │           │ │
│  │                              │ • Envía email          │           │ │
│  │                              └────────────────────────┘           │ │
│  │                                                                     │ │
│  │  ┌──────────────────────┐    ┌────────────────────────┐           │ │
│  │  │  UC7: Ver Estado     │    │ UC8: Aceptar Aprobación│           │ │
│  │  │      Aprobación      │    │      Empleador         │           │ │
│  │  │                      │    │                        │           │ │
│  │  │ • ¿Pendiente?        │    │ • Valida aprobación    │           │ │
│  │  │ • ¿Aprobado?         │    │ • Transición: vigente  │           │ │
│  │  │ • ¿Rechazado?        │    │ • Sync UsuarioEmpresa  │           │ │
│  │  │ • ¿Cambios?          │    │ • Si NUEVO: crea User  │           │ │
│  │  │ • Fecha respuesta    │    │ • Registra aprobación  │           │ │
│  │  │                      │    │ • Envía notificaciones │           │ │
│  │  └──────────────────────┘    └────────────────────────┘           │ │
│  │                                                                     │ │
│  │  ┌──────────────────────┐    ┌────────────────────────┐           │ │
│  │  │  UC9: Cambiar Estado │    │ UC10: Crear Anexo      │           │ │
│  │  │                      │    │      (Modificación)    │           │ │
│  │  │ • Terminar contrato  │    │                        │           │ │
│  │  │   ├─ Motivo termino  │    │ • Selecciona tipo      │           │ │
│  │  │   ├─ Fecha real      │    │   ├─ Cambio sueldo     │           │ │
│  │  │   └─ Observaciones   │    │   ├─ Cambio cargo      │           │ │
│  │  │                      │    │   ├─ Cambio jornada    │           │ │
│  │  │ • Anular contrato    │    │   ├─ Prórroga          │           │ │
│  │  │   ├─ Motivo anulación│    │   └─ Otro              │           │ │
│  │  │   └─ (OBLIGATORIO)   │    │                        │           │ │
│  │  │                      │    │ • Ingresa fecha        │           │ │
│  │  │ • Descartar (rechazo)│    │ • Describe cambios     │           │ │
│  │  │                      │    │ • Genera PDF anexo     │           │ │
│  │  │ ⚠️ Validar estado  │    │ • Estado: vigente      │           │ │
│  │  └──────────────────────┘    │ • Si prórroga: actualiza│           │ │
│  │                              │   fecha_termino        │           │ │
│  │                              └────────────────────────┘           │ │
│  │                                                                     │ │
│  │  ┌──────────────────────┐    ┌────────────────────────┐           │ │
│  │  │  UC11: Ver Historial │    │ UC12: Ver Catálogos    │           │ │
│  │  │        Completo      │    │       (Lectura)        │           │ │
│  │  │                      │    │                        │           │ │
│  │  │ • Timeline de cambios│    │ • Cargos               │           │ │
│  │  │ • Quién cambió       │    │ • AFP                  │           │ │
│  │  │ • Cuándo cambió      │    │ • Bancos               │           │ │
│  │  │ • Qué cambió (diff)  │    │ • Turnos laborales     │           │ │
│  │  │ • Aprobaciones       │    │ • Configuración legal  │           │ │
│  │  │ • Envíos empleador   │    │                        │           │ │
│  │  │ • Respuestas         │    │ • Filtrar por empresa  │           │ │
│  │  │                      │    │ • Crear nuevos         │           │ │
│  │  │ Actor: RRHH/Sistema/ │    │ • Editar (solo empresa)│           │ │
│  │  │         Cliente      │    │                        │           │ │
│  │  └──────────────────────┘    └────────────────────────┘           │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  SISTEMAS EXTERNOS:                                                      │
│  ┌─────────────┐      ┌──────────────┐      ┌──────────────┐           │
│  │  EMPLEADOR  │◄─────│ Email Service│      │ Sistema Auth │           │
│  │  (Portal)   │      │              │      │              │           │
│  └─────────────┘      └──────────────┘      └──────────────┘           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ MATRIZ DE RESPONSABILIDADES

```
╔════════════════════╦═════════════╦════════════════╦════════════════════╗
║   Caso de Uso      ║   RRHH      ║   EMPLEADOR    ║   SISTEMA          ║
╠════════════════════╬═════════════╬════════════════╬════════════════════╣
║ UC1: Crear Contrato║ ✅ ACTIVO   │ ❌ No aplica   │ Persistir en BD    ║
║ UC2: Ver Lista     ║ ✅ ACTIVO   │ ❌ No aplica   │ Filtrar multi-ten. ║
║ UC3: Editar Datos  ║ ✅ ACTIVO   │ ❌ No aplica   │ Validar estado     ║
║                    ║ (borrador)  │                │ Persistir cambios  ║
║ UC4: Generar PDF   ║ ✅ ACTIVO   │ ❌ No aplica   │ Plantilla + render ║
║ UC5: Crear Copia   ║ ✅ ACTIVO   │ ❌ No aplica   │ Clonar datos       ║
║ UC6: Enviar Aprob. ║ ✅ ACTIVO   │ ❌ No aplica   │ Email + UUID       ║
║ UC7: Ver Estado    ║ ✅ ACTIVO   │ ❌ No aplica   │ Consultar BBDD     ║
║ UC8: Aceptar Aprob.║ ✅ ACTIVO   │ ❌ No aplica   │ Transición estado  ║
║                    ║             │                │ Crear User si nuevo║
║ UC9: Cambiar Estado║ ✅ ACTIVO   │ ❌ No aplica   │ Validar máquina    ║
║                    ║ (terminar/  │                │ estados            ║
║                    ║  anular)    │                │                    ║
║ UC10: Crear Anexo  ║ ✅ ACTIVO   │ ❌ No aplica   │ Generar número     ║
║                    ║ (vigente)   │                │ Actualizar contrato║
║ UC11: Ver Historial║ ✅ ACTIVO   │ ❌ No aplica   │ Recopilar timeline ║
║ UC12: Ver Catálog. ║ ✅ ACTIVO   │ ❌ No aplica   │ Filtrar por empresa║
║────────────────────╟─────────────╟────────────────╟────────────────────║
║ CASO EXTERNO:      ║             │                │                    ║
║ Empleador responde ║ ❌ No        │ ✅ ACTIVO      │ Email público +    ║
║ aprobación         │ participa   │ (portal        │ UUID sin auth      ║
║                    │             │ público)       │                    ║
╚════════════════════╩═════════════╩════════════════╩════════════════════╝
```

---

## 4️⃣ FLUJO EXTENDIDO: CREAR CONTRATO (UC1 - Detallado)

```
┌─────────────────────────────────────────────────────────────────┐
│             UC1: CREAR CONTRATO LABORAL (WIZARD)                │
└─────────────────────────────────────────────────────────────────┘

PRE-CONDICIONES:
  ✓ Usuario autenticado con rol RRHH
  ✓ Usuario tiene empresa asociada
  ✓ Si prestadora: acceso a empresas cliente

FLUJO PRINCIPAL:
┌─────────────────────────────────────────────────────────────────┐
│ 1. RRHH abre modal "Crear Contrato"                             │
│    └─ Selecciona empresa CLIENTE (si aplica)                    │
├─────────────────────────────────────────────────────────────────┤
│ 2. PASO 1: BÁSICOS                                              │
│    └─ Ingresa: referencia_interna (ej: "CONT-2025-001")         │
├─────────────────────────────────────────────────────────────────┤
│ 3. PASO 2: TRABAJADOR                                           │
│    ├─ Selecciona MODO:                                          │
│    │  ├─ EXISTENTE: (busca UsuarioEmpresa)                      │
│    │  │  └─ Selecciona trabajador de lista filtrada             │
│    │  │                                                          │
│    │  └─ NUEVO: (crea datos en JSON)                            │
│    │     ├─ Email (único, validación)                           │
│    │     ├─ Nombre completo (first_name, last_name)             │
│    │     ├─ RUT (validación dígito)                             │
│    │     ├─ Sucursal destino                                    │
│    │     └─ Datos opcionales: nacionalidad, fecha_nacimiento,   │
│    │        dirección                                           │
├─────────────────────────────────────────────────────────────────┤
│ 4. PASO 3: TÉRMINOS LABORALES                                   │
│    ├─ Tipo contrato: Indefinido / Plazo fijo / Reemplazo        │
│    ├─ Fecha inicio (obligatorio)                                │
│    ├─ Fecha término:                                            │
│    │  ├─ Si PLAZO FIJO: Obligatorio                             │
│    │  └─ Otros: Opcional                                        │
│    ├─ Cargo (autocomplete desde CargoCatalogo)                  │
│    ├─ Funciones (texto libre)                                   │
│    ├─ Si REEMPLAZO:                                             │
│    │  ├─ Causal: Licencia médica, vacaciones, prenatal, etc.    │
│    │  └─ Trabajador reemplazado (busca en lista)                │
│    ├─ Datos legales (Art. 10 Código del Trabajo):               │
│    │  ├─ Estado civil                                           │
│    │  ├─ Profesión u oficio                                     │
│    │  └─ Sistema salud (Fonasa, Isapre, Otro)                   │
├─────────────────────────────────────────────────────────────────┤
│ 5. PASO 4: JORNADA                                              │
│    ├─ Tipo jornada:                                             │
│    │  ├─ COMPLETA (8h):                                         │
│    │  │  ├─ Hora inicio                                         │
│    │  │  ├─ Hora fin                                            │
│    │  │  └─ Tiempo colación (default 30 min)                    │
│    │  │                                                          │
│    │  ├─ PARCIAL:                                               │
│    │  │  ├─ Horas semanales                                     │
│    │  │  ├─ Hora inicio                                         │
│    │  │  ├─ Hora fin                                            │
│    │  │  └─ Tiempo colación                                     │
│    │  │                                                          │
│    │  └─ TURNOS:                                                │
│    │     ├─ Selecciona turnos (del catálogo de empresa)         │
│    │     ├─ Cada turno tiene: nombre, hora inicio, fin, días    │
│    │     └─ Sistema calcula horas automáticamente               │
│    │                                                             │
│    ├─ Lugar de trabajo                                          │
│    └─ Días de la semana trabajados                              │
├─────────────────────────────────────────────────────────────────┤
│ 6. PASO 5: REMUNERACIONES                                       │
│    ├─ Sueldo base:                                              │
│    │  ├─ Si CLP: Mínimo $500.000                                │
│    │  └─ Otros: Sin mínimo validado                             │
│    ├─ Moneda: CLP / USD / UF                                    │
│    ├─ Gratificación: Anual (Art. 47) / Mensual (Art. 50) /      │
│    │                 No aplica                                  │
│    ├─ Bono movilización                                         │
│    └─ Bono colación                                             │
├─────────────────────────────────────────────────────────────────┤
│ 7. PASO 6: PREVISIÓN Y BANCO                                    │
│    ├─ AFP:                                                      │
│    │  ├─ Selecciona de catálogo                                 │
│    │  └─ Muestra tasa de cotización                             │
│    ├─ Sistema salud: Fonasa / Isapre / Otro                     │
│    │  └─ Si OTRO: campo texto para nombre                       │
│    ├─ Banco:                                                    │
│    │  ├─ Selecciona de catálogo                                 │
│    ├─ Tipo cuenta: Corriente / Ahorros / Etc.                   │
│    └─ Número cuenta (validación de formato)                     │
├─────────────────────────────────────────────────────────────────┤
│ 8. PASO 7: REVISIÓN + PLANTILLA                                 │
│    ├─ Resumen visual de todos los datos:                        │
│    │  ├─ Trabajador y empresa                                   │
│    │  ├─ Términos laborales                                     │
│    │  ├─ Jornada y lugar                                        │
│    │  ├─ Remuneración                                           │
│    │  └─ Previsión                                              │
│    ├─ Selecciona PLANTILLA de contrato:                         │
│    │  ├─ Busca por nombre                                       │
│    │  ├─ Filtra por empresa                                     │
│    │  └─ Muestra previsualizaciones                             │
│    └─ Botón: "CREAR CONTRATO"                                   │
├─────────────────────────────────────────────────────────────────┤
│ 9. SISTEMA:                                                     │
│    ├─ Valida todos los campos contra schema Yup                 │
│    ├─ Si trabajador NUEVO: Guarda en datos_trabajador_nuevo     │
│    │                       (JSON)                               │
│    ├─ Si trabajador EXISTENTE: Linkea UsuarioEmpresa            │
│    ├─ Crea ContratoTrabajador con estado = "borrador"           │
│    ├─ Persiste en BBDD                                          │
│    └─ Retorna contrato creado                                   │
├─────────────────────────────────────────────────────────────────┤
│ 10. RESULTADO:                                                  │
│    ✅ Contrato creado en ESTADO "BORRADOR"                      │
│    ├─ Redirige a: /rrhh/contrato/{id}/                          │
│    └─ Muestra pestañas para edición                             │
├─────────────────────────────────────────────────────────────────┤

FLUJOS ALTERNATIVOS:
  • Si email EXISTS en NUEVO: Error, mostrar mensaje
  • Si sucursal DELETED: Error, validar acceso
  • Si cambios SOLICITADOS previos: Vuelve a BORRADOR, RRHH edita

POST-CONDICIONES:
  ✓ Contrato en estado "borrador"
  ✓ Listo para: editar, generar PDF, enviar aprobación
  ✓ Historial registra creación

```

---

## 5️⃣ FLUJO DETALLADO: APROBACIÓN (UC6-UC8)

```
┌──────────────────────────────────────────────────────────────────────┐
│          APROBACIÓN EMPLEADOR: Enviar → Responder → Aceptar          │
└──────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────┐
                        │ Contrato en      │
                        │ BORRADOR         │
                        │ (PDF generado)   │
                        └──────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ UC6: ENVIAR APROBACIÓN │
                    │                        │
                    │ • RRHH ingresa:        │
                    │   └─ Email empleador   │
                    │                        │
                    │ • Sistema:             │
                    │   ├─ Genera PDF        │
                    │   ├─ Congela PDF       │
                    │   ├─ Crea UUID único   │
                    │   ├─ Crea record:      │
                    │   │  EnvioAprobación   │
                    │   ├─ Transición:       │
                    │   │  borrador →        │
                    │   │  pendiente_aprobación
                    │   └─ Envía email       │
                    │      (con link UUID)   │
                    └────────────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ ESTADO:                │
                    │ pendiente_aprobación   │
                    │                        │
                    │ Expira: 14 días        │
                    │ (desde fecha_envio)    │
                    └────────────────────────┘
                                │
                    📧 Email al EMPLEADOR
                    └─ Link público (sin auth)
                       /rrhh/aprobacion/{uuid}/
                                │
                                ▼
                    ┌────────────────────────────┐
                    │ PORTAL PÚBLICO (Empleador) │
                    │                            │
                    │ • GET /api/public/         │
                    │        contrato-aprobacion │
                    │        /{uuid}/            │
                    │                            │
                    │ • Empleador lee:           │
                    │   ├─ Datos trabajador      │
                    │   ├─ Cargo                 │
                    │   ├─ Tipo contrato         │
                    │   ├─ Fechas                │
                    │   └─ Descarga PDF          │
                    │      (BORRADOR con marca) │
                    │                            │
                    │ • Botones:                 │
                    │   ├─ ✅ APROBAR            │
                    │   ├─ ❌ RECHAZAR           │
                    │   └─ ⚠️ SOLICITAR CAMBIOS  │
                    └────────────────────────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
            APROBADO       RECHAZADO      CAMBIOS SOL.
                 │              │              │
                 ▼              ▼              ▼
        ┌─────────────┐ ┌────────────┐ ┌──────────────┐
        │ Formulario: │ │ Formulario:│ │ Formulario:  │
        │ • Envía:    │ │ • Motivo   │ │ • Lista texto│
        │   decision: │ │   rechazo  │ │   cambios    │
        │   aprobado  │ │ • Envía:   │ │ • Envía:     │
        │             │ │   decision:│ │   decision:  │
        │             │ │   rechazado│ │   cambios    │
        │             │ │            │ │              │
        │ • Opcional: │ │ • Envía    │ │ • Opcional:  │
        │   notificar │ │   email    │ │   notificar  │
        │   trabajador│ │   a RRHH   │ │   trabajador │
        └─────────────┘ └────────────┘ └──────────────┘
                 │              │              │
                 ▼              ▼              ▼
        ┌──────────────────────────────────────────┐
        │ POST /api/public/contrato-aprobacion/    │
        │      {uuid}/responder/                   │
        │                                          │
        │ • Registra:                              │
        │   ├─ decision (aprobado/rechazado/cambios)
        │   ├─ fecha_respuesta                     │
        │   ├─ motivo_rechazo (si aplica)          │
        │   ├─ cambios_solicitados (si aplica)     │
        │   ├─ IP respuesta                        │
        │   └─ notificar_trabajador flag           │
        │                                          │
        │ • Transiciones según decision:           │
        │                                          │
        │   ✅ APROBADO:                           │
        │      ├─ Contrato: pendiente → vigente    │
        │      ├─ Si NUEVO: crear User + UsuarioEmp
        │      ├─ Si NUEVO: crear Invitación      │
        │      ├─ Envía email a trabajador         │
        │      │  (PDF + link activación)          │
        │      └─ Email a RRHH: "Aprobado"         │
        │                                          │
        │   ❌ RECHAZADO:                          │
        │      ├─ Contrato: vigente → anulado      │
        │      └─ Email a RRHH: "Rechazado"        │
        │                                          │
        │   ⚠️ CAMBIOS SOLICITADOS:                │
        │      ├─ Contrato: pendiente_aprob        │
        │      │            → borrador (regresa)   │
        │      ├─ Mostrar cambios solicitados      │
        │      └─ Email a RRHH con detalles        │
        └──────────────────────────────────────────┘
                 │              │              │
                 ▼              ▼              ▼
        ┌──────────────────────────────────────────┐
        │ UC7: RRHH VER ESTADO APROBACIÓN          │
        │                                          │
        │ GET /api/rrhh/contratos/{id}/            │
        │     estado-aprobacion-empleador/         │
        │                                          │
        │ • Muestra en modal/sidebar:              │
        │   ├─ Decision actual                     │
        │   ├─ Fecha envío                         │
        │   ├─ Fecha respuesta                     │
        │   ├─ Motivo (si rechazó)                 │
        │   ├─ Cambios (si solicitó)               │
        │   └─ Fecha expiración                    │
        │                                          │
        │ RRHH ACCIONES:                           │
        │   ├─ Si APROBADO:                        │
        │   │  └─ Botón: "Aceptar en el sistema"   │
        │   ├─ Si RECHAZADO:                       │
        │   │  └─ Ver motivo, archivar             │
        │   ├─ Si CAMBIOS:                         │
        │   │  └─ Editar contrato en BORRADOR      │
        │   ├─ Si EXPIRADO:                        │
        │   │  └─ Reenviar aprobación              │
        │   └─ Si PENDIENTE:                       │
        │      └─ Esperar respuesta                │
        └──────────────────────────────────────────┘
                 │
                 └─────┐
                       ▼
        ┌────────────────────────────────────┐
        │ UC8: ACEPTAR EN SISTEMA (Solo RRHH)│
        │                                    │
        │ POST /api/rrhh/contratos/{id}/     │
        │      aceptar/                      │
        │                                    │
        │ ⚠️ VALIDACIONES:                   │
        │   ├─ Estado debe ser:              │
        │   │  pendiente_aprobacion          │
        │   └─ Empleador debe haber          │
        │      aprobado (decision=aprobado)  │
        │                                    │
        │ SISTEMA:                           │
        │   ├─ Transición:                   │
        │   │  pendiente_aprobacion → vigente│
        │   ├─ Registra:                     │
        │   │  ├─ fecha_aprobacion (now)     │
        │   │  └─ aceptado_por (user actual) │
        │   ├─ SYNC UsuarioEmpresa:          │
        │   │  ├─ ue.cargo = cargo           │
        │   │  └─ ue.fecha_contrato = inicio │
        │   ├─ Si NUEVO (datos_trabajador    │
        │   │  _nuevo):                      │
        │   │  ├─ Crear User (is_active=F)   │
        │   │  ├─ Crear UsuarioEmpresa       │
        │   │  ├─ Llenar campos extra        │
        │   │  ├─ Crear Invitación (7 días) │
        │   │  └─ Enviar email invitación    │
        │   └─ Historial: evento "aprobacion"
        │                                    │
        └────────────────────────────────────┘
                       │
                       ▼
        ╔──────────────────────────────╗
        ║   ✅ CONTRATO VIGENTE       ║
        ║   (Listo para usar)          ║
        ║                              ║
        ║   Siguientes acciones:        ║
        ║   • Crear anexos              ║
        ║   • Ver historial             ║
        ║   • Terminar                  ║
        ║   • Anular                    ║
        ╚──────────────────────────────╝
```

---

## 6️⃣ MATRIZ DE VALIDACIONES POR ESTADO

```
╔════════════════════╦═══════════╦════════════════╦═════════════════════╗
║    ACCIÓN RRHH     ║ BORRADOR  ║ PENDIENTE APROB║ VIGENTE/TERMINADO   ║
╠════════════════════╬═══════════╬════════════════╬═════════════════════╣
║ Editar datos       ║    ✅     ║       ❌       ║         ❌          ║
║ Generar PDF        ║    ✅     ║       ✅       ║         ✅          ║
║ Subir PDF manual   ║    ✅     ║       ✅       ║         ✅          ║
║ Enviar aprobación  ║    ✅     ║       ❌       ║         ❌          ║
║ Ver estado aprob.  ║    ⚠️     ║       ✅       ║         ✅          ║
║ Aceptar aprobación ║    ❌     ║       ✅*      ║         ❌          ║
║ Cambiar a vigente  ║    ✅**   ║       ✅*      ║         ❌          ║
║ Crear anexo        ║    ❌     ║       ❌       ║         ✅          ║
║ Terminar           ║    ❌     ║       ❌       ║         ✅          ║
║ Anular             ║    ❌     ║       ❌       ║         ✅          ║
║ Descartar          ║    ✅     ║       ✅       ║         ❌          ║
║ Crear copia        ║    ✅     ║       ✅       ║         ✅          ║
║ Ver historial      ║    ✅     ║       ✅       ║         ✅          ║
╚════════════════════╩═══════════╩════════════════╩═════════════════════╝

LEYENDA:
  ✅ = Permitido
  ❌ = No permitido
  ⚠️  = Conditionally (si hay aprobación pendiente)
  *  = Si empleador aprobó
  ** = Si empleador aprobó (via wizard o cambiar-estado)
```

