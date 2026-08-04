FROM oven/bun:1.3.3-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl bash \
  && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/garrytan/gbrain.git /opt/gbrain \
  && cd /opt/gbrain \
  && bun install \
  && bun link

ENV HOME=/data \
    GBRAIN_HOME=/data \
    PATH=/root/.bun/bin:/usr/local/bin:/usr/local/sbin:/usr/sbin:/usr/bin:/sbin:/bin \
    GBRAIN_NO_ONBOARD_NUDGE=1

COPY scripts/entrypoint.sh /usr/local/bin/gbrain-entrypoint
RUN chmod +x /usr/local/bin/gbrain-entrypoint

WORKDIR /brain
EXPOSE 3131
ENTRYPOINT ["/usr/local/bin/gbrain-entrypoint"]
CMD ["gbrain", "serve", "--http", "--port", "3131", "--bind", "0.0.0.0"]
