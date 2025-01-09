# Gunakan image Node.js sebagai base image
FROM node:18-alpine

# Install dependensi yang dibutuhkan oleh Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    npm \
    bash

# Variabel lingkungan untuk Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Direktori kerja aplikasi
WORKDIR /app

# Salin package.json dan package-lock.json, dan install dependensi
COPY package.json package-lock.json ./
RUN npm install --production

# Salin seluruh kode aplikasi
COPY . .

# Build aplikasi NestJS
RUN npm run build

# Ekspose port aplikasi
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "run", "start:prod"]
