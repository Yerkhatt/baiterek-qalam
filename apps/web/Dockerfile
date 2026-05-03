FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/form-engine packages/form-engine

RUN npm ci

FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:2745
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/form-engine packages/form-engine

RUN npm --workspace packages/form-engine run build
RUN npm --workspace apps/web run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
