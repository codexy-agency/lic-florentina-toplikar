# RS Odontología — imagen para correr en un contenedor (EasyPanel u otro).
#
# Modo de datos:
#   - Con NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + PROFESSIONAL_ID:
#     guarda en Supabase y el volumen no hace falta.
#   - Sin esas tres: modo archivo. Guarda db.json y auth.json en DATA_DIR (/data).
#     /data TIENE que ser un volumen persistente o los turnos se pierden al
#     recrear el contenedor. Una sola réplica: el modo archivo no admite dos.
#
# Variables obligatorias en ejecución: ADMIN_SECRET (32+ caracteres al azar) y
# ADMIN_PASSWORD (clave de transición del panel hasta crear la primera cuenta).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_OUTPUT=standalone
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

# Servidor autocontenido + estáticos + imágenes públicas.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Guías que muestra /admin/ayuda y el script para crear la cuenta dueña
# (docker exec -it <contenedor> node scripts/crear-cuenta.mjs --email ... --nombre ... --rol owner).
COPY --from=build --chown=node:node /app/docs/guias/PRIMEROS-PASOS.md /app/docs/guias/GUIA-PANEL.md ./docs/guias/
COPY --from=build --chown=node:node /app/scripts/crear-cuenta.mjs ./scripts/crear-cuenta.mjs

# La carpeta nace con dueño "node": un volumen con nombre hereda ese permiso.
# El runbook interno de Codexy no viaja en la imagen del cliente.
RUN rm -f docs/guias/OPERACION.md && mkdir -p /data && chown node:node /data
VOLUME ["/data"]

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/robots.txt >/dev/null || exit 1

CMD ["node", "server.js"]
