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

# ---- runtime: nginx serves the static files and proxies /agent1-api, /agent2-api, /agent3-api and /agent4-api ----
FROM nginx:1.27-alpine
# The image's entrypoint runs envsubst on /etc/nginx/templates/*.template at start,
# so AGENT{1,2,3,4}_API_URL are set at runtime (server .env), not baked into the image.
# The filter limits substitution to those variables, so nginx's own $host, $uri,
# $remote_addr etc. are never touched. Output goes to /etc/nginx/conf.d/default.conf.
ENV NGINX_ENVSUBST_TEMPLATE_VARS='AGENT1_API_URL AGENT2_API_URL AGENT3_API_URL AGENT4_API_URL'
# Lets the deploy job prune only this app's dangling images, never another pod's.
LABEL app=smart-ops-dashboard
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Run as the non-root `nginx` user (same changes the nginx-unprivileged image makes):
#  - pid file moves to /tmp (the default location is root-only)
#  - the `user` directive is dropped (it only applies when the master runs as root)
#  - conf.d (rendered config) and the cache dirs are owned by nginx
# The grep fails the build if a future nginx base image changes these lines.
RUN sed -i -e 's,^pid .*,pid /tmp/nginx.pid;,' -e '/^user /d' /etc/nginx/nginx.conf \
 && grep -q '^pid /tmp/nginx.pid;' /etc/nginx/nginx.conf \
 && ! grep -q '^user ' /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /etc/nginx/conf.d /var/cache/nginx
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
