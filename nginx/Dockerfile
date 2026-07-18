FROM oven/bun:1.1.22 AS frontend-builder
WORKDIR /app
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile || bun install
COPY packages/shared ./packages/shared
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN bun run build

FROM alpine:3.20 AS emulator
RUN apk add --no-cache bash curl git unzip
COPY scripts/setup-emulator.sh /setup-emulator.sh
COPY apps/frontend/emulator-static /emulator-static
ENV EMULATOR_DEST=/emulator
ENV EMULATOR_STATIC=/emulator-static
RUN bash /setup-emulator.sh

FROM nginx:alpine
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/.htpasswd /etc/nginx/.htpasswd
COPY --from=frontend-builder /app/apps/frontend/dist /var/www/frontend
COPY --from=emulator /emulator /var/www/frontend/emulator
