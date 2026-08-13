FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# Install all deps (including devDeps) so sequelize-cli is available for migrations
RUN npm ci

COPY . .

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
