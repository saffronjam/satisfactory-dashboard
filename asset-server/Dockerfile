FROM nginx:alpine AS production

WORKDIR /usr/share/nginx/html

# Copy tar assets and extract them
COPY assets/*.tar.gz /tmp/assets/
RUN mkdir -p assets/images/satisfactory/map/1763022054 && \
    tar -xzf /tmp/assets/map-realistic.tar.gz -C assets/images/satisfactory/map/1763022054 && \
    tar -xzf /tmp/assets/map-game.tar.gz -C assets/images/satisfactory/map/1763022054 && \
    tar -xzf /tmp/assets/scraped-images.tar.gz --strip-components=1 -C assets/images/satisfactory && \
    rm -rf /tmp/assets

# Copy nginx configuration
COPY asset-server/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
