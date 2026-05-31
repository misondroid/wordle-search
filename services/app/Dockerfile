FROM node:24-alpine AS base

WORKDIR /app

COPY code/frontend/package*.json ./

RUN npm ci

COPY code/frontend/ .

CMD ["npm", "run", "dev"]