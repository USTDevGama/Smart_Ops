# syntax=docker/dockerfile:1

# ---- build: compile the SPA ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# VITE_* values are bundled into the browser (public). Production talks to the real API.
ARG VITE_USE_MOCKS=false
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS
RUN npm run build

# ---- runtime: nginx serves the static files and proxies /agent3-api ----
FROM nginxinc/nginx-unprivileged:1.27-alpine
# The image's entrypoint runs envsubst on /etc/nginx/templates/*.template at start,
# so AGENT3_API_URL is set at runtime (server .env), not baked into the image.
# The filter limits substitution to that one variable, so nginx's own $host, $uri,
# $remote_addr etc. are never touched. Output goes to /etc/nginx/conf.d/default.conf.
ENV NGINX_ENVSUBST_FILTER=AGENT3_API_URL
# Lets the deploy job prune only this app's dangling images, never another pod's.
LABEL app=smart-ops-dashboard
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
