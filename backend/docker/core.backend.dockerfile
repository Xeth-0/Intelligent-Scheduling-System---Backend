# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY backend/core/package*.json ./
COPY backend/core/prisma/schema.prisma ./prisma/

# Install dependencies including dev dependencies for build
RUN npm ci --include=dev

# Copy all source files
COPY backend/core/ .

# Build the application
RUN npm run build

# Install production dependencies only
RUN npm ci --omit=dev

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files and production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Environment variables for runtime configuration
ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}

# Generate Prisma client
RUN npx prisma generate

# Migration setup (adjust as needed)
RUN npx prisma migrate deploy

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
