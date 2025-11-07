#!/usr/bin/env python
"""\
Script para poblar acuerdos de confidencialidad base.

Qué hace:
- Crea plantillas de acuerdos de confidencialidad (NDA templates)
- Estos acuerdos base se usan como plantillas para los contratos
- Los contratos pueden firmar estos acuerdos vinculando usuarios

Cuándo usar:
- Después de setup inicial para tener plantillas de NDA
- Para testing del módulo de contratos con confidencialidad
- Cuando necesites diferentes tipos de acuerdos de confidencialidad

Prerequisitos:
- Base de datos migrada
- No requiere otros datos previos

Uso:
    cd backend
    backend\\ENV\\Scripts\\python.exe ..\\scripts\\setup\\seed_acuerdos_confidencialidad.py
"""
import os
import sys

import django

# Setup Django
backend_path = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, os.path.join(backend_path, "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")
django.setup()

from core.models import AcuerdoConfidencialidadBase


def crear_acuerdos_base():
    """\
    Crea acuerdos de confidencialidad base (plantillas).
    
    Un Acuerdo de Confidencialidad Base es una plantilla que define
    los términos y condiciones de confidencialidad. Estos acuerdos
    pueden ser vinculados a contratos mediante AcuerdoConfidencialidadContrato.
    
    Tipos de acuerdos comunes:
    - NDA Unilateral: Una parte comparte información confidencial
    - NDA Bilateral: Ambas partes comparten información confidencial
    - NDA Multilateral: Múltiples partes comparten información
    
    Returns:
        list: Lista de AcuerdoConfidencialidadBase creados
    """
    print("--- Creando acuerdos de confidencialidad base ---")

    acuerdos_data = [
        {
            "titulo": "NDA Estándar - Unilateral",
            "contenido": """\
ACUERDO DE CONFIDENCIALIDAD UNILATERAL

Entre la empresa prestadora (en adelante "la Parte Reveladora") y la empresa cliente (en adelante "la Parte Receptora"), se acuerda lo siguiente:

1. DEFINICIONES
   a) "Información Confidencial" significa toda información técnica, comercial, financiera o de cualquier otra naturaleza revelada por la Parte Reveladora.
   b) La información puede ser proporcionada en forma escrita, oral, electrónica o cualquier otro medio.

2. OBLIGACIONES DE CONFIDENCIALIDAD
   La Parte Receptora se compromete a:
   a) Mantener la Información Confidencial en estricta reserva
   b) No divulgar la información a terceros sin autorización previa por escrito
   c) Utilizar la información únicamente para los fines del contrato
   d) Implementar medidas de seguridad razonables para proteger la información

3. EXCEPCIONES
   No se considera Información Confidencial aquella que:
   a) Sea de dominio público sin culpa de la Parte Receptora
   b) La Parte Receptora pueda demostrar que conocía previamente
   c) Sea recibida legítimamente de un tercero sin obligación de confidencialidad
   d) Deba ser revelada por mandato judicial o legal

4. DURACIÓN
   Este acuerdo tendrá vigencia durante el plazo del contrato y por un período de 3 años adicionales después de su terminación.

5. DEVOLUCIÓN DE INFORMACIÓN
   Al término del contrato, la Parte Receptora devolverá o destruirá toda la Información Confidencial y sus copias.

6. REMEDIOS
   La Parte Receptora reconoce que el incumplimiento puede causar daños irreparables, autorizando a la Parte Reveladora a solicitar medidas cautelares.
""",
        },
        {
            "titulo": "NDA Estándar - Bilateral",
            "contenido": """\
ACUERDO DE CONFIDENCIALIDAD BILATERAL (MUTUO)

Entre las partes del contrato (en adelante "las Partes"), se acuerda lo siguiente:

1. DEFINICIONES
   a) "Información Confidencial" significa toda información técnica, comercial, financiera o de cualquier otra naturaleza revelada por cualquiera de las Partes.
   b) Cada Parte puede actuar tanto como Parte Reveladora como Parte Receptora.

2. OBLIGACIONES DE CONFIDENCIALIDAD
   Cada Parte se compromete a:
   a) Mantener la Información Confidencial recibida en estricta reserva
   b) No divulgar la información a terceros sin autorización previa por escrito
   c) Utilizar la información únicamente para los fines del contrato
   d) Implementar medidas de seguridad razonables para proteger la información
   e) Limitar el acceso a la información únicamente al personal que lo requiera

3. EXCEPCIONES
   No se considera Información Confidencial aquella que:
   a) Sea de dominio público sin culpa de la Parte Receptora
   b) La Parte Receptora pueda demostrar que conocía previamente
   c) Sea desarrollada independientemente por la Parte Receptora
   d) Sea recibida legítimamente de un tercero sin obligación de confidencialidad
   e) Deba ser revelada por mandato judicial o legal

4. PROPIEDAD INTELECTUAL
   Toda Información Confidencial revelada permanece como propiedad de la Parte Reveladora. 
   Este acuerdo no otorga licencias ni derechos sobre propiedad intelectual.

5. DURACIÓN
   Este acuerdo tendrá vigencia durante el plazo del contrato y por un período de 5 años adicionales después de su terminación.

6. DEVOLUCIÓN DE INFORMACIÓN
   Al término del contrato, cada Parte devolverá o destruirá toda la Información Confidencial recibida y sus copias, certificando por escrito su cumplimiento.

7. REMEDIOS Y PENALIDADES
   Las Partes reconocen que el incumplimiento puede causar daños irreparables. La Parte afectada podrá:
   a) Solicitar medidas cautelares inmediatas
   b) Reclamar indemnización por daños y perjuicios
   c) Terminar el contrato anticipadamente

8. NO COMPETENCIA
   Durante la vigencia del contrato y por 1 año posterior, las Partes se comprometen a no contratar empleados clave de la otra parte sin autorización previa.
""",
        },
        {
            "titulo": "NDA Simplificado - Servicios Tecnológicos",
            "contenido": """\
ACUERDO DE CONFIDENCIALIDAD - SERVICIOS TECNOLÓGICOS

Las partes acuerdan mantener confidencial toda información técnica relacionada con:

1. ALCANCE
   - Arquitectura de sistemas e infraestructura
   - Credenciales de acceso y configuraciones
   - Código fuente, APIs y documentación técnica
   - Datos de clientes y usuarios finales
   - Vulnerabilidades de seguridad detectadas
   - Estrategias de negocio y roadmaps tecnológicos

2. OBLIGACIONES ESPECÍFICAS
   El proveedor de servicios se compromete a:
   a) No revelar información sobre la infraestructura del cliente
   b) Eliminar todos los accesos al término del contrato
   c) No utilizar información obtenida para beneficio propio
   d) Reportar inmediatamente cualquier brecha de seguridad
   e) Mantener cifrada toda información sensible

   El cliente se compromete a:
   a) No revelar metodologías y herramientas propietarias del proveedor
   b) No compartir documentación técnica con competidores
   c) Reconocer la propiedad intelectual del proveedor

3. PROTECCIÓN DE DATOS PERSONALES
   Ambas partes cumplirán con las leyes de protección de datos aplicables (Ley 19.628 en Chile, GDPR si aplica).

4. AUDITORÍAS
   El cliente podrá solicitar auditorías de seguridad con aviso previo de 15 días, máximo 2 veces al año.

5. VIGENCIA
   2 años desde la terminación del contrato.
""",
        },
        {
            "titulo": "NDA - Proyectos de Desarrollo de Software",
            "contenido": """\
ACUERDO DE CONFIDENCIALIDAD - DESARROLLO DE SOFTWARE

Para proyectos de desarrollo de software a medida:

1. INFORMACIÓN CONFIDENCIAL INCLUYE
   a) Requisitos funcionales y técnicos del sistema
   b) Modelos de datos y esquemas de base de datos
   c) Diseños de interfaces y experiencia de usuario (mockups, wireframes)
   d) Código fuente desarrollado
   e) Algoritmos y lógica de negocio
   f) Documentación técnica y manuales
   g) Resultados de pruebas y reportes de bugs
   h) Credenciales de ambientes de desarrollo, staging y producción

2. PROPIEDAD INTELECTUAL
   a) El cliente es propietario del código desarrollado específicamente para el proyecto
   b) El proveedor retiene derechos sobre componentes reutilizables y frameworks propietarios
   c) Librerías open-source mantienen sus licencias originales
   d) Ambas partes pueden utilizar el proyecto como referencia comercial (previo acuerdo)

3. RESTRICCIONES DE USO
   El proveedor NO puede:
   - Reutilizar código específico del proyecto en otros clientes
   - Compartir detalles del proyecto en redes sociales sin autorización
   - Retener accesos o código como "garantía" de pago

   El cliente NO puede:
   - Redistribuir componentes propietarios del proveedor
   - Contratar al equipo de desarrollo directamente durante el proyecto y 6 meses posteriores

4. SEGURIDAD EN DESARROLLO
   a) Control de versiones con accesos restringidos
   b) Cifrado de datos sensibles en repositorios
   c) Revisiones de código sin exponer secretos
   d) Ambientes separados (dev/staging/prod)

5. TRANSFERENCIA DE CONOCIMIENTO
   Al finalizar el proyecto, el proveedor documentará:
   - Arquitectura del sistema
   - Procedimientos de despliegue
   - Guía de mantenimiento
   Sin revelar información confidencial de otros clientes.

6. VIGENCIA
   Durante el proyecto y 3 años posteriores.
""",
        },
        {
            "titulo": "NDA - Infraestructura y Datacenter",
            "contenido": """\
ACUERDO DE CONFIDENCIALIDAD - INFRAESTRUCTURA Y DATACENTER

Para servicios de hosting, cloud, y gestión de infraestructura:

1. INFORMACIÓN CONFIDENCIAL CRÍTICA
   a) Topología de red y diagramas de infraestructura
   b) Configuraciones de firewalls, switches y routers
   c) Políticas de seguridad y control de accesos
   d) Planes de disaster recovery y continuidad de negocio
   e) Inventario de activos y licenciamiento
   f) Métricas de rendimiento y capacidad
   g) Incidentes de seguridad y vulnerabilidades
   h) Credenciales de acceso administrativo

2. OBLIGACIONES DEL PROVEEDOR
   a) Mantener segregación lógica entre clientes en infraestructura compartida
   b) No revelar qué otros clientes comparten la misma infraestructura
   c) Implementar controles de acceso basados en roles (RBAC)
   d) Registrar y auditar todos los accesos administrativos
   e) Notificar incidentes de seguridad en máximo 24 horas
   f) Eliminar permanentemente datos al término del servicio

3. OBLIGACIONES DEL CLIENTE
   a) No intentar acceder a recursos de otros clientes
   b) Reportar vulnerabilidades detectadas
   c) No publicar benchmarks sin autorización del proveedor

4. CUMPLIMIENTO NORMATIVO
   Ambas partes cumplirán con:
   - ISO 27001 (si aplica)
   - SOC 2 Type II (si aplica)
   - Ley de Protección de Datos (19.628 Chile)
   - Regulaciones específicas del sector (banca, salud, etc.)

5. MONITOREO Y LOGS
   a) El proveedor puede monitorear el uso de recursos con fines operativos
   b) Los logs se conservarán mínimo 6 meses
   c) El cliente puede solicitar logs de accesos a su infraestructura

6. SUBCONTRATISTAS
   El proveedor solo podrá usar subcontratistas (ej: proveedores de cloud público) previa notificación al cliente.

7. VIGENCIA
   5 años desde la terminación del servicio.
""",
        },
    ]

    acuerdos = []
    for data in acuerdos_data:
        acuerdo, created = AcuerdoConfidencialidadBase.objects.get_or_create(
            titulo=data["titulo"],
            defaults={
                "contenido": data["contenido"],
            },
        )
        acuerdos.append(acuerdo)
        if created:
            print(f"✓ Acuerdo '{acuerdo.titulo}' creado")
        else:
            print(f"  Acuerdo '{acuerdo.titulo}' ya existe")

    return acuerdos


def main():
    print("=" * 70)
    print("SEED ACUERDOS DE CONFIDENCIALIDAD - Poblando plantillas de NDA")
    print("=" * 70)
    print()

    try:
        # Crear acuerdos base
        acuerdos = crear_acuerdos_base()
        print()

        # Resumen
        print("=" * 70)
        print("RESUMEN DE CREACIÓN")
        print("=" * 70)
        print(f"Acuerdos de confidencialidad base creados: {len(acuerdos)}")
        print()
        print("Tipos de acuerdos disponibles:")
        for acuerdo in acuerdos:
            print(f"  - {acuerdo.titulo}")
        print("=" * 70)
        print("✅ SEED ACUERDOS DE CONFIDENCIALIDAD COMPLETADO CON ÉXITO")
        print("=" * 70)
        print()

        # Verificación
        total_db = AcuerdoConfidencialidadBase.objects.count()
        print(f"📊 Total en base de datos: {total_db} acuerdos base")
        print()
        print("Próximos pasos:")
        print("1. Ve a un contrato en el admin")
        print("2. En la sección 'Firmas de confidencialidad'")
        print("3. Selecciona un acuerdo base del dropdown")
        print("4. Los usuarios vinculados al contrato podrán firmar el acuerdo")
        print()

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
