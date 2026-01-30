export const TIPO_EQUIPO: { value: string; label: string }[] = [
    { value: 'ESCRITORIO', label: 'Escritorio' },
    { value: 'PORTATIL', label: 'Portátil' },
    { value: 'MOVIL', label: 'Móvil' },
    { value: 'TABLET', label: 'Tableta' },
    { value: 'OTRO', label: 'Otro tipo de equipo' },
];

export const MARCA_EQUIPO: { value: string; label: string }[] = [
    { value: 'HP', label: 'HP' },
    { value: 'DELL', label: 'Dell' },
    { value: 'APPLE', label: 'Apple' },
    { value: 'LENOVO', label: 'Lenovo' },
    { value: 'ACER', label: 'Acer' },
    { value: 'ASUS', label: 'Asus' },
    { value: 'OTRA', label: 'Otra marca' },
];

export const TIPO_PROCESADOR: { value: string; label: string }[] = [
    { value: 'INTEL', label: 'Intel' },
    { value: 'AMD', label: 'AMD' },
    { value: 'OTRO', label: 'Otro' },
];

export const GENERACION_PROCESADOR: { value: string; label: string }[] = [
    { value: 'GEN_6', label: '6ª Generación' },
    { value: 'GEN_7', label: '7ª Generación' },
    { value: 'GEN_8', label: '8ª Generación' },
    { value: 'GEN_9', label: '9ª Generación' },
    { value: 'GEN_10', label: '10ª Generación' },
    { value: 'GEN_11', label: '11ª Generación' },
    { value: 'GEN_12', label: '12ª Generación' },
    { value: 'GEN_13', label: '13ª Generación' },
    { value: 'GEN_14', label: '14ª Generación' },
    { value: 'GEN_15', label: '15ª Generación' },
    { value: 'OTRA', label: 'Otra generación' },
];

export const TAMANIO_RAM: { value: string; label: string }[] = [
    { value: '4GB', label: '4 GB' },
    { value: '6GB', label: '6 GB' },
    { value: '8GB', label: '8 GB' },
    { value: '12GB', label: '12 GB' },
    { value: '16GB', label: '16 GB' },
    { value: '32GB', label: '32 GB' },
    { value: '64GB', label: '64 GB' },
    { value: 'OTRA', label: 'Otra capacidad' },
];

export const TIPO_ALMACENAMIENTO: { value: string; label: string }[] = [
    { value: 'HDD_500GB', label: 'HDD 500 GB' },
    { value: 'HDD_1TB', label: 'HDD 1 TB' },
    { value: 'SSD_256GB', label: 'SSD 256 GB' },
    { value: 'SSD_512GB', label: 'SSD 512 GB' },
    { value: 'SSD_1TB', label: 'SSD 1 TB' },
    { value: 'OTRO', label: 'Otro tipo o capacidad' },
];

export const SISTEMA_OPERATIVO: { value: string; label: string }[] = [
    { value: 'WINDOWS10', label: 'Windows 10' },
    { value: 'WINDOWS11', label: 'Windows 11' },
    { value: 'UBUNTU', label: 'Ubuntu' },
    { value: 'DEBIAN', label: 'Debian' },
    { value: 'MACOS', label: 'macOS' },
    { value: 'ANDROID', label: 'Android' },
    { value: 'IOS', label: 'iOS' },
    { value: 'OTRO', label: 'Otro SO' },
];

export const CONDICIONES_EQUIPO: { value: string; label: string }[] = [
    { value: 'USADO', label: 'Usado' },
    { value: 'NUEVO', label: 'Nuevo' },
    { value: 'REFACCIONADO', label: 'Refaccionado' },
    { value: 'OTRO', label: 'Otro' },
];

export const MARCA_TARJETA_GRAFICA: { value: string; label: string }[] = [
    { value: 'AMD', label: 'AMD' },
    { value: 'INTEL', label: 'Intel' },
    { value: 'NVIDIA', label: 'Nvidia' },
    { value: 'OTRA', label: 'Otra' },
];

export const TIPO_TARJETA_GRAFICA: { value: string; label: string }[] = [
    { value: 'DEDICADA', label: 'Dedicada' },
    { value: 'INTEGRADA', label: 'Integrada' },
    { value: 'SIN_ESPECIFICAR', label: 'Sin Especificar' },
];
