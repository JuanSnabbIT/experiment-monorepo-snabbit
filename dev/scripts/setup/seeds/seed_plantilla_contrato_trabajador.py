"""
Seed: PlantillaContrato tipo 'trabajador' (Contrato Laboral) + secciones.

Crea una plantilla default por empresa empleadora basada en el modelo de
contrato chileno tipico (14 clausulas + encabezado + firmas).

Idempotente:
  - Si la empresa ya tiene una plantilla 'trabajador' con es_default=True,
    se reutiliza y se sobrescriben sus secciones.
  - Si no existe, se crea.

Etiquetas usadas (resueltas via AdaptadorContratoTrabajador):
  - [empresa.nombre], [empresa.rut_empresa], [empresa.direccion_principal],
    [empresa.representante_legal], [empresa.rut_representante]
  - [trabajador.nombre_completo], [trabajador.rut], [trabajador.nacionalidad],
    [trabajador.fecha_nacimiento], [trabajador.direccion], [trabajador.email]
  - [contrato.cargo], [contrato.fecha_inicio], [contrato.fecha_termino],
    [contrato.jornada], [contrato.horas_semanales], [contrato.horario_detalle],
    [contrato.tiempo_colacion], [contrato.funciones]
  - [remuneracion.sueldo_liquido], [remuneracion.sueldo_liquido_palabras]
  - [prevision.afp], [prevision.sistema_salud]
  - [firma.lugar_firma], [firma.fecha_firma]

Uso directo:
    cd backend
    python ..\\dev\\scripts\\setup\\seeds\\seed_plantilla_contrato_trabajador.py

Argumentos opcionales:
    --empresa-id <int>   Crear/actualizar solo para esa empresa.
    --force              Sobrescribir secciones aunque la plantilla ya exista.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
BACKEND_PATH = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_PATH))
os.chdir(BACKEND_PATH)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sw_erp.settings")

import django

django.setup()

from django.db import transaction

from contratos.models import PlantillaContrato, SeccionPlantilla
from empresas.models import Empresa


TITULO_PLANTILLA = "Contrato de Trabajo (Default)"


# ---------------------------------------------------------------------------
# Definicion de secciones (orden, tipo, titulo, contenido_template)
# ---------------------------------------------------------------------------
SECCIONES: list[dict] = [
    {
        "orden": 1,
        "tipo": "encabezado",
        "titulo": "Contrato de Trabajo",
        "contenido_template": (
            "En [firma.lugar_firma], a [firma.fecha_firma], entre "
            "<b>[empresa.nombre]</b>, RUT N° [empresa.rut_empresa], "
            "representada por don(a) <b>[empresa.representante_legal]</b>, "
            "RUT N° [empresa.rut_representante], ambos domiciliados en "
            "[empresa.direccion_principal], que en adelante se denominara "
            '"el (la) empleador(a)"; y don(a) <b>[trabajador.nombre_completo]</b> '
            "de nacionalidad [trabajador.nacionalidad], nacido(a) el "
            "[trabajador.fecha_nacimiento], RUT N° [trabajador.rut], "
            "domiciliado(a) en [trabajador.direccion], correo electronico: "
            "[trabajador.email], que en adelante se denominara el (la) "
            "trabajador(a), se ha convenido el siguiente contrato de trabajo:"
        ),
    },
    {
        "orden": 2,
        "tipo": "clausula",
        "titulo": "PRIMERO: Funciones y lugar de trabajo",
        "contenido_template": (
            "El (la) trabajador(a) se compromete a ejecutar el trabajo de "
            "<b>[contrato.cargo]</b>, sin perjuicio de otras funciones "
            "necesarias para el desarrollo de sus labores, en el "
            "establecimiento que el EMPLEADOR posee en "
            "[empresa.direccion_principal]. No obstante, el EMPLEADOR podra "
            "alterar por causas justificadas los recintos en que ellas deben "
            "prestarse, a condicion de que se trate de labores similares, que "
            "el nuevo recinto quede en el mismo lugar o ciudad, y sin que ello "
            "importe menoscabo para el (la) trabajador(a)."
        ),
    },
    {
        "orden": 3,
        "tipo": "clausula",
        "titulo": "SEGUNDO: Jornada de trabajo",
        "contenido_template": (
            "La jornada de trabajo sera de tipo <b>[contrato.jornada]</b>, con "
            "un total de [contrato.horas_semanales] horas semanales. "
            "Horario: [contrato.horario_detalle]. Se excluye un tiempo de "
            "colacion diaria de [contrato.tiempo_colacion] minutos. "
            "El (la) trabajador(a) reconoce y acepta que, por necesidades del "
            "servicio, los horarios pueden modificarse con sujecion a las "
            "normas legales, y se compromete a realizar a peticion del "
            "EMPLEADOR hasta dos horas extraordinarias diarias si las "
            "necesidades de funcionamiento asi lo requieren."
        ),
    },
    {
        "orden": 4,
        "tipo": "clausula",
        "titulo": "TERCERO: Obligaciones del trabajador",
        "contenido_template": (
            "En el desempeno de sus labores el (la) trabajador(a) queda "
            "especialmente obligado(a) a cumplir estrictamente las "
            "instrucciones que reciba de sus jefes; a guardar la mas absoluta "
            "reserva de todas las operaciones del EMPLEADOR o de su clientela, "
            "aunque en ellas no intervenga; a no desempenarse, dentro de la "
            "jornada respectiva, en otra actividad lucrativa fuera de las "
            "horas de trabajo que sea incompatible con el giro del negocio o "
            "que perjudique su desempeno en la compania; a ejecutar los "
            "trabajos concernientes a su empleo en la forma mas eficaz, "
            "empleando para ello la mayor diligencia y dedicacion; y a "
            "concurrir puntual y regularmente a sus labores, siendo "
            "obligacion del EMPLEADOR registrar su asistencia en los "
            "controles que existan con este objeto. La inobservancia de "
            "cualquiera de estas obligaciones constituira falta grave y se "
            "entendera causa justificada de terminacion del contrato, sin "
            "perjuicio de quedar el (la) trabajador(a) obligado(a) por "
            "cualquier dano que su actitud pudiere ocasionar al EMPLEADOR o "
            "a su clientela."
        ),
    },
    {
        "orden": 5,
        "tipo": "clausula",
        "titulo": "CUARTO: Remuneracion",
        "contenido_template": (
            "El EMPLEADOR se compromete a remunerar al (a la) trabajador(a) "
            "con un sueldo liquido mensual de "
            "<b>$[remuneracion.sueldo_liquido]</b> "
            "([remuneracion.sueldo_liquido_palabras])."
        ),
    },
    {
        "orden": 6,
        "tipo": "clausula",
        "titulo": "QUINTO: Prestaciones adicionales",
        "contenido_template": (
            "Cualquier otra prestacion ocasional o periodica que el "
            "EMPLEADOR conceda al (a la) trabajador(a), fuera de las que "
            "corresponden a este contrato o a las disposiciones legales "
            "vigentes, se entendera conferida a titulo de mera liberalidad "
            "y no dara derecho alguno al (a la) trabajador(a); el EMPLEADOR "
            "podra suspenderla o modificarla a su entero arbitrio."
        ),
    },
    {
        "orden": 7,
        "tipo": "clausula",
        "titulo": "SEXTO: Feriado legal",
        "contenido_template": (
            "El (la) trabajador(a) tendra derecho al feriado legal en "
            "conformidad a la ley, del que hara uso en la epoca que senale "
            "el EMPLEADOR de acuerdo con las necesidades del servicio."
        ),
    },
    {
        "orden": 8,
        "tipo": "clausula",
        "titulo": "SEPTIMO: Termino del contrato",
        "contenido_template": (
            "El presente contrato se conviene y cualquiera de las partes "
            "podra ponerle termino en conformidad al Codigo del Trabajo y "
            "sus modificaciones vigentes a esta fecha."
        ),
    },
    {
        "orden": 9,
        "tipo": "clausula",
        "titulo": "OCTAVO: Vigencia",
        "contenido_template": (
            "El presente contrato tendra vigencia desde el "
            "<b>[contrato.fecha_inicio]</b> hasta el "
            "<b>[contrato.fecha_termino]</b>. Las partes podran ponerle "
            "termino en conformidad a la ley."
        ),
    },
    {
        "orden": 10,
        "tipo": "clausula",
        "titulo": "NOVENO: Modificaciones",
        "contenido_template": (
            "De toda modificacion del presente contrato se dejara "
            "constancia al dorso o en un anexo, debidamente firmado por el "
            "(la) trabajador(a) y el EMPLEADOR, de acuerdo a las normas "
            "vigentes."
        ),
    },
    {
        "orden": 11,
        "tipo": "clausula",
        "titulo": "DECIMO: Responsabilidades especiales",
        "contenido_template": (
            "Por la naturaleza de las funciones que el (la) trabajador(a) "
            "desempena, las partes han convenido hacer constar expresamente "
            "que las responsabilidades emanadas de tales prerrogativas se "
            "encuentran detalladas en el Reglamento Interno de la empresa, "
            "el cual el (la) trabajador(a) declara conocer y aceptar."
        ),
    },
    {
        "orden": 12,
        "tipo": "clausula",
        "titulo": "DECIMO PRIMERO: Funciones especificas",
        "contenido_template": (
            "El (la) trabajador(a) se compromete a realizar, en funcion de "
            "su cargo, las siguientes labores:<br/>[contrato.funciones]"
        ),
    },
    {
        "orden": 13,
        "tipo": "clausula",
        "titulo": "DECIMO SEGUNDO: Fecha de ingreso",
        "contenido_template": (
            "Se deja constancia que el (la) trabajador(a) ingreso a la "
            "empresa el dia <b>[contrato.fecha_inicio]</b>."
        ),
    },
    {
        "orden": 14,
        "tipo": "clausula",
        "titulo": "DECIMO TERCERO: Prevision y salud",
        "contenido_template": (
            "Se deja constancia que el (la) trabajador(a) se encuentra "
            "afiliado(a) en AFP <b>[prevision.afp]</b> y en el sistema de "
            "salud <b>[prevision.sistema_salud]</b>."
        ),
    },
    {
        "orden": 15,
        "tipo": "clausula",
        "titulo": "DECIMO CUARTO: Domicilio",
        "contenido_template": (
            "Para todos los efectos legales las partes fijan su domicilio en "
            "[firma.lugar_firma] y dejan expresa constancia que al momento de "
            "contratarse el (la) trabajador(a) tenia fijada su residencia en "
            "[trabajador.direccion]."
        ),
    },
    {
        "orden": 16,
        "tipo": "firmas",
        "titulo": "Firmas",
        "contenido_template": "Certifico que he recibido copia fiel de este documento.",
    },
]


# ---------------------------------------------------------------------------
def _crear_o_actualizar_plantilla(empresa: Empresa, force: bool) -> tuple[PlantillaContrato, bool, bool]:
    """Retorna (plantilla, creada, secciones_actualizadas)."""
    plantilla, creada = PlantillaContrato.objects.update_or_create(
        empresa_prestadora=empresa,
        tipo_contrato="trabajador",
        es_default=True,
        defaults={
            "titulo": TITULO_PLANTILLA,
            "descripcion": (
                "Plantilla base para contrato laboral (Chile). Reemplaza los "
                "campos dinamicos con datos del contrato, trabajador y empresa."
            ),
            "activa": True,
        },
    )

    secciones_actualizadas = False
    if creada or force:
        # Recrear secciones desde cero.
        plantilla.secciones.all().delete()
        for s in SECCIONES:
            SeccionPlantilla.objects.create(
                plantilla=plantilla,
                orden=s["orden"],
                tipo=s["tipo"],
                titulo=s["titulo"],
                contenido_template=s["contenido_template"],
                es_editable_en_contrato=False,
                es_obligatoria=True,
            )
        secciones_actualizadas = True

    return plantilla, creada, secciones_actualizadas


def run(empresa_id: int | None = None, force: bool = False) -> None:
    print("=" * 60)
    print("  Seed: Plantilla 'Contrato de Trabajo' (default por empresa)")
    print("=" * 60)

    if empresa_id is not None:
        empresas = Empresa.objects.filter(id=empresa_id)
        if not empresas.exists():
            print(f"  ERROR: no existe Empresa id={empresa_id}")
            return
    else:
        empresas = Empresa.objects.all()

    total = 0
    creadas = 0
    actualizadas = 0
    omitidas = 0

    with transaction.atomic():
        for empresa in empresas:
            plantilla, fue_creada, secciones_act = _crear_o_actualizar_plantilla(
                empresa, force=force
            )
            total += 1
            if fue_creada:
                creadas += 1
                print(f"  [CREADA] Empresa {empresa.id} ({empresa.nombre}) -> Plantilla id={plantilla.id}")
            elif secciones_act:
                actualizadas += 1
                print(f"  [ACTUALIZADA] Empresa {empresa.id} ({empresa.nombre}) -> Plantilla id={plantilla.id}")
            else:
                omitidas += 1
                print(
                    f"  [OMITIDA] Empresa {empresa.id} ({empresa.nombre}) -> "
                    f"Plantilla id={plantilla.id} ya existe (usa --force para regenerar secciones)"
                )

    print("-" * 60)
    print(
        f"  Total empresas procesadas: {total} "
        f"({creadas} creadas, {actualizadas} actualizadas, {omitidas} omitidas)"
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--empresa-id", type=int, default=None,
        help="ID de empresa especifica. Si se omite, se aplica a todas.",
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Sobrescribir secciones aunque la plantilla ya exista.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    run(empresa_id=args.empresa_id, force=args.force)
