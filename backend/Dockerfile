# Build stage
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src/i18n ./src/i18n

RUN mkdir -p uploads && chown -R nestjs:nodejs uploads

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]
