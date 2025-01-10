# Build Stage
FROM node:20-alpine3.18 AS nest-build

RUN apk add --no-cache \
    vips-dev \
    chromium \
    udev \
    freetype \
    ttf-freefont \
    fontconfig \
    nss

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build


# Build Prod
FROM node:20-alpine3.18 AS production

RUN apk add --no-cache \
    chromium \
    udev \
    freetype \
    ttf-freefont \
    fontconfig \
    nss

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --from=nest-build /app/dist ./dist

ENV PUPPETEER_SKIP_DOWNLOAD true
ENV CHROME_BIN=/usr/bin/chromium-browser

CMD ["node", "./dist/main.js"]
