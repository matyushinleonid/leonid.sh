# leonid.sh

Personal bilingual CV site. Astro, TypeScript, plain CSS, served by nginx.

## Develop

```bash
make run            # dev server on http://localhost:4321
make run PROD=1     # same port, but the nginx production image
make stop
make check          # formatting, Astro/TypeScript, static build
make build          # production image, leonid-sh:local
make cv             # both CV PDFs into public/cv/
make markdown FILE=<path>   # render the CV as github.io-style markdown
```

Docker is the only requirement. Without it: Node 26, then `npm ci && npm run dev`.

`PROD=1` is worth reaching for when behaviour differs between the dev server and
nginx: 404 handling, cache headers, redirects. The dev server answers a URL
missing its trailing slash with Astro's own hint page, while nginx serves
`404.html` for every shape.

## Content

`content/cv.en.yaml` and `content/cv.ru.yaml` are the single source for both the
pages and the PDFs. `src/data/site.ts` reads them for the site,
`scripts/generate-cv.mjs` renders them to LaTeX. A missing key fails the build.

Four fields exist for the PDF and the markdown render alone:
`experience[].cvBullets: false`, `projects[].cvEntry: false`,
`education[].location`, `achievements[].organization`.

English is served at `/` and Russian at `/ru/`; `/en/` 301s to `/`. nginx sends
a visitor whose first `Accept-Language` tag is `ru` to `/ru/`, unless a `locale`
cookie — set by the header switcher — says otherwise. The PDFs are build
artifacts and are not committed.
