FROM node:20-alpine

WORKDIR /app

# Enable Yarn (via Corepack)
RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY index.html ./
COPY public ./public
COPY src ./src

EXPOSE 5173

CMD ["yarn", "dev", "--host", "0.0.0.0"]
