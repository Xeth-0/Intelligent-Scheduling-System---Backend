# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY ./package*.json ./
COPY ./prisma/schema.prisma ./prisma/

# Install dependencies including dev dependencies for build
RUN npm ci --include=dev

# Copy all source files
COPY ./ .

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

# Environment variables
ENV NODE_ENV=production
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Generate Prisma client and run migrations
RUN npx prisma generate
RUN npx prisma migrate deploy

EXPOSE 3000
CMD ["npm", "run", "start:prod"]