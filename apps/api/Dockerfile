FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/form-engine packages/form-engine

RUN npm ci

FROM deps AS builder
WORKDIR /app

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/form-engine packages/form-engine

RUN npm --workspace packages/form-engine run build
RUN npm --workspace apps/api run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=2745

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/packages/form-engine packages/form-engine

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist apps/api/dist

EXPOSE 2745

CMD ["npm", "--workspace", "apps/api", "run", "start"]
