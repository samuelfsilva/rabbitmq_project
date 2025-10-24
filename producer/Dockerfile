FROM node:18-alpine

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable && corepack prepare yarn@4.9.4 --activate

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn install

CMD ["node", "index.js"]