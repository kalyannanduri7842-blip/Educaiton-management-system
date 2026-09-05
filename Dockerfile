# Multi-stage Dockerfile for EduSphere Education CRM & Academic Management Platform
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies and build tools
COPY package*.json ./
RUN npm install --omit=dev || true

# Copy full application codebase
COPY . .

# Run build verification
RUN npm run build

# Expose backend API (4001) and frontend UI (3001)
EXPOSE 4001 3001

ENV NODE_ENV=production
ENV PORT=4001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1));"

# Launch master server entrypoint
CMD ["node", "index.js"]
