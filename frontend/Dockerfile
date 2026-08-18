# syntax=docker/dockerfile:1
# Multi-Stage-Build für das SlobSteak-Frontend gemäß US-001 (Abschnitt 1.5: keine Cloud-Pflichtabhängigkeit).
# Build-Context ist frontend/.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
