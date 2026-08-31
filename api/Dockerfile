FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/
COPY worker/package.json ./worker/

RUN npm install -g pnpm && pnpm install

COPY api ./api
COPY worker ./worker
COPY evaluation ./evaluation

RUN pnpm --filter @code-analysis/api build

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY api/package.json ./api/
COPY worker/package.json ./worker/

RUN npm install -g pnpm && pnpm install --prod

COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/worker/dist ./worker/dist
COPY --from=builder /app/evaluation ./evaluation

EXPOSE 3001
CMD ["node", "api/dist/index.js"]
