# Multi-stage Dockerfile for RogueByte POS & ERP Production Deployment

# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts 2>/dev/null || true

EXPOSE 3000

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
