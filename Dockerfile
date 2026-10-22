FROM oven/bun:alpine AS base
WORKDIR /app

FROM base AS builder
COPY package.json bun.lock* ./
RUN bun install
COPY . .
RUN bun run build

FROM base AS runtime-deps
WORKDIR /app
RUN echo '{"dependencies": {"sharp": "^0.35.5", "pg": "^8.23.0", "@libsql/client": "^0.18.0"}}' > package.json
RUN bun install --production

FROM oven/bun:alpine AS runner
RUN apk add --no-cache libc6-compat wget curl ffmpeg

WORKDIR /app

ENV NODE_ENV=production \
  HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 nxc

COPY --from=builder --chown=nxc:bunjs /app/dist ./dist
COPY --from=runtime-deps --chown=nxc:bunjs /app/node_modules ./dist/server/node_modules

WORKDIR /app/dist
USER nxc

EXPOSE 3000

CMD [ "bun", "./server/server.js" ]