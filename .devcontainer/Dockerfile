# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e

ARG NODE_IMAGE=mcr.microsoft.com/devcontainers/typescript-node:24-bookworm@sha256:d7e88ca9d7e48412c4f9afed316dac5a830e194c10bf0bea5912f524e14925dc
ARG DENO_IMAGE=denoland/deno:bin-2.9.3@sha256:eb93e70bd53efec4be113d9974107840756551bc1a59a8258892d7bbe5fb4ab0
ARG BUN_IMAGE=oven/bun:1.3.14@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4

FROM ${DENO_IMAGE} AS deno
FROM ${BUN_IMAGE} AS bun
FROM ${NODE_IMAGE} AS toolchain

ARG VCS_REF=local

USER root
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
        python3 \
        sqlite3 \
    && sqlite_library="$(ldconfig -p | awk '/libsqlite3\.so\.0/{print $NF; exit}')" \
    && test -n "${sqlite_library}" \
    && ln -s "${sqlite_library}" /usr/local/lib/libsqlite3-course.so \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deno /deno /usr/local/bin/deno
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx

COPY --chmod=0755 .devcontainer/course-entrypoint /usr/local/bin/course-entrypoint

ENV BUN_INSTALL=/home/node/.bun \
    DENO_DIR=/home/node/.cache/deno \
    DENO_SQLITE_PATH=/usr/local/lib/libsqlite3-course.so
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/course-entrypoint"]
CMD ["sleep", "infinity"]

LABEL org.opencontainers.image.title="Learning TypeScript course workspace" \
      org.opencontainers.image.description="Prepared Node.js, Deno, Bun, TypeScript, and Learning Mentor environment" \
      org.opencontainers.image.source="https://github.com/mbrndiar/learning-typescript" \
      org.opencontainers.image.revision="${VCS_REF}"

USER node

FROM toolchain AS dependency-seed
COPY --chown=node:node . /tmp/course
RUN mkdir -p /home/node/.npm /home/node/.cache/deno /home/node/.bun/install/cache \
    && cd /tmp/course \
    && npm ci \
    && deno task typecheck \
    && deno task tasks:typecheck \
    && rm -rf node_modules \
    && bun install --frozen-lockfile --ignore-scripts

FROM toolchain AS final
COPY --from=dependency-seed --chown=node:node /home/node/.npm /home/node/.npm
COPY --from=dependency-seed --chown=node:node \
    /home/node/.cache/deno /home/node/.cache/deno
COPY --from=dependency-seed --chown=node:node \
    /home/node/.bun/install/cache /home/node/.bun/install/cache
