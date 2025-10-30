FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

# Run Next.js in development mode for Docker
# (production would require pre-built .next which has caching issues in Docker)
CMD ["npm", "run", "dev"]
