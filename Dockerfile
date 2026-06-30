FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PYTHON_BIN=python3
ENV YT_DLP_BIN=yt-dlp
ENV FFMPEG_BIN=ffmpeg
ENV TEMP_DIR=/tmp/neptune
ENV MAX_VIDEO_DURATION_SECONDS=600
ENV TEMP_FILE_TTL_MINUTES=30
ENV MAX_CONCURRENT_JOBS=2
ENV JOB_TIMEOUT_SECONDS=900
ENV LOG_LEVEL=info

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY worker/requirements.txt ./worker/requirements.txt
RUN python3 -m pip install --break-system-packages --no-cache-dir -r ./worker/requirements.txt

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/worker ./worker

RUN mkdir -p /tmp/neptune
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0"]
