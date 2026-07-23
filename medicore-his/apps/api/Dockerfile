# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /workspace
ENV CI=true
RUN corepack enable
RUN apk add --no-cache openssl

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types

RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter @medicore/api exec prisma generate

RUN pnpm --filter @medicore/api build
RUN pnpm deploy --filter @medicore/api --prod --legacy /app
RUN rm -rf /app/src /app/test /app/prisma \
	&& find /app -type f \( -name "*.d.ts" -o -name "*.map" -o -name "*.md" \) -delete \
	&& find /app/node_modules -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "docs" -o -name "doc" \) -exec rm -rf {} + \
	&& rm -rf /app/node_modules/prisma \
	&& rm -rf /app/node_modules/.pnpm/prisma@* \
	&& rm -rf /app/node_modules/.pnpm/@prisma+fetch-engine@* \
	&& rm -rf /app/node_modules/.pnpm/@prisma+engines@* \
	&& rm -rf /app/node_modules/.pnpm/@prisma+get-platform@*

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /app ./
COPY --from=builder /workspace/apps/api/dist ./dist
COPY --from=builder /workspace/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://localhost:3000/api/v1/health').then((r)=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/main"]
