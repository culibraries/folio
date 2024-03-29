FROM node:15-alpine as stripes_build

# OKAPI_URL must be passed as a --build-arg to this Dockerfile.
ARG OKAPI_URL
RUN echo Building stripes with okapi url: $OKAPI_URL
ARG TENANT_ID=cubl
RUN mkdir -p /etc/folio/stripes
WORKDIR /etc/folio/stripes

COPY . /etc/folio/stripes/

RUN apk add --no-cache alpine-sdk python2
RUN yarn config set python /usr/bin/python2

RUN yarn config set @folio:registry https://repository.folio.org/repository/npm-folio/
RUN yarn install
RUN yarn build-module-descriptors
RUN yarn build output --okapi $OKAPI_URL --tenant $TENANT_ID

# nginx stage
FROM nginx:stable-alpine
EXPOSE 80

COPY --from=stripes_build /etc/folio/stripes/output /usr/share/nginx/html
COPY --from=stripes_build /etc/folio/stripes/yarn.lock /usr/share/nginx/html/yarn.lock
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /usr/bin/entrypoint.sh

RUN ["chmod", "+x", "/usr/bin/entrypoint.sh"]

ENTRYPOINT ["/usr/bin/entrypoint.sh"]
