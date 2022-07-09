FROM jrottenberg/ffmpeg:3.3-alpine
FROM node:18-alpine

WORKDIR /usr/src/app
COPY package*.json .
RUN npm install

COPY . .
CMD ["node", "."]