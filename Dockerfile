FROM node:18
FROM alfg/ffmpeg:latest
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install

COPY . .
CMD ["node", "."]