#!/bin/sh
set -e

echo "Running database migrations..."
bun run /app/migrate.js

echo "Starting server..."
exec bun run /app/index.js
