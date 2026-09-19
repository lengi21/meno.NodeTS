FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm config set dangerouslyAllowAllBuilds true && pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate && pnpm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main.js"]

