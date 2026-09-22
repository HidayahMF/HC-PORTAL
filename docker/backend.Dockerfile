FROM node:20-bookworm-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","src/server.js"]
