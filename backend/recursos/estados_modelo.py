# estados_modelo.py

TIPO_EQUIPO = (
    ("ESCRITORIO", "Escritorio"),
    ("PORTATIL",   "Portátil"),
    ("MOVIL",      "Móvil"),
    ("TABLET",     "Tableta"),
    ("OTRO",       "Otro tipo de equipo"),
)

MARCA_EQUIPO = (
    ("HP",       "HP"),
    ("DELL",     "Dell"),
    ("APPLE",    "Apple"),
    ("LENOVO",   "Lenovo"),
    ("ACER",     "Acer"),
    ("ASUS",     "Asus"),
    ("OTRA",     "Otra marca"),
)

TIPO_PROCESADOR = (
    ("INTEL", "Intel"),
    ("AMD",   "AMD"),
    ("OTRO",  "Otro"),
)

GENERACION_PROCESADOR = (
    ("GEN_6",  "6ª Generación"),
    ("GEN_7",  "7ª Generación"),
    ("GEN_8",  "8ª Generación"),
    ("GEN_9",  "9ª Generación"),
    ("GEN_10", "10ª Generación"),
    ("GEN_11",  "11ª Generación"),
    ("GEN_12",  "12ª Generación"),
    ("GEN_13",  "13ª Generación"),
    ("GEN_14",  "14ª Generación"),
    ("GEN_15",  "15ª Generación"),
    ("OTRA",   "Otra generación"),
)

TAMANIO_RAM = (
    ("4GB",   "4 GB"),
    ("6GB", "6 GB"),
    ("8GB",   "8 GB"),
    ("12GB", "12 GB"),
    ("16GB",  "16 GB"),
    ("32GB",  "32 GB"),
    ("64GB",  "64 GB"),
    ("OTRA",  "Otra capacidad"),
)

TIPO_ALMACENAMIENTO = (
    ("HDD_500GB",  "HDD 500 GB"),
    ("HDD_1TB",    "HDD 1 TB"),
    ("SSD_256GB",  "SSD 256 GB"),
    ("SSD_512GB",  "SSD 512 GB"),
    ("SSD_1TB",    "SSD 1 TB"),
    ("OTRO",       "Otro tipo o capacidad"),
)

SISTEMA_OPERATIVO = (
    ("WINDOWS10",  "Windows 10"),
    ("WINDOWS11",  "Windows 11"),
    ("UBUNTU",     "Ubuntu"),
    ("DEBIAN",     "Debian"),
    ("MACOS",      "macOS"),
    ("ANDROID",    "Android"),
    ("IOS",        "iOS"),
    ("OTRO",       "Otro SO"),
)

CONDICIONES_EQUIPO = (
    ("USADO",  "Usado"),
    ("NUEVO",  "Nuevo"),
    ("REFACCIONADO",  "Refaccionado"),
    ("OTRO",  "Otro"),
)

TIPO_TARJETA_GRAFICA = (
    ("DEDICADA", "Dedicada"),
    ("INTEGRADA",   "Integrada"),
    ("SIN_ESPECIFICAR",  "Sin Especificar"),
)

MARCA_TARJETA_GRAFICA = (
    ("AMD", "AMD"),
    ("INTEL", "Intel"),
    ("NVIDIA", "Nvidia"),
    ("OTRA", "Otra"),
)