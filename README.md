# leonid.sh

Personal bilingual CV site. Astro, TypeScript, plain CSS, served by nginx.

## Develop

```bash
make run     # dev server on http://localhost:4321
make stop
make check   # formatting, Astro/TypeScript, static build
make build   # production image, leonid-sh:local
make cv      # both CV PDFs into public/cv/
```

Docker is the only requirement. Without it: Node 26, then `npm ci && npm run dev`.

## Content

`content/cv.en.yaml` and `content/cv.ru.yaml` are the single source for both the
pages and the PDFs. `src/data/site.ts` reads them for the site,
`scripts/generate-cv.mjs` renders them to LaTeX. A missing key fails the build.

Three fields exist for the PDF alone: `experience[].cvBullets: false`,
`education[].location`, `achievements[].organization`.

Routes are `/en/` and `/ru/`; `/` redirects by remembered choice or browser
locale. The PDFs are build artifacts and are not committed.
