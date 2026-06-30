# Mizan frontend — multi-stage.
#   target: dev   → Vite dev server (hot reload), used by docker-compose.yml
#   target: prod  → built SPA served by nginx, used by docker-compose.prod.yml

# ---- deps + source ----
FROM node:22-slim AS base
WORKDIR /app
# No lockfile yet, so npm install.
COPY package*.json ./
RUN npm install
COPY . .

# ---- development: Vite dev server ----
FROM base AS dev
EXPOSE 5174
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]

# ---- build: produce static assets ----
FROM base AS build
# VITE_API_URL is inlined at build time. Single-origin default: relative /api,
# proxied to the backend by nginx (see nginx.conf).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- production: nginx serving the build + proxying /api ----
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Uses the nginx image's default CMD.
