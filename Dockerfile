FROM oven/bun:1-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/server/package.json ./apps/server/
COPY sdk/package.json ./sdk/
RUN bun install --production

FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build:server

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
RUN mkdir -p /app/data
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
