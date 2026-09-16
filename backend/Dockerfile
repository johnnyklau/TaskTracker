# Stage 1: build
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# Stage 2: runtime
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder --chown=node:node /app/dist ./dist

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["npm", "start"]