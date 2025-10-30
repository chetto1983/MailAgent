FROM node:24-alpine

# Force rebuild - Updated OTP verification endpoint
ARG BUILD_DATE
ENV BUILD_DATE=${BUILD_DATE}

WORKDIR /app

# Install netcat and openssl for database connectivity and Prisma
RUN apk add --no-cache netcat-openbsd openssl libstdc++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with legacy peer deps to handle version conflicts
RUN npm install --legacy-peer-deps

# Copy source
COPY tsconfig.json .
COPY src ./src

# Build application
RUN npm run build

# Copy entrypoint script
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application with entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
