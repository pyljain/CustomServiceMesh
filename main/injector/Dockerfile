FROM node:10-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . /app
# ENV PORT=8080
# Run the web service on container startup.

CMD [ "npm", "start" ]