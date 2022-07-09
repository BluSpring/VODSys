FROM node:18
FROM alfg/ffmpeg:latest
WORKDIR /usr/src/app
COPY package*.json .
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install npm -y
RUN npm install

COPY . .
CMD ["node", "."]