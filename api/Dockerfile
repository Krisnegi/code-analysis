FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY worker/package.json ./worker/
COPY frontend/package.json ./frontend/

RUN npm install -g pnpm && pnpm config set minimum-release-age 0 && pnpm install --no-frozen-lockfile --ignore-scripts

COPY shared ./shared
COPY api ./api
COPY worker ./worker
COPY evaluation ./evaluation

RUN pnpm --filter @code-analysis/shared build
RUN pnpm --filter @code-analysis/api build

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY worker/package.json ./worker/
COPY frontend/package.json ./frontend/

RUN npm install -g pnpm && pnpm config set minimum-release-age 0 && pnpm install --prod --no-frozen-lockfile --ignore-scripts

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/worker/dist ./worker/dist
COPY --from=builder /app/evaluation ./evaluation

EXPOSE 3001
CMD ["node", "api/dist/index.js"]
