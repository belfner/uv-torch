FROM node:slim AS build
WORKDIR /workspace
ARG VITE_BASE=/torch-uv/
ENV VITE_BASE=${VITE_BASE}

COPY  package-lock.json package.json vite.config.js /workspace/
RUN npm install
COPY ./src /workspace/src
COPY ./public /workspace/public
COPY index.html /workspace/

RUN npm run build

FROM nginx:alpine
ARG VITE_BASE=/torch-uv/
COPY --from=build /workspace/dist/ /usr/share/nginx/
RUN mv /usr/share/nginx/pytorch_info.json /var/cache/pytorch_info.seed.json \
    && ln -s /torch-info/pytorch_info.json /usr/share/nginx/pytorch_info.json
COPY nginx.conf /etc/nginx/nginx.conf
RUN PREFIX="$(printf '%s' "$VITE_BASE" | sed 's:/*$::')"; \
    { echo 'server {'; \
      echo '  listen 80; server_name _;'; \
      echo '  root /usr/share/nginx; index index.html;'; \
      if [ -z "$PREFIX" ]; then \
        echo '  location / { try_files $uri $uri/ /index.html; }'; \
      else \
        echo "  location ${PREFIX}/ { alias /usr/share/nginx/; try_files \$uri \$uri/ ${PREFIX}/index.html; }"; \
        echo '  location / { try_files $uri $uri/ =404; }'; \
      fi; \
      echo '}'; } > /etc/nginx/conf.d/app.conf
COPY seed-volume.sh /docker-entrypoint.d/10-seed-volume.sh
RUN chmod +x /docker-entrypoint.d/10-seed-volume.sh
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
