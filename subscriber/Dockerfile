FROM node:18-alpine

# Instalar dependências para compilar better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

# 1. Enable Corepack
RUN corepack enable

# 2. Use --immutable para build lockfile-based.
RUN yarn install --immutable

COPY . .

CMD ["node", "index.js"]