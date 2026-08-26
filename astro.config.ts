import { readFileSync } from "node:fs";

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { load } from "js-yaml";

function contentUpdated(locale: string): string {
  const file = new URL(`./content/cv.${locale}.yaml`, import.meta.url);
  const cv = load(readFileSync(file, "utf8")) as {
    meta?: { updated?: unknown };
  };
  const updated = new Date(String(cv.meta?.updated ?? ""));
  if (Number.isNaN(updated.valueOf())) {
    throw new Error(
      `content/cv.${locale}.yaml needs a valid meta.updated date`,
    );
  }
  return updated.toISOString();
}

const lastmod: Record<string, string> = {
  "/": contentUpdated("en"),
  "/ru/": contentUpdated("ru"),
};

export default defineConfig({
  site: "https://leonid.sh",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: { en: "en", ru: "ru" },
      },
      serialize: (item) => {
        const modified = lastmod[new URL(item.url).pathname];
        return modified ? { ...item, lastmod: modified } : item;
      },
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});
