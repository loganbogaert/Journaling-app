FROM node:22-alpine

WORKDIR /app

COPY broker-sync-api/package*.json ./
COPY shared /shared
RUN npm ci

COPY broker-sync-api/ ./
RUN chmod +x entrypoint.sh

EXPOSE 4000
CMD ["./entrypoint.sh"]