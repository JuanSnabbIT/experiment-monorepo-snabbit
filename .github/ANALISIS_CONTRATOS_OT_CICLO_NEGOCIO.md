# 🔄 Análisis: Contratos ↔ Órdenes de Trabajo - Ciclo de Negocio

**Fecha**: 2025-11-07  
**Contexto**: Respuesta a preguntas clave sobre el flujo de negocio del ERP  
**Meta Final**: Sistema debe formalizar comunicación de gastos extras al cliente

---

## 📋 Índice

1. [Respuestas Directas a las Preguntas](#respuestas-directas-a-las-preguntas)
2. [¿Los contratos solo se aceptan por correo?](#1-los-contratos-solo-se-aceptan-por-correo)
3. [¿El envío de correos está implementado?](#2-el-envío-de-correos-está-implementado)
4. [¿Cómo se relacionan Contratos ↔ OT?](#3-cómo-se-relacionan-contratos-↔-ot)
5. [Flujo de Negocio Completo (Estado Actual)](#flujo-de-negocio-completo-estado-actual)
6. [Gaps de Implementación vs. Meta Final](#gaps-de-implementación-vs-meta-final)
7. [Roadmap Propuesto](#roadmap-propuesto)

---

## Respuestas Directas a las Preguntas

### 1. ¿Los contratos SOLO se aceptan por correo?

**Respuesta: Sí, PERO el flujo está incompleto.**

#### 📧 Flujo Diseñado (Teoría)

```
1. Admin crea contrato (estado: 'borrador')
2. Admin vincula usuarios al contrato (UsuarioVinculadoContrato)
3. Admin presiona "Enviar Contrato" en frontend
4. Backend crea EnvioContratoFirmaUsuario con UUID único
5. Celery envía email con link /firmar-contrato/{uuid}
6. Usuario externo abre link (página pública sin autenticación)
7. Usuario firma en canvas digital
8. Frontend PATCH a /api/envio-firma/{uuid}/firmar/
9. Backend guarda firma (firmado=True)
10. ⚠️ LÓGICA FALTANTE: Verificar si todos firmaron → Contrato pasa a 'activo'
```

#### ⚠️ Problemas Actuales

| Problema | Impacto | Estado |
|----------|---------|--------|
| No hay validación de unicidad | Múltiples envíos duplicados por usuario | 🔴 CRÍTICO |
| Falta activación automática | Contrato nunca pasa de 'borrador' a 'activo' | 🔴 CRÍTICO |
| No hay workflow alternativo | Solo se puede firmar via correo (no hay UI interna) | 🟡 MEDIUM |

#### 💡 Workflow Alternativo (NO IMPLEMENTADO)

**Posible**: Crear un flujo interno donde usuarios autenticados firmen sin correo:
- Dashboard muestra "Contratos pendientes de firma"
- Botón "Firmar contrato" abre modal con canvas
- Firma se guarda directamente en `EnvioContratoFirmaUsuario`
- No requiere envío de correo

**Estado**: ❌ No existe en el código actual.

---

### 2. ¿El envío de correos está implementado?

**Respuesta: Sí, está COMPLETAMENTE implementado con Celery.**

#### ✅ Confirmación Técnica

**Tarea Celery**: `core/tasks.py`

```python
@shared_task
def send_email_task(subject, recipient_list, html_body, titulo, url_boton, text_boton, cc=[], pdf_attachment=None):
    """
    Tarea compartida para enviar correos electrónicos con variables dinámicas.
    """
    # Template HTML completo con estilos responsive
    # Soporta adjuntos PDF
    # Envío mediante Django EmailMessage
```

**Invocación en Contratos**: `contratos/views.py` (líneas 580-605)

```python
def _enviar_correo(self, envio: EnvioContratoFirmaUsuario):
    subject = "¡Tu contrato está listo para firmar!"
    recipient_list = [envio.usuario.usuario.usuario.email]
    html_body = (
        "<p>Hola,</p>"
        "<p>Te hemos enviado (o reenviado) tu contrato para que lo firmes.</p>"
        "<p>Por favor haz clic en el botón de abajo para revisar y firmar:</p>"
    )
    titulo       = "Firma tu contrato"
    frontend_url = os.getenv("FRONTEND_URL", "https://app.gestionsnabb-it.cl")
    url_boton    = f"{frontend_url}/firmar-contrato/{envio.uuid}"
    text_boton   = "Firmar contrato ahora"

    # Tarea asíncrona de Celery ✅
    send_email_task.delay(
        subject,
        recipient_list,
        html_body,
        titulo,
        url_boton,
        text_boton,
    )
```

#### 🔧 Configuración Requerida

Para que funcione en tu entorno local:

1. **Variables de entorno** (`.env`):
   ```bash
   FRONTEND_URL=http://localhost:5173  # URL del frontend Vite
   CORREO_APPWEB=noreply@tudominio.cl  # Email remitente
   EMAIL_HOST=smtp.gmail.com           # Servidor SMTP
   EMAIL_PORT=587
   EMAIL_HOST_USER=tu-email@gmail.com
   EMAIL_HOST_PASSWORD=tu-app-password
   EMAIL_USE_TLS=True
   ```

2. **Celery Worker activo**:
   ```cmd
   REM Desde backend/
   ENV\Scripts\python.exe -m celery -A sw_erp worker --loglevel=info
   ```

3. **Redis/RabbitMQ corriendo** (broker de Celery):
   - Ver configuración en `backend/sw_erp/celery.py`

#### ✅ Conclusión: Email está LISTO

El sistema de correos **funciona correctamente** si:
- Celery worker está corriendo
- Broker (Redis/RabbitMQ) está activo
- Variables de entorno están configuradas

**Documentación adicional**: Ver `guias/desarrollo.md` para setup completo de Celery.

---

### 3. ¿Cómo se relacionan Contratos ↔ OT?

**Respuesta: NO HAY relación directa FK en DB. Interactúan indirectamente mediante flujo de negocio.**

#### 🔍 Análisis de Modelos

**`ContratoEmpresaCliente` (contratos/models.py)**:
```python
class ContratoEmpresaCliente(ModeloBaseHistorico):
    empresa_prestadora = FK(Empresa)
    empresa_cliente = FK(Empresa)
    estado = CharField(choices=ESTADOS_CONTRATO)  # borrador, activo, suspendido, finalizado
    tipo = CharField(choices=TIPO_CONTRATO)        # servicios, licencia, mixto
    fecha_inicio = DateField()
    fecha_fin = DateField(nullable)
    # ... servicios, licencias, visitas, usuarios vinculados
```

**NO tiene**:
- ❌ FK a `OrdenDeTrabajo`
- ❌ ManyToMany a `OrdenDeTrabajo`
- ❌ Campo `ordenes_trabajo_relacionadas`

---

**`OrdenDeTrabajo` (ordentrabajo/models.py)**:
```python
class OrdenDeTrabajo(ModeloBaseHistorico):
    empresa = FK(Empresa)  # Empresa que emite la OT
    cliente = FK(Empresa)  # Empresa cliente que recibe el servicio
    estado = CharField(choices=ESTADOS_ORDEN)  # pendiente, en_proceso, completada, cerrada, facturada
    responsable_empresa = FK(UsuarioEmpresa)
    # ... detalles de trabajo, adjuntos, gastos
```

**NO tiene**:
- ❌ FK a `ContratoEmpresaCliente`
- ❌ Campo `contrato_asociado`

---

#### 🔗 Relación INDIRECTA (Flujo de Negocio)

**Conexión 1: Mismo par Empresa-Cliente**

```python
# Contrato define la relación comercial
contrato = ContratoEmpresaCliente.objects.get(
    empresa_prestadora=mi_empresa,
    empresa_cliente=cliente_x,
    estado='activo'
)

# OT ejecuta trabajos para ese cliente
ot = OrdenDeTrabajo.objects.create(
    empresa=mi_empresa,
    cliente=cliente_x,  # ⚠️ Mismo cliente del contrato, pero sin FK
    descripcion="Instalación de servidor"
)
```

**⚠️ Problema**: No hay garantía de que la OT esté cubierta por un contrato activo.

---

**Conexión 2: DetalleTrabajo → Cotizacion (GenericForeignKey)**

```python
# Cotizacion menciona servicios del contrato
cotizacion = Cotizacion.objects.create(
    empresa=mi_empresa,
    cliente=cliente_x,
    estado='aceptada'
)

# DetalleTrabajo puede vincularse a la cotización
detalle = DetalleTrabajo.objects.create(
    orden=ot,
    content_type=ContentType.objects.get(app_label='cotizaciones', model='cotizacion'),
    trabajo_id=cotizacion.id  # GenericFK
)
```

**⚠️ Problema**: La relación es **Cotizacion ← DetalleTrabajo**, no **Contrato ← OT**.

---

**Conexión 3: Servicios del Contrato ↔ Trabajo Ejecutado**

```python
# Contrato tiene servicios definidos
contrato_servicio = ContratoServicio.objects.create(
    contrato=contrato,
    servicio_generico=servicio_mantenimiento,
    cantidad=12  # visitas anuales
)

# OT ejecuta uno de esos servicios
ot = OrdenDeTrabajo.objects.create(
    empresa=contrato.empresa_prestadora,
    cliente=contrato.empresa_cliente,
    descripcion="Visita de mantenimiento #3 del contrato"
)
```

**⚠️ Problema**: No hay validación automática de que la OT consuma un servicio del contrato.

---

#### 📊 Diagrama de Relación Actual

```
┌──────────────────────┐                       ┌──────────────────────┐
│ ContratoEmpresaCliente│                       │   OrdenDeTrabajo     │
├──────────────────────┤                       ├──────────────────────┤
│ empresa_prestadora   │ ─────┐           ┌──→ │ empresa              │
│ empresa_cliente      │      │ MISMO PAR │    │ cliente              │
│ estado: 'activo'     │      └───────────┘    │ estado: 'pendiente'  │
│ servicios: [...]     │                       │ detalles: [...]      │
└──────────────────────┘                       └──────────────────────┘
        │                                               │
        │ 1:N                                          │ 1:N
        ↓                                               ↓
┌──────────────────────┐                       ┌──────────────────────┐
│  ContratoServicio    │                       │   DetalleTrabajo     │
├──────────────────────┤                       ├──────────────────────┤
│ servicio: "Mantenim."│                       │ trabajo (GenericFK)  │
│ cantidad: 12         │                       │ └→ Cotizacion        │
└──────────────────────┘                       │    VisitaSoporte     │
                                                │    Compra            │
                                                └──────────────────────┘

⚠️ NO HAY FK DIRECTA ENTRE CONTRATO Y OT
```

---

#### ❌ Conclusión: Relación NO IMPLEMENTADA

**Diseño esperado** (para tu meta final):

```python
class OrdenDeTrabajo(ModeloBaseHistorico):
    # ... campos existentes ...
    
    # ✅ FALTANTE: FK al contrato
    contrato = models.ForeignKey(
        'contratos.ContratoEmpresaCliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_trabajo',
        help_text="Contrato bajo el cual se ejecuta esta OT"
    )
```

**Estado actual**: ❌ Este campo **NO EXISTE**.

---

## Flujo de Negocio Completo (Estado Actual)

### Fase 1: Contrato (Acuerdo Comercial)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Empresa crea contrato con cliente                            │
│    - Define servicios (mantenimiento, licencias, visitas)       │
│    - Establece vigencia (fecha_inicio → fecha_fin)              │
│    - Estado inicial: 'borrador'                                 │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Envía contrato para firma a usuarios vinculados             │
│    - Celery envía correo con link /firmar-contrato/{uuid}      │
│    - Usuarios firman en página pública                          │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. ⚠️ MANUAL: Admin marca contrato como 'activo' via Django Admin│
│    (Debería ser automático cuando todos firman)                │
└─────────────────────────────────────────────────────────────────┘
```

**Estado**: Contrato define **QUÉ** servicios se prestarán, **CUÁNTO** cuestan, **HASTA CUÁNDO** son válidos.

---

### Fase 2: Cotización (Pre-venta de Servicios Puntuales)

```
┌─────────────────────────────────────────────────────────────────┐
│ 4. Cliente solicita servicio específico (ej: instalación)      │
│    - Empresa crea Cotizacion                                    │
│    - Define ítems, costos, términos                             │
│    - Estado inicial: 'pendiente'                                │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Cliente acepta cotización                                    │
│    - Cotizacion.estado = 'aceptada'                             │
└─────────────────────────────────────────────────────────────────┘
```

**Estado**: Cotización define **UN TRABAJO** específico que se ejecutará.

---

### Fase 3: Orden de Trabajo (Ejecución)

```
┌─────────────────────────────────────────────────────────────────┐
│ 6. Empresa crea OrdenDeTrabajo                                  │
│    - Vincula empresa + cliente (mismo par del contrato)        │
│    - Asigna responsable y técnicos                              │
│    - Estado inicial: 'pendiente'                                │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Crea DetalleTrabajo vinculado a Cotizacion (GenericFK)      │
│    - DetalleTrabajo.trabajo → Cotizacion.id                     │
│    - Técnico asignado, estado: 'pendiente'                      │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Asigna insumos (GuiaSalida) al detalle                      │
│    - Reserva ítems de bodega                                    │
│    - DetalleTrabajo.insumo → GuiaSalida                         │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Técnico inicia trabajo                                       │
│    - DetalleTrabajo.estado = 'en_proceso'                       │
│    - Aprueba guía de salida (firma digital)                     │
│    - Items salen de bodega                                      │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 10. Durante ejecución: Registra gastos extras                  │
│     - Crea DetalleGastoRendicionOT                              │
│       • categoria: "Transporte", "Alimentación", "Material extra"│
│       • cantidad, monto_unitario, monto_total                    │
│       • fecha_gasto                                              │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 11. Técnico completa trabajo                                   │
│     - DetalleTrabajo.estado = 'completado'                      │
│     - OrdenDeTrabajo.estado = 'completada'                      │
└─────────────────────────────────────────────────────────────────┘
```

**Estado**: OT ejecuta el trabajo. Gastos extras se registran en `DetalleGastoRendicionOT`.

---

### Fase 4: Rendición (Reporte de Gastos)

```
┌─────────────────────────────────────────────────────────────────┐
│ 12. Técnico/Admin crea Rendicion                                │
│     - Agrupa gastos internos + gastos de OT + compras           │
│     - ItemRendicion (GenericFK) → DetalleGastoRendicionOT       │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 13. Genera PDF de rendición                                     │
│     - Función: generar_rendicion_pdf()                          │
│     - Incluye: categorías, detalles, montos, total             │
│     - Se puede descargar desde UI                               │
└─────────────────────────────────────────────────────────────────┘
```

**Estado**: Rendición documenta gastos, **PERO no se comunica al cliente formalmente**.

---

### ⚠️ Fase 5: Facturación (FALTANTE)

```
┌─────────────────────────────────────────────────────────────────┐
│ ❌ NO IMPLEMENTADO: Comunicar gastos extras al cliente          │
│                                                                  │
│ Flujo esperado:                                                 │
│ 1. Admin revisa gastos de OT                                    │
│ 2. Aprueba gastos para facturación                              │
│ 3. Sistema genera documento formal (PDF)                        │
│ 4. Envía correo al cliente con desglose de costos extras       │
│ 5. Cliente acepta/rechaza gastos adicionales                    │
│ 6. Si acepta → Se agrega a factura                              │
│ 7. OrdenDeTrabajo.estado = 'facturada'                          │
└─────────────────────────────────────────────────────────────────┘
```

**Tu meta final**: Implementar esta Fase 5.

---

## Gaps de Implementación vs. Meta Final

### 1. Contrato NO vincula a OT automáticamente

**Problema**:
- OT puede crearse sin contrato activo
- No hay validación de servicios contratados vs. servicios ejecutados
- No se descuenta de cuota de servicios del contrato

**Solución propuesta**:
```python
# En ordentrabajo/models.py
class OrdenDeTrabajo(ModeloBaseHistorico):
    # ... campos existentes ...
    
    contrato = models.ForeignKey(
        'contratos.ContratoEmpresaCliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_trabajo'
    )
    
    def clean(self):
        super().clean()
        # Validar que existe contrato activo entre empresa y cliente
        if not self.contrato:
            contratos_activos = ContratoEmpresaCliente.objects.filter(
                empresa_prestadora=self.empresa,
                empresa_cliente=self.cliente,
                estado='activo',
                fecha_inicio__lte=timezone.now().date(),
                Q(fecha_fin__gte=timezone.now().date()) | Q(fecha_fin__isnull=True)
            )
            if contratos_activos.count() == 1:
                self.contrato = contratos_activos.first()
            elif contratos_activos.count() > 1:
                raise ValidationError("Hay múltiples contratos activos, seleccione uno.")
            else:
                # Opcional: permitir OT sin contrato (trabajos puntuales)
                pass
```

---

### 2. Gastos extras NO se comunican al cliente

**Problema**:
- `DetalleGastoRendicionOT` registra gastos en DB
- Se genera PDF de rendición interna
- **NO existe flujo de aprobación del cliente**
- **NO se envía correo al cliente con desglose**

**Tu meta final**: Este es el gap principal a resolver.

**Solución propuesta**:

#### A. Modelo de Aprobación de Gastos Extras

```python
# En ordentrabajo/models.py (NUEVO)
class AprobacionGastosOT(ModeloBase):
    """
    Registro de aprobación de gastos extras por parte del cliente.
    """
    orden = models.ForeignKey(
        OrdenDeTrabajo,
        on_delete=models.CASCADE,
        related_name='aprobaciones_gastos'
    )
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=[
            ('pendiente', 'Pendiente de aprobación'),
            ('aprobada', 'Aprobada por cliente'),
            ('rechazada', 'Rechazada por cliente'),
            ('expirada', 'Expiró sin respuesta'),
        ],
        default='pendiente'
    )
    uuid = models.UUIDField(unique=True, default=uuid.uuid4)  # Para link público
    monto_total = models.DecimalField(max_digits=10, decimal_places=2)
    observaciones_empresa = models.TextField(blank=True, null=True)
    observaciones_cliente = models.TextField(blank=True, null=True)
    
    # Usuario del cliente que aprueba/rechaza
    aprobado_por = models.ForeignKey(
        'empresas.UsuarioEmpresa',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    class Meta:
        verbose_name = "Aprobación de Gastos Extra OT"
        verbose_name_plural = "Aprobaciones de Gastos Extras OT"
```

#### B. ViewSet para enviar solicitud al cliente

```python
# En ordentrabajo/views.py
class AprobacionGastosOTViewSet(viewsets.ModelViewSet):
    queryset = AprobacionGastosOT.objects.all()
    serializer_class = AprobacionGastosOTSerializer
    
    @action(detail=False, methods=['post'], url_path='solicitar-aprobacion')
    def solicitar_aprobacion(self, request, orden_trabajo_pk=None):
        """
        Crea AprobacionGastosOT y envía correo al cliente.
        """
        ot = OrdenDeTrabajo.objects.get(pk=orden_trabajo_pk)
        
        # Calcular total de gastos extras
        gastos = DetalleGastoRendicionOT.objects.filter(orden=ot)
        monto_total = sum(g.monto_total for g in gastos)
        
        # Crear aprobación
        aprobacion = AprobacionGastosOT.objects.create(
            orden=ot,
            monto_total=monto_total,
            observaciones_empresa=request.data.get('observaciones', '')
        )
        
        # Generar PDF con desglose de gastos
        pdf_buffer = generar_pdf_gastos_extras(ot, gastos)
        
        # Enviar correo a usuarios vinculados del cliente
        usuarios_cliente = ot.cliente.usuarioempresa_set.filter(
            # Filtrar por rol (ej: gerentes, representantes legales)
        )
        recipient_list = [u.usuario.email for u in usuarios_cliente]
        
        frontend_url = os.getenv('FRONTEND_URL')
        url_boton = f"{frontend_url}/aprobar-gastos-ot/{aprobacion.uuid}"
        
        send_email_task.delay(
            subject=f"Aprobación de gastos extras - OT #{ot.id}",
            recipient_list=recipient_list,
            html_body=(
                f"<p>Estimado cliente,</p>"
                f"<p>Le informamos que la Orden de Trabajo #{ot.id} ha generado "
                f"gastos adicionales por un monto de <strong>${monto_total}</strong>.</p>"
                f"<p>Por favor revise el desglose adjunto y apruebe o rechace la solicitud.</p>"
            ),
            titulo="Aprobación de Gastos Adicionales",
            url_boton=url_boton,
            text_boton="Revisar y Aprobar",
            pdf_attachment=('gastos_extras.pdf', pdf_buffer.getvalue())
        )
        
        return Response(AprobacionGastosOTSerializer(aprobacion).data, status=201)
```

#### C. Página pública de aprobación (Frontend)

```typescript
// frontend/src/pages/OrdenTrabajo/components/AprobarGastosOT.tsx
function AprobarGastosOT() {
    const { uuid } = useParams();
    const [aprobacion, setAprobacion] = useState<IAprobacionGastosOT | null>(null);
    
    useEffect(() => {
        // GET /api/aprobar-gastos-ot/{uuid}/
        // Retorna: { orden_id, monto_total, gastos: [...], estado }
    }, [uuid]);
    
    const handleAprobar = async () => {
        // PATCH /api/aprobar-gastos-ot/{uuid}/aprobar/
        // Body: { observaciones_cliente: "Aprobado" }
    };
    
    const handleRechazar = async () => {
        // PATCH /api/aprobar-gastos-ot/{uuid}/rechazar/
        // Body: { observaciones_cliente: "Rechazado por..." }
    };
    
    return (
        <div>
            <h1>Aprobación de Gastos Extras</h1>
            <p>Orden de Trabajo #{aprobacion?.orden}</p>
            <p>Monto Total: ${aprobacion?.monto_total}</p>
            
            <table>
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th>Detalle</th>
                        <th>Cantidad</th>
                        <th>Monto Unitario</th>
                        <th>Monto Total</th>
                    </tr>
                </thead>
                <tbody>
                    {aprobacion?.gastos.map(g => (
                        <tr key={g.id}>
                            <td>{g.nombre_categoria}</td>
                            <td>{g.detalle}</td>
                            <td>{g.cantidad}</td>
                            <td>${g.monto_unitario}</td>
                            <td>${g.monto_total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <button onClick={handleAprobar}>Aprobar</button>
            <button onClick={handleRechazar}>Rechazar</button>
        </div>
    );
}
```

---

### 3. Estado 'facturada' NO tiene workflow

**Problema**:
- `OrdenDeTrabajo.estado` tiene opción `'facturada'`
- **NO existe endpoint para cambiar a ese estado**
- **NO se valida que gastos estén aprobados antes de facturar**

**Solución propuesta**:

```python
# En ordentrabajo/views.py
class OrdenDeTrabajoViewSet(viewsets.ModelViewSet):
    # ... métodos existentes ...
    
    @action(detail=True, methods=['post'], url_path='facturar')
    def facturar(self, request, pk=None):
        """
        Cambia OT a estado 'facturada'.
        Valida que:
        1. OT esté completada
        2. Gastos extras estén aprobados (si existen)
        3. Todos los detalles estén cerrados
        """
        ot = self.get_object()
        
        # Validar estado actual
        if ot.estado not in ['completada', 'cerrada']:
            return Response(
                {"detail": "La OT debe estar completada o cerrada para facturar."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar aprobación de gastos extras
        aprobaciones_pendientes = AprobacionGastosOT.objects.filter(
            orden=ot,
            estado='pendiente'
        )
        if aprobaciones_pendientes.exists():
            return Response(
                {"detail": f"Hay {aprobaciones_pendientes.count()} aprobaciones de gastos pendientes."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        aprobaciones_rechazadas = AprobacionGastosOT.objects.filter(
            orden=ot,
            estado='rechazada'
        )
        if aprobaciones_rechazadas.exists():
            return Response(
                {
                    "detail": "Hay gastos rechazados por el cliente. Revise antes de facturar.",
                    "gastos_rechazados": AprobacionGastosOTSerializer(aprobaciones_rechazadas, many=True).data
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado
        ot.estado = 'facturada'
        ot.save(update_fields=['estado'])
        
        return Response(OrdenDeTrabajoSerializer(ot).data, status=200)
```

---

## Roadmap Propuesto

### Fase 1: Completar Flujo de Contratos (1-2 días)

**Objetivo**: Garantizar que contratos se activan automáticamente tras firmas.

**Tareas**:
1. ✅ Agregar signal `post_save(EnvioContratoFirmaUsuario)` para activación automática
2. ✅ Validar unicidad de envíos (prevenir duplicados)
3. ✅ Mejorar feedback visual en frontend

**Documentado en**: [MODULO_CONTRATOS_ENVIO_FIRMA.md](./MODULO_CONTRATOS_ENVIO_FIRMA.md)

---

### Fase 2: Vincular Contratos → OT (2-3 días)

**Objetivo**: Establecer relación FK entre OT y Contrato.

**Tareas**:
1. Agregar campo `contrato` a `OrdenDeTrabajo`:
   ```cmd
   REM Desde backend/
   ENV\Scripts\python.exe manage.py makemigrations ordentrabajo
   ENV\Scripts\python.exe manage.py migrate
   ```

2. Modificar formulario de creación de OT (frontend):
   - Selector de contrato activo (autodetectado o manual)
   - Validación: solo contratos con `estado='activo'`

3. Agregar validación en `OrdenDeTrabajo.clean()`:
   - Verificar que existe contrato entre empresa-cliente
   - Opcional: validar que servicios de OT estén en contrato

**Testing**:
```python
def test_ot_require_contrato_activo(self):
    # Crear contrato inactivo
    contrato_borrador = ContratoEmpresaCliente.objects.create(estado='borrador', ...)
    
    # Intentar crear OT
    with self.assertRaises(ValidationError):
        ot = OrdenDeTrabajo.objects.create(
            empresa=empresa,
            cliente=cliente,
            contrato=contrato_borrador  # Debe fallar
        )
```

---

### Fase 3: Implementar Aprobación de Gastos (5-7 días) ⭐ **TU META FINAL**

**Objetivo**: Sistema formal para informar gastos extras al cliente.

#### Sprint 3.1: Modelo y API (2 días)

**Tareas**:
1. Crear modelo `AprobacionGastosOT`
2. Crear serializers y viewsets
3. Endpoints:
   - `POST /api/ordenes-trabajo/{id}/aprobaciones-gastos/solicitar-aprobacion/`
   - `GET /api/aprobar-gastos-ot/{uuid}/` (público)
   - `PATCH /api/aprobar-gastos-ot/{uuid}/aprobar/` (público)
   - `PATCH /api/aprobar-gastos-ot/{uuid}/rechazar/` (público)

**Testing**:
```cmd
REM Desde backend/
ENV\Scripts\python.exe manage.py test ordentrabajo.tests.test_aprobacion_gastos
```

---

#### Sprint 3.2: Generación de PDF y Email (1-2 días)

**Tareas**:
1. Crear `ordentrabajo/functions.py`:
   ```python
   def generar_pdf_gastos_extras(ot, gastos):
       """
       Genera PDF con desglose de gastos extras de una OT.
       Similar a generar_rendicion_pdf() pero enfocado en cliente.
       """
       # Usar reportlab
       # Template similar a rendiciones pero con branding de la empresa
       # Incluir logo, RUT, dirección
       # Tabla con categoría, detalle, cantidad, monto
       # Total destacado
       # Sección de firma/aprobación
   ```

2. Integrar con `send_email_task.delay()`:
   - Adjuntar PDF generado
   - Link a página pública de aprobación

---

#### Sprint 3.3: Frontend Página Pública (2 días)

**Tareas**:
1. Crear componente `AprobarGastosOT.tsx`:
   - Ruta pública `/aprobar-gastos-ot/:uuid`
   - Tabla con desglose de gastos
   - Botones "Aprobar" / "Rechazar"
   - Textarea para observaciones del cliente

2. Agregar estados visuales:
   - Badge verde: "Aprobado"
   - Badge rojo: "Rechazado"
   - Badge amarillo: "Pendiente"

**Testing manual**:
1. Crear OT con gastos extras
2. Enviar solicitud de aprobación
3. Verificar recepción de correo
4. Abrir link público
5. Aprobar/rechazar gastos
6. Verificar cambio de estado en DB

---

#### Sprint 3.4: Workflow de Facturación (1 día)

**Tareas**:
1. Agregar acción `facturar` en `OrdenDeTrabajoViewSet`
2. Validar que gastos estén aprobados
3. Botón "Marcar como Facturada" en UI (solo si aprobaciones OK)

**Testing**:
```python
def test_no_permite_facturar_con_gastos_pendientes(self):
    ot = OrdenDeTrabajo.objects.create(estado='completada', ...)
    aprobacion = AprobacionGastosOT.objects.create(orden=ot, estado='pendiente', ...)
    
    response = client.post(f'/api/ordenes-trabajo/{ot.id}/facturar/')
    assert response.status_code == 400
    assert "pendientes" in response.data['detail']
```

---

### Fase 4: Mejoras de UX (Opcional - 2-3 días)

**Dashboard de OT**:
- Indicador de gastos extras pendientes de aprobación
- Badge "Tiene gastos extras" en lista de OT
- Notificación push cuando cliente aprueba/rechaza

**Dashboard de Cliente**:
- Sección "Gastos Pendientes de Aprobación"
- Historial de gastos aprobados/rechazados

**Reportes**:
- PDF consolidado mensual de gastos extras aprobados
- Exportación CSV para contabilidad

---

## Resumen Ejecutivo

| Pregunta | Respuesta Corta | Estado Implementación |
|----------|-----------------|----------------------|
| **¿Contratos solo por correo?** | Sí, es el único flujo. No hay UI interna para firmar. | ✅ FUNCIONAL (con bugs) |
| **¿Emails funcionan?** | Sí, Celery + `send_email_task` están completamente implementados. | ✅ COMPLETO |
| **¿Relación Contrato ↔ OT?** | NO hay FK directa. Interactúan por mismo par empresa-cliente. | ❌ NO IMPLEMENTADO |

### Tu Meta Final: ¿Qué falta?

```
ESTADO ACTUAL: 
- OT registra gastos extras en DetalleGastoRendicionOT ✅
- Se genera PDF de rendición interna ✅
- NO se comunica al cliente ❌
- NO hay aprobación formal ❌

TU OBJETIVO:
1. Cliente recibe correo con PDF de gastos extras
2. Cliente abre link público y aprueba/rechaza
3. Empresa solo puede facturar si cliente aprobó
4. Sistema queda documentado formalmente
```

**Esfuerzo estimado**: 10-15 días de desarrollo completo.

---

**Próximo paso recomendado**:
1. Completar Fase 1 (bugs de contratos) - 2 días
2. Implementar Fase 2 (FK Contrato→OT) - 3 días
3. **Comenzar Fase 3.1 (modelo AprobacionGastosOT)** ← Tu meta principal

---

**Última actualización**: 2025-11-07  
**Documentos relacionados**:
- [MODULO_CONTRATOS_ENVIO_FIRMA.md](./MODULO_CONTRATOS_ENVIO_FIRMA.md) - Bugs de firma de contratos
- [MODULO_ORDEN_TRABAJO.md](./MODULO_ORDEN_TRABAJO.md) - Documentación completa de OT
- [HALLAZGOS_Y_MEJORAS.md](./HALLAZGOS_Y_MEJORAS.md) - Tracking de bugs y mejoras
