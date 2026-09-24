FROM oven/bun:1.3.13-slim@sha256:7e8ed3961db1cdedf17d516dda87948cfedbd294f53bf16462e5b57ed3fff0f1

ARG GBRAIN_COMMIT=31f257a0a7b218b40e03d302bc6913c99f26f0ec

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl bash \
  && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/garrytan/gbrain.git /opt/gbrain \
  && cd /opt/gbrain \
  && git checkout "$GBRAIN_COMMIT" \
  && test "$(node -p "require('./package.json').version")" = "0.54.1.1" \
  && bun install --frozen-lockfile \
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