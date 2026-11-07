#!/bin/sh
set -e

echo "Running database migrations..."
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

echo "Starting server..."
exec node index.js
