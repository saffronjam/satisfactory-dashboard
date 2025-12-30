FROM oven/bun:1.3-slim AS build

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_BUILD_VERSION=localbuild
ENV VITE_BUILD_VERSION=${VITE_BUILD_VERSION}

RUN bun run build

FROM nginx:alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
