FROM node:22-alpine

WORKDIR /app

COPY broker-integration-api/package*.json ./
COPY shared /shared
RUN npm ci

COPY broker-integration-api/ ./
RUN chmod +x entrypoint.sh

EXPOSE 4000
CMD ["./entrypoint.sh"]