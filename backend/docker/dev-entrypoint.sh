#!/bin/sh
set -eu

if [ ! -d node_modules ] || [ ! -d node_modules/@prisma/client ]; then
  echo "Installing backend dependencies inside container volume..."
  npm install
fi

echo "Generating Prisma client..."
npm run prisma:generate

echo "Pushing Prisma schema..."
npm run db:push

echo "Preparing database schema..."
npm run db:prepare

echo "Seeding database if needed..."
npm run db:seed

exec npm run dev
