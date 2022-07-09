FROM node:18-alpine
FROM jrottenberg/ffmpeg:3.3-alpine

WORKDIR /usr/src/app
COPY package*.json .
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install npm -y
RUN npm install

COPY . .
CMD ["node", "."]