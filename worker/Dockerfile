FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY worker/package.json ./worker/

RUN npm install -g pnpm && pnpm install

COPY shared ./shared
COPY worker ./worker
COPY evaluation ./evaluation
COPY sandbox ./sandbox

RUN pnpm --filter @code-analysis/worker build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache docker-cli

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY worker/package.json ./worker/

RUN npm install -g pnpm && pnpm install --prod

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/worker/dist ./worker/dist
COPY --from=builder /app/evaluation ./evaluation
COPY --from=builder /app/sandbox ./sandbox

CMD ["node", "worker/dist/index.js"]
