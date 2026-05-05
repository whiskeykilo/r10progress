# Stage 1: Build the React SPA
FROM node:22-alpine AS web-build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Build the Node/Express server
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npm run build && npm prune --omit=dev

# Stage 3: Runtime image
FROM node:22-alpine
WORKDIR /app

# Copy built SPA
COPY --from=web-build /app/dist ./dist

# Copy server code and production deps
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules

# Tell the server where to find the static files
ENV STATIC_DIR=/app/dist
ENV DATA_DIR=/data
ENV PORT=8080

EXPOSE 8080

# /data is the volume mount point for the SQLite database
VOLUME ["/data"]

CMD ["node", "server/dist/index.js"]
