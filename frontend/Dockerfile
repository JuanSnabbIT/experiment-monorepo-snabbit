# Etapa de construcción
#FROM node:18-alpine AS build
FROM node:22-alpine AS build

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package.json package-lock.json ./

# Instala dependencias ignorando conflictos de peer dependencies
RUN npm ci --legacy-peer-deps

COPY . .

RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Etapa de producción
FROM nginx:stable-alpine

# Copia la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos estáticos desde /app/build
# COPY --from=build /app/build /usr/share/nginx/html
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
