# Datos Base del Sistema - Seed Base

Este documento describe que datos estan disponibles despues de ejecutar `seed_base.py`.

---

## Filosofia: Datos Base vs Datos de Flujos

### 1. Datos Base (creados por scripts)
Catalogos, configuraciones y datos de referencia necesarios para que el sistema funcione. Estos NO se crean durante operacion normal.

### 2. Datos de Flujos (creados manualmente en pruebas)
Datos transaccionales que se generan durante el uso del sistema. Estos se prueban creandolos manualmente.

---

## Datos disponibles despues del seed

### 1. Empresas y estructura organizacional

#### Empresa principal
```
Empresa: Snabbit (RUT: 11111111-1)
- Sucursal: Casa Matriz
- Usuarios internos: 3
  - admin@snabbit.cl (superadmin, staff)
  - tecnico@snabbit.cl (tecnico)
  - bodeguero@snabbit.cl (bodeguero)
```

Nota: si no existe ningun superusuario, `admin@snabbit.cl` se crea como superusuario. Si ya hay un superusuario, se crea como usuario staff.

#### Empresas cliente
- Origen: Excel si existen estos archivos en `backend/`:
  - `usuarios_aygasociados.xlsx`
  - `usuarios_camacoes.xlsx`
  - `usuarios_molinarios.xlsx`
  - `usuarios_prodalmen.xlsx`
- Fallback: si el Excel no existe o no se puede leer, se crean 2 usuarios demo por empresa.
- Cantidad: 4 empresas cliente (segun lista) con sucursal "Casa Matriz".
- Relacion: prestador -> cliente con Snabbit.

Modelos: `Empresa`, `SucursalEmpresa`, `UsuarioEmpresa`, `RelacionEmpresa`

---

### 2. Usuarios y permisos

#### Usuarios internos (Snabbit)
| Email | Grupos | Password |
|-------|--------|----------|
| admin@snabbit.cl | superadmin, staff, multi-empresas | test1234 |
| tecnico@snabbit.cl | tecnico | test1234 |
| bodeguero@snabbit.cl | bodeguero | test1234 |

#### Usuarios cliente
- Origen: Excel o fallback
- Password: `test1234`
- Grupo: `representante_legal` para el primer usuario de cada empresa (si existe)

#### Grupos disponibles
- staff
- superadmin
- multi-empresas
- tecnico
- bodeguero
- representante_legal

Modelos: `User`, `UsuarioEmpresa`, `Group`, `PersonalizacionUsuario`

---

### 3. Equipos y recursos

#### Equipos registrados (3 por empresa cliente)
1. Portatil HP ProBook 440
2. Escritorio Dell OptiPlex 7090
3. Portatil Lenovo ThinkPad T14

#### Caracteristicas
- numero_serie: `RUT-001`, `RUT-002`, `RUT-003`
- tipo_equipo: PORTATIL / ESCRITORIO
- ram: 16GB o 32GB
- sistema_operativo: WINDOWS10 / WINDOWS11
- almacenamientos: SSD_256GB, SSD_512GB, HDD_1TB
- registrado_por: tecnico@snabbit.cl

#### Asignaciones
- 1 equipo asignado activo
- 1 equipo devuelto (estado=False, con fecha_devolucion)
- 1 equipo sin asignar
(Si la empresa tiene usuarios disponibles)

Modelos: `Equipo`, `UsuarioEquipo`, `AlmacenamientoEquipo`

---

### 4. Software

#### Catalogo de software
```
- Microsoft Office
- Google Chrome
- Mozilla Firefox
- Adobe Acrobat Reader
- WinRAR
- 7-Zip
- VLC Media Player
- Zoom
- Microsoft Teams
- Slack
- AutoCAD
- Photoshop
- Visual Studio Code
- Python
- Node.js
```

Adicional:
- `SoftwareDeEmpresa`: se crea para cada empresa
- `SoftwareInstalado`: se instalan 3 softwares por equipo

Modelos: `Software`, `SoftwareDeEmpresa`, `SoftwareInstalado`

---

### 5. Items e inventario

#### Categorias
```
- Camaras de Seguridad
- Cables y Conectores
- Accesorios
```

#### Fabricantes
```
- Hikvision
- Dahua
- Generico
```

#### Proveedores
| Nombre | RUT | Tipo Moneda | Ejecutivo |
|--------|-----|-------------|-----------|
| Importadora TechPro | 76555666-7 | USD | Juan Perez |
| Distribuidora ElectroSur | 77888999-0 | CLP | Maria Gonzalez |
| Global Hardware Inc | 78111222-3 | UF | Robert Smith |

#### Items creados
```
1. Camara Domo 2MP (Hikvision)
2. DVR 8 Canales (Dahua)
3. Cable UTP Cat5e (Generico)
4. Canaleta 20x10 (Generico)
5. Fuente 12V 2A (Generico)
```

#### Bodegas y stock
- Bodega Principal: items 1-3 (cantidades 10, 20, 30)
- Bodega Secundaria: items 4-5 (cantidades 5, 15)

Nota: cada item solo puede estar en una bodega (modelo `StockItemEnBodega` es OneToOne).

Modelos: `Categoria`, `Fabricante`, `ProveedorEmpresa`, `ItemEmpresa`, `Bodega`, `StockItemEnBodega`

---

### 6. Servicios y contratos (catalogos)

#### Servicios
| Nombre | Categoria |
|--------|-----------|
| Mantencion Preventiva de Infraestructura | mantencion |
| Desarrollo de Aplicacion Web Personalizada | desarrollo |
| Soporte Tecnico Nivel 2 | soporte |
| Capacitacion en Nuevas Tecnologias | capacitacion |
| Hosting y Almacenamiento en Datacenter | datacenter |
| Migracion de Sistemas Legacy | desarrollo |
| Monitoreo 24/7 de Infraestructura | datacenter |

#### Caracteristicas de servicio
```
- Incluye materiales
- 24/7 Disponibilidad
- Garantia extendida
- Respuesta prioritaria
- Informe tecnico
```

#### Planes de servicio
```
- Plan Basico de Mantenimiento
- Plan Completo de Soporte
- Plan Empresarial Premium
```

#### Tipos de visitas
```
- Visita de Mantenimiento Mensual
- Visita de Mantenimiento Trimestral
- Visita de Mantenimiento Semestral
- Visita de Mantenimiento Anual
- Visita de Soporte Tecnico
- Visita de Inspeccion de Equipos
- Visita de Instalacion de Software
- Visita de Capacitacion de Usuarios
```

#### Licencias
```
- Microsoft 365 Business Standard (Microsoft)
- Microsoft 365 E3 (Microsoft)
- AutoCAD (Autodesk)
- Adobe Creative Cloud (Adobe)
- Slack Business+ (Slack)
- Zoom Business (Zoom)
- Antivirus Corporativo (Kaspersky/ESET/Symantec)
```

#### Condiciones especiales
```
- SLA 4 horas
- Soporte 24/7
- Garantia extendida 3 anos
- Capacitacion incluida
- Respaldo de datos diario
- Mantenimiento preventivo trimestral
- Reemplazo de equipos en caso de falla
- Acceso prioritario a nuevas funcionalidades
```

Modelos: `Servicio`, `CaracteristicaServicio`, `PlanServicio`, `Visita`, `Licencia`, `CondicionEspecial`

---

### 7. Categorias de gastos (Rendiciones)

Nota: no hay jerarquia, solo nombres.

```
- Combustible
- Peaje
- Estacionamiento
- Taxi/Uber
- Transporte Publico (Metro/Bus)
- Arriendo de Vehiculo
- Desayuno / Almuerzo / Cena
- Colacion
- Hotel
- Hostal
- Cables y Conectores
- Herramientas
- Material Electrico
- Tornilleria
- Consumibles
- Llamadas Telefonicas
- Internet Movil
- Capacitacion
- Impresiones y Fotocopias
- Envio de Documentos
- Gastos Varios
```

Modelos: `CategoriaGastoRendicion`

---

### 8. Acuerdos de confidencialidad (NDA)

Se crea una plantilla base `NDA Estandar`.

Modelo: `AcuerdoConfidencialidadBase`

---

## Flujos listos para probar

Con estos datos base, puedes probar manualmente:

### Ordenes de Trabajo (V2)
```
Prerequisitos disponibles:
- Empresa prestadora (Snabbit)
- Empresas cliente
- Usuarios tecnicos (responsables)
- Usuarios cliente (solicitantes)
- Equipos con asignaciones
- Items en stock (para guias de salida)
- Categorias de gastos (para rendiciones en OT)
```

Flujo a probar:
1. Crear `OrdenDeTrabajo` (empresa, cliente, responsable, solicitante)
2. Agregar `SoporteTecnico` (detalles de trabajo)
3. Vincular `UsuarioEquipo` a soporte (`UsuarioAsignadoSoporte`)
4. Crear `GuiaSalida` con items de bodega
5. Vincular guia a soporte
6. Agregar `ServicioEnOT` (servicios realizados)
7. Registrar `RendicionEnOt` (gastos del tecnico)
8. Cambiar estados (pendiente -> en_proceso -> finalizada)
9. Agregar adjuntos (`AdjuntoDeOrden`)

---

### Contratos
```
Prerequisitos disponibles:
- Empresa prestadora
- Empresas cliente
- Usuarios vinculables
- Servicios catalogo
- Planes de servicio
- Tipos de visitas
- Licencias
- Condiciones especiales
```

Flujo a probar:
1. Crear `ContratoEmpresaCliente` (prestadora, cliente, fechas)
2. Asociar servicios/planes (`ContratoServicio` - polimorfismo)
3. Asociar visitas programadas (`ContratoVisita`)
4. Asociar licencias (`ContratoLicencia`)
5. Asociar condiciones (`ContratoCondicionEspecial`)
6. Vincular usuarios (`UsuarioVinculadoContrato`)
7. Enviar para firma (`EnvioContratoFirmaUsuario`)
8. Cambiar estados (borrador -> activo -> finalizado)

---

### Cotizaciones
```
Prerequisitos disponibles:
- Empresa prestadora
- Empresas cliente
- Items con proveedores
- Proveedores con precios
```

Flujo a probar:
1. Crear `Cotizacion` (empresa, cliente, descripcion)
2. Agregar `ItemCotizacion` (cantidad, precio_unitario)
3. Calcular totales con recargos/IVA/PPM
4. Agregar solicitantes
5. Adjuntar archivos
6. Cambiar estados (pendiente -> aprobada -> rechazada)
7. Generar OC desde cotizacion aprobada

---

### Visitas de Soporte
```
Prerequisitos disponibles:
- Empresa prestadora
- Empresas cliente
- UsuarioEquipo (equipos asignados)
- Items en stock
```

Flujo a probar:
1. Crear `VisitaSoporte` (empresa, cliente, descripcion)
2. Agregar `AsistenciaUsuario` (revision de equipos)
3. Agregar `EntregaDeEquipo` (entrega de equipos nuevos)
4. Crear `GuiaSalida` con materiales usados
5. Vincular guia a visita
6. Cambiar estados (pendiente -> completada)

---

### Movimientos de Bodega
```
Prerequisitos disponibles:
- Bodegas con stock
- Items
- Usuarios bodegueros
```

Flujos a probar:

Guia de Salida:
1. Crear `GuiaSalida` (bodega, creado_por, motivo)
2. Agregar items (`ItemEnGuiaSalida`)
3. Aprobar (descuenta stock automaticamente)
4. Vincular a OT/Visita (opcional)

Guia de Entrada:
1. Crear `GuiaEntrada` (bodega, proveedor)
2. Agregar items (`ItemEnGuiaEntrada`)
3. Aprobar (aumenta stock automaticamente)

Orden de Compra:
1. Crear `OrdenCompra` (proveedor, items)
2. Adjuntar cotizacion PDF
3. Aprobar
4. Crear `Compra` al recibir mercaderia
5. Adjuntar boleta/factura
6. Generar `GuiaEntrada` desde compra

---

### Rendiciones
```
Prerequisitos disponibles:
- Usuarios tecnicos
- Categorias de gastos
- Ordenes de trabajo (para rendiciones en OT)
```

Flujo a probar:
1. Crear `Rendicion` (usuario, periodo)
2. Agregar `DetalleGastoRendicion` (categoria, monto, comprobante)
3. Cambiar estados (borrador -> enviada -> aprobada -> pagada)
4. Vincular a `RendicionEnOt` (si aplica)

---

### Vacaciones
```
Prerequisitos disponibles:
- UsuarioEmpresa con fecha_contrato
- Calculo automatico de dias disponibles
```

Flujo a probar:
1. Crear `SolicitudVacaciones` (usuario_empresa, fechas)
2. Sistema calcula dias solicitados
3. Valida dias disponibles
4. Cambiar estados (pendiente -> aprobada -> rechazada)
5. Descuenta dias al aprobar

---

## Orden de ejecucion recomendado

```bash
# 1. (Opcional) Limpiar base de datos local
#    - borrar backend\\db.sqlite3
#    - o usar tu script de reset si existe

# 2. Aplicar migraciones
cd backend
backend\\ENV\\Scripts\\python.exe manage.py migrate

# 3. Ejecutar seed base (incluye setup_superuser si falta)
backend\\ENV\\Scripts\\python.exe ..\\dev\\scripts\\setup\\seed_base.py
```

---

## Resumen de cantidades

| Categoria | Cantidad Aproximada |
|-----------|---------------------|
| Empresas | 5 (1 Snabbit + 4 clientes) |
| Usuarios | 11+ (3 internos + 8+ cliente segun Excel) |
| Equipos | 12 (3 por empresa cliente) |
| Items | 5 |
| Proveedores | 3 |
| Bodegas | 2 |
| Stock (registros) | 5 |
| Servicios | 7 |
| Planes | 3 |
| Caracteristicas | 5 |
| Tipos de Visitas | 8 |
| Licencias | 7 |
| Condiciones Especiales | 8 |
| Categorias Gastos | 21 |
| Software | 15 |

---

## Importante

### NO estan creados (se prueban manualmente)
- Ordenes de Trabajo
- Contratos
- Cotizaciones
- Visitas de Soporte
- Guias de Salida/Entrada
- Ordenes de Compra
- Compras
- Rendiciones
- Solicitudes de Vacaciones
- Retroalimentaciones
- Eventos de Calendario

### SI estan creados (datos base)
- Todo lo listado en este documento

---

Ultima actualizacion: 2025-12-31
