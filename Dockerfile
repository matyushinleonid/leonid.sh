# syntax=docker/dockerfile:1.18

ARG NODE_VERSION=26.5.1
ARG NGINX_VERSION=1.31.3
ARG TEXLIVE_VERSION=latest-full@sha256:b8c2577b400313f356c8746b7778a3370792922d0b8e5199d8f271d5a5fcb42f

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

FROM dependencies AS capsule

COPY content ./content
COPY scripts ./scripts
COPY src/assets/images/portrait.jpg ./src/assets/images/portrait.jpg
RUN node scripts/generate-gemini.mjs

FROM texlive/texlive:${TEXLIVE_VERSION} AS cv-pdf

RUN for file in titlesec.sty fullpage.sty cmunrm.otf russianb.ldf; do \
      kpsewhich "${file}" >/dev/null || { echo "base image is missing ${file}" >&2; exit 1; }; \
    done

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
COPY --from=capsule --chmod=0644 /app/build/gemini/ /srv/capsule/
COPY --from=cv-pdf --chmod=0644 /cv/out/ /srv/capsule/cv/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
