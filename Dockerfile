FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN corepack enable && yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:20-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV PORT=3000
ENV ACCOUNTING_DB_FILE=/data/accounting-state.sqlite
ENV ACCOUNTING_STATE_FILE=/data/accounting-state.json

COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /data /app/data/storage \
  && chown -R node:node /app /data

USER node

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
