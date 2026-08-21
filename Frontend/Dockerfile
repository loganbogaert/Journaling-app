# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Serve stage
FROM nginx:1.27-alpine
COPY --from=builder /app/dist/trading-journal-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/generate-env.sh /docker-entrypoint.d/generate-env.sh
RUN chmod +x /docker-entrypoint.d/generate-env.sh
EXPOSE 80
