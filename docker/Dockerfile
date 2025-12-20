# Multi-stage build for Teacher Portal

# Stage 1: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# Stage 2: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV NEXT_PUBLIC_API_URL=https://home-schooling.fly.dev/api
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production

# Install nginx
RUN apk add --no-cache nginx

# Setup nginx
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy backend
WORKDIR /app/backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./
COPY backend/src/data/schema.sql ./src/data/schema.sql

# Copy frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /app/frontend/.next/standalone ./
COPY --from=frontend-builder /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder /app/frontend/public ./public

# Create data directory
RUN mkdir -p /data

# Startup script
WORKDIR /app
COPY docker/start.sh ./
RUN chmod +x start.sh

EXPOSE 8080

CMD ["./start.sh"]
