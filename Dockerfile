# API tracker — contexto: raíz del repo (Railway / docker-compose)
FROM node:20-alpine
WORKDIR /app

COPY apps/api/package.json apps/api/package-lock.json ./
RUN npm ci --omit=dev

COPY apps/api/src ./src
COPY apps/web/data /data

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/index.js"]
