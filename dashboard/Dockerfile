FROM oven/bun:1.3-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY dashboard/package.json dashboard/bun.lock* ./
RUN bun install --frozen-lockfile

# ARG to control asset inclusion (default: false for production builds)
ARG INCLUDE_ASSETS=false

# Copy and extract assets only if INCLUDE_ASSETS=true
# When false, assets are served by a separate asset server
COPY assets/*.tar.gz /tmp/assets/
RUN if [ "$INCLUDE_ASSETS" = "true" ]; then \
        mkdir -p public/assets/images/satisfactory/map/1763022054 && \
        tar -xzf /tmp/assets/map-realistic.tar.gz -C public/assets/images/satisfactory/map/1763022054 && \
        tar -xzf /tmp/assets/map-game.tar.gz -C public/assets/images/satisfactory/map/1763022054 && \
        tar -xzf /tmp/assets/scraped-images.tar.gz --strip-components=1 -C public/assets/images/satisfactory; \
    fi && \
    rm -rf /tmp/assets

# Copy source code
COPY dashboard/ .

ARG VITE_BUILD_VERSION=localbuild
ENV VITE_BUILD_VERSION=${VITE_BUILD_VERSION}

RUN bun run build

FROM nginx:alpine AS production

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY dashboard/docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
