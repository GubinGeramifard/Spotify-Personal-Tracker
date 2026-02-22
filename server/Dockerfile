FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

ENV DB_PATH=/data/spotify-tracker.db

CMD ["node", "index.js"]
