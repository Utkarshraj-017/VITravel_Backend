FROM node:20.19.0-bookworm-slim AS dependencies

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:20.19.0-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./server.js
COPY src ./src

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["npm", "start"]
