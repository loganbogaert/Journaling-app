FROM node:22-alpine

RUN apk add --no-cache chromium font-liberation

ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY broker-integration-api/package*.json ./
COPY shared /shared
RUN npm ci

COPY --chown=node:node broker-integration-api/ ./
RUN chmod +x entrypoint.sh

USER node

EXPOSE 4000
CMD ["./entrypoint.sh"]