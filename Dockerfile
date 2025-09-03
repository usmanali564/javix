FROM node:lts-alpine

RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    ffmpeg \
    imagemagick \
    webp && \
    npm i pm2 -g && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy source code
COPY . .

CMD ["pm2-runtime", "ecosystem.config.cjs"] 