FROM node:9.9.0-alpine

MAINTAINER devicehive

LABEL org.label-schema.url="https://devicehive.com" \
      org.label-schema.vendor="DeviceHive" \
      org.label-schema.vcs-url="https://github.com/devicehive/devicehive-coap-proxy" \
      org.label-schema.name="devicehive-coap-proxy" \
      org.label-schema.version="development"

ENV WORK_DIR=/usr/src/app/
ENV CONF_DIR=/usr/src/app/conf
RUN mkdir -p ${WORK_DIR} \
    && mkdir -p ${CONF_DIR} \
    && cd ${WORK_DIR}

WORKDIR ${WORK_DIR}

COPY . ${WORK_DIR}

RUN apk update \
    && apk add --no-cache --virtual .gyp python make g++ \
    && npm install \
    && npm cache clean --force \
    && apk del .gyp

RUN npm install pm2 -g

EXPOSE 5683/udp
VOLUME ["/usr/src/app/config"]
CMD ["pm2-docker", "index.js"]