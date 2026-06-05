FROM node:24-slim AS base

WORKDIR /app

COPY code/backend/package*.json ./

RUN npm ci

COPY code/backend/ .

EXPOSE 8787

CMD ["npm", "run", "dev"]
