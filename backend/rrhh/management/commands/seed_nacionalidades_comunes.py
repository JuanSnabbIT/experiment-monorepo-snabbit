"""
Seed idempotente: limpia los registros de NacionalidadCatalogo existentes
(creados de forma ad-hoc via el select "crea nacionalidad" del wizard) y
crea el catalogo global completo de gentilicios (empresa=None), para que
el select de "Nacionalidad" del wizard de contratos (StepTrabajador.tsx)
muestre todas las nacionalidades de una vez.

Uso:
    python manage.py seed_nacionalidades_comunes
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from rrhh.models import NacionalidadCatalogo


NACIONALIDADES = [
    "Afgana", "Albanesa", "Alemana", "Andorrana", "Angoleña", "Antiguana",
    "Arabe Saudita", "Argelina", "Argentina", "Armenia", "Australiana",
    "Austriaca", "Azerbaiyana", "Bahameña", "Bangladesí", "Barbadense",
    "Bareiní", "Belga", "Beliceña", "Beninesa", "Bielorrusa", "Birmana",
    "Boliviana", "Bosnia", "Botsuana", "Brasileña", "Bruneana", "Búlgara",
    "Burkinesa", "Burundesa", "Butanesa", "Caboverdiana", "Camboyana",
    "Camerunesa", "Canadiense", "Catarí", "Chadiana", "Chilena", "China",
    "Chipriota", "Colombiana", "Comorense", "Congoleña", "Coreana (Norte)",
    "Coreana (Sur)", "Costamarfileña", "Costarricense", "Croata", "Cubana",
    "Danesa", "Dominicana", "Dominiquesa", "Ecuatoguineana", "Ecuatoriana",
    "Egipcia", "Emiratí", "Eritrea", "Eslovaca", "Eslovena", "Española",
    "Estadounidense", "Estonia", "Etíope", "Fiyiana", "Filipina",
    "Finlandesa", "Francesa", "Gabonesa", "Gambiana", "Georgiana",
    "Ghanesa", "Granadina", "Griega", "Guatemalteca", "Guyanesa",
    "Guineana", "Guineana Ecuatorial", "Guineana-Bisáu", "Haitiana",
    "Hondureña", "Húngara", "India", "Indonesia", "Iraquí", "Iraní",
    "Irlandesa", "Islandesa", "Israelí", "Italiana", "Jamaiquina",
    "Japonesa", "Jordana", "Kazaja", "Keniana", "Kirguisa", "Kiribatiana",
    "Kosovar", "Kuwaití", "Laosiana", "Lesotense", "Letona", "Libanesa",
    "Liberiana", "Libia", "Liechtensteiniana", "Lituana", "Luxemburguesa",
    "Macedonia", "Malgache", "Malasia", "Malauí", "Maldiva", "Malí",
    "Maltesa", "Marfileña", "Marroquí", "Marshalesa", "Mauriciana",
    "Mauritana", "Mexicana", "Micronesia", "Moldava", "Monegasca",
    "Mongola", "Montenegrina", "Mozambiqueña", "Namibia", "Nauruana",
    "Nepalí", "Nicaragüense", "Nigerina", "Nigeriana", "Noruega",
    "Neozelandesa", "Omaní", "Neerlandesa", "Pakistaní", "Palauana",
    "Palestina", "Panameña", "Papú", "Paraguaya", "Peruana", "Polaca",
    "Portuguesa", "Puertorriqueña", "Británica", "Centroafricana",
    "Checa", "Rusa", "Ruandesa", "Rumana", "Salomonense", "Salvadoreña",
    "Samoana", "Sanmarinense", "Santalucense", "Santotomense",
    "Sanvicentina", "Senegalesa", "Serbia", "Seychellense", "Sierraleonesa",
    "Singapurense", "Siria", "Somalí", "Sri Lanka", "Suazi", "Sudafricana",
    "Sudanesa", "Sudanesa del Sur", "Sueca", "Suiza", "Surinamesa",
    "Tailandesa", "Tanzana", "Tayika", "Timorense", "Togolesa",
    "Tonganesa", "Trinitense", "Tunecina", "Turcomana", "Turca",
    "Tuvaluana", "Ucraniana", "Ugandesa", "Uruguaya", "Uzbeka",
    "Vanuatuense", "Vaticana", "Venezolana", "Vietnamita", "Yemení",
    "Yibutiana", "Zambiana", "Zimbabuense",
]


class Command(BaseCommand):
    help = (
        "Limpia el catalogo de nacionalidades existente y siembra el "
        "catalogo global completo de gentilicios (idempotente)."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        eliminadas, _ = NacionalidadCatalogo.objects.all().delete()
        self.stdout.write(f"Registros previos eliminados: {eliminadas}")

        creadas = 0
        for nombre in NACIONALIDADES:
            _, created = NacionalidadCatalogo.objects.get_or_create(
                empresa=None,
                nombre=nombre,
            )
            if created:
                creadas += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completo: {creadas} nacionalidades globales creadas "
                f"(de {len(NACIONALIDADES)} en el catalogo)."
            )
        )
