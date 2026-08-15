# syntax=docker/dockerfile:1.18

ARG NODE_VERSION=26.5.1
ARG NGINX_VERSION=1.31.3
ARG TEXLIVE_VERSION=latest-medium

FROM node:${NODE_VERSION}-alpine AS dependencies

ENV ASTRO_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development

COPY . .

EXPOSE 4321

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM dependencies AS cv-latex

COPY content ./content
COPY scripts ./scripts
RUN node scripts/generate-cv.mjs

FROM texlive/texlive:${TEXLIVE_VERSION} AS cv-pdf

ARG CTAN_REPOSITORY=https://mirror.ctan.org/systems/texlive/tlnet
RUN for attempt in 1 2 3 4 5; do \
      tlmgr --repository "${CTAN_REPOSITORY}" install preprint titlesec cm-unicode babel-russian hyphen-russian && exit 0; \
      echo "tlmgr attempt ${attempt} failed, retrying" >&2; \
      sleep 10; \
    done; \
    exit 1

WORKDIR /cv

COPY --from=cv-latex /app/build/cv/ ./
RUN for locale in en ru; do \
      xelatex -interaction=nonstopmode -halt-on-error "cv.${locale}.tex" || exit 1; \
      xelatex -interaction=nonstopmode -halt-on-error "cv.${locale}.tex" || exit 1; \
    done \
  && mkdir out \
  && cp cv.en.pdf out/leonid-matyushin-en.pdf \
  && cp cv.ru.pdf out/leonid-matyushin-ru.pdf

FROM scratch AS cv

COPY --from=cv-pdf /cv/out/ /

FROM dependencies AS build

COPY . .
COPY --from=cv-pdf --chmod=0644 /cv/out/ ./public/cv/
RUN npm run check && npm run build && chmod -R a=rX /app/dist

FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS production

COPY --chmod=0644 nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
