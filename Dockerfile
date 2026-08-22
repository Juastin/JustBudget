# Stage 1: build frontend
FROM node:20-alpine AS frontend
WORKDIR /build
COPY justbudget-web/package*.json ./
RUN npm ci
COPY justbudget-web/ .
RUN npm run build

# Stage 2: build API
FROM node:20-alpine AS api
WORKDIR /build
COPY justbudget-api/package*.json ./
RUN npm ci
COPY justbudget-api/ .
RUN npm run build

# Stage 3: production image
FROM node:20-alpine
WORKDIR /app
COPY --from=api /build/dist ./dist
COPY --from=api /build/node_modules ./node_modules
COPY --from=api /build/package.json .
COPY --from=frontend /build/dist ./public
RUN mkdir -p /data
EXPOSE 3000
ENV NODE_ENV=production
ENV DB_PATH=/data/budget.db
CMD ["node", "dist/main"]
