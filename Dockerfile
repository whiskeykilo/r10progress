# Stage 1: Build the React SPA
FROM node:22-alpine AS web-build
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Stage 2: Build the Node/Express server
FROM node:22-alpine AS server-build
RUN corepack enable && corepack prepare pnpm@10.32.0 --activate
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY server/ .
RUN pnpm run build && pnpm prune --prod

# Stage 3: Runtime image
FROM node:22-alpine
WORKDIR /app

# Copy built SPA
COPY --from=web-build /app/dist ./dist

# Copy server code and production deps
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules

ENV STATIC_DIR=/app/dist
ENV DATA_DIR=/data
ENV PORT=8080

EXPOSE 8080

VOLUME ["/data"]

CMD ["node", "server/dist/index.js"]
