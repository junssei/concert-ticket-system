# syntax=docker/dockerfile:1
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production --no-audit --no-fund || yarn --production
COPY src ./src
EXPOSE 8080
CMD ["node", "src/index.js"]
