FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM node:22-bookworm-slim AS backend-deps

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV SERVER_HOST=0.0.0.0
ENV DB_PATH=../data/projectdb.sqlite
ENV UPLOAD_PATH=../uploads
ENV BACKUP_PATH=../backups

WORKDIR /app

COPY server.js ./
COPY backend ./backend
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data /app/uploads /app/backups \
  && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "server.js"]
