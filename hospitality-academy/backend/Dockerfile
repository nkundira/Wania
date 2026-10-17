FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Uploads are written to ${WORKDIR}/src/uploads at runtime.
# Mount a persistent volume here for durable images.
RUN mkdir -p /app/src/uploads

CMD ["node", "src/server.js"]
