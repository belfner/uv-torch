FROM node:slim AS build
WORKDIR /workspace

COPY  package-lock.json package.json vite.config.js /workspace/
RUN npm install
COPY ./src /workspace/src
COPY ./public /workspace/public
COPY index.html /workspace/

RUN npm run build

FROM nginx
COPY --from=build /workspace/dist/ /usr/share/nginx/
RUN mv /usr/share/nginx/pytorch_info.json /var/cache/pytorch_info.seed.json \
    && ln -s /torch-info/pytorch_info.json /usr/share/nginx/pytorch_info.json
COPY nginx.conf /etc/nginx/nginx.conf
COPY seed-volume.sh /docker-entrypoint.d/10-seed-volume.sh
RUN chmod +x /docker-entrypoint.d/10-seed-volume.sh
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
