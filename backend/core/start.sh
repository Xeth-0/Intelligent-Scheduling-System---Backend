#!/bin/sh
set -e

echo "🚀 Starting ISS Core Service..."

# Function to handle graceful shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    # Kill Prisma Studio if it's running
    if [[ -n "$STUDIO_PID" ]]; then
        kill $STUDIO_PID 2>/dev/null || true
    fi
    exit 0
}

# Trap SIGTERM and SIGINT to handle graceful shutdown
trap cleanup SIGTERM SIGINT

echo "📊 Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed

echo "🎯 Starting Prisma Studio on port 5555..."
npx prisma studio --port 5555 &
STUDIO_PID=$!

# Wait a moment for Prisma Studio to start
# sleep 3

# echo "🖥️  Prisma Studio started with PID: $STUDIO_PID"
# echo "🌐 Prisma Studio available at: http://localhost:5555"

echo "🚀 Starting NestJS application..."
node dist/src/main.js &
APP_PID=$!

echo "📱 NestJS application started with PID: $APP_PID"

# Wait for the main application process
wait $APP_PID