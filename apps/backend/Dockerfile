FROM oven/bun:1.1.22 AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1.1.22 AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
ENV DATA_DIR=/data
ENV DATABASE_URL=file:/data/shellf.db
ENV PORT=3100
EXPOSE 3100
CMD ["bun", "run", "src/index.ts"]
