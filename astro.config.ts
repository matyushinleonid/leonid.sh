import { statSync } from "node:fs";

import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const contentModified = (locale: string) =>
  statSync(new URL(`./content/cv.${locale}.yaml`, import.meta.url)).mtime;

const lastmod = {
  "/": contentModified("en"),
  "/ru/": contentModified("ru"),
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
        const path = new URL(item.url).pathname;
        const modified = lastmod[path as keyof typeof lastmod];
        return modified ? { ...item, lastmod: modified.toISOString() } : item;
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
