FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm install
RUN npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src
COPY docker ./docker

RUN chmod +x /app/docker/dev-entrypoint.sh

EXPOSE 3000

CMD ["sh", "/app/docker/dev-entrypoint.sh"]
