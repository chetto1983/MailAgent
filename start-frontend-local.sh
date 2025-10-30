#!/bin/bash

# Set environment variables for local development
export NEXT_PUBLIC_API_URL=http://localhost:3000

cd "$(dirname "$0")/frontend"

echo "🚀 Starting MailAgent Frontend (Local Development)"
echo "📍 Frontend: http://localhost:3001"
echo "🔗 API URL: http://localhost:3000"
echo ""

npm run dev
