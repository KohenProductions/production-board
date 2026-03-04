#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting dev server..."
npm run dev &
DEV_PID=$!

# Wait for server to be reachable (wait-on from node_modules)
npx wait-on http://localhost:3000 --timeout 60000
open http://localhost:3000

wait $DEV_PID
