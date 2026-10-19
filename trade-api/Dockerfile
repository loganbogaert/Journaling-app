FROM node:22-alpine

WORKDIR /app

COPY trade-api/package*.json ./
COPY shared /shared
# Install all deps (including devDeps) so sequelize-cli is available for migrations
RUN npm ci

COPY trade-api/ ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
