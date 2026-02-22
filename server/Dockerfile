FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

ENV DB_PATH=/data/spotify-tracker.db

EXPOSE 3001

CMD ["node", "index.js"]
