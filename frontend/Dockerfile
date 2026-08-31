FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY api/package.json ./api/
COPY worker/package.json ./worker/
COPY frontend/package.json ./frontend/

RUN npm install -g pnpm && pnpm config set minimum-release-age 0 && pnpm install --no-frozen-lockfile --ignore-scripts

COPY shared ./shared
COPY frontend ./frontend

RUN pnpm --filter @code-analysis/shared build
RUN pnpm --filter @code-analysis/frontend build

FROM nginx:alpine AS runner
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 5173

RUN echo $'server {\n\
    listen 5173;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api {\n\
        proxy_pass http://api:3001;\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
