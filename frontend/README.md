# Gestión Snabbit - Frontend

Este proyecto corresponde al frontend de nuestro sistema ERP. Se construyó partiendo de la plantilla **Fyr** de **Omtanke Studio** y se adaptó completamente a nuestras necesidades.

## Principales ajustes sobre la plantilla original

- Personalización del tema con **Tailwind** y `theme.config.ts` para utilizar nuestra paleta de colores y la fuente **Poppins**.
- Traducción de la interfaz al español y configuración inicial de internacionalización.
- Integración de autenticación con manejo de tokens y refresco automático usando **Axios** y **RTK Query** (ver `src/services`).
- Implementación de módulos propios para la operación diaria de la empresa.
- Preparación para despliegues en **Docker** junto a **Nginx**.

## Módulos del sistema

El menú lateral agrupa las funciones en distintas secciones:

- **Dashboard**: panel inicial con indicadores y widgets personalizables.
- **Empresa**: administración de usuarios, empresas, sucursales y contratos.
- **Cotización**: generación y seguimiento de cotizaciones a clientes.
- **Compras**: órdenes de compra, proveedores y seguimiento de adquisiciones.
- **Bodega**: control de bodegas, guías de salida y tomas de inventario.
- **Orden de Trabajo**: gestión de OT, asistencias técnicas y archivos asociados.
- **Registros**: catálogos de categorías, fabricantes, items y usuarios.
- **Vacaciones**: solicitudes y control de vacaciones de los trabajadores.
- **Recursos**: softwares y recursos disponibles para la empresa.
- **Rendiciones**: envío y revisión de gastos rendidos.
- **Invitaciones**: incorporación de nuevas empresas al sistema.

Además se incluyen páginas para autenticación, perfil de usuario y otras utilidades.

## Instalación

1. Clona este repositorio.
2. Ejecuta `npm install` para instalar las dependencias.
3. Copia `.env.production` y ajusta `VITE_API_URL` con la URL de la API.

## Comandos de uso

- `npm run dev` &nbsp;→ inicia el modo desarrollo.
- `npm run build` &nbsp;→ genera la versión optimizada en `dist`.
- `npm run preview` &nbsp;→ sirve localmente la compilación.
- `npm run lint` &nbsp;→ verifica la calidad del código.

Para construir la imagen Docker:

```bash
docker build -t gestionerp .
```

y ejecutarla con:

```bash
docker run -p 80:80 gestionerp
```

## Estructura del proyecto

El código fuente se encuentra en `src/` y se organiza en:

- `pages/` &nbsp;→ componentes de cada módulo.
- `routes/` &nbsp;→ definición de rutas y menús.
- `components/` &nbsp;→ componentes reutilizables.
- `config/` &nbsp;→ configuración de páginas y temas.
- `services/` &nbsp;→ capa de comunicación con la API.

Para conocer cada módulo en detalle revisa `src/config/pages.config.ts`.

---

Este repositorio contiene únicamente el frontend y se comunica con la API definida en `VITE_API_URL`.
