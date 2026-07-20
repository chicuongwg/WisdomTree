# One deployable: the Next.js server, its traced dependencies, and the two
# external binaries the app shells out to. Multi-stage so the runtime image
# carries no source tree and no devDependencies.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A build must never need the runtime secret: src/lib/sign.ts resolves it
# lazily for exactly this reason. Nothing secret belongs in an image layer.
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app

# git is load-bearing — the export target commits into a bare repo
# (src/modules/export/target.ts). pandoc gives real docx export; without a TeX
# engine, pdf degrades to the HTML artifact with a converterWarning, which
# src/modules/export/renderer.ts already handles.
# ponytail: no TeX engine here, it is ~1 GB for one format. Add texmf-dist if
# real PDF export is ever asked for.
RUN apk add --no-cache git pandoc

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Both default to paths under /app/data, which is a volume — see compose.
ENV FILE_STORAGE_DIR=/app/data/objects
ENV EXPORT_REPO_DIR=/app/data/content-repo.git

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Migrations run from the image so a deploy is one command. migrate.ts is
# plain TypeScript over `pg`, which the standalone trace already includes, so
# node's own type stripping runs it — no tsx in the runtime image.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/db/migrate.ts ./scripts/db/migrate.ts

RUN mkdir -p /app/data/objects && chown -R node:node /app/data
USER node

EXPOSE 3000
# server.js is what `output: "standalone"` emits.
CMD ["node", "server.js"]
