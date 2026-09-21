#!/usr/bin/env bash
# One-shot local setup. Run from the project root: bash setup.sh
set -e

echo "==> 1/5 Starting PostgreSQL"
docker compose up -d

echo "==> 2/5 Installing API packages"
cd apps/api
[ -f .env ] || cp .env.example .env
npm install

echo "==> 3/5 Creating the database schema"
npx prisma generate
npx prisma db push

echo "==> 4/5 Loading demo data"
npm run seed

echo "==> 5/5 Installing web packages"
cd ../web
[ -f .env ] || cp .env.example .env
npm install

cd ../..
echo ""
echo "Done. Open two terminals:"
echo "  Terminal 1:  cd apps/api && npm run dev     -> http://localhost:4000/api"
echo "  Terminal 2:  cd apps/web && npm run dev     -> http://localhost:5173"
echo ""
echo "Sign in with EMP0001 / Campus@123"
