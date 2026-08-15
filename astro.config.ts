import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://leonid.sh",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => new URL(page).pathname !== "/",
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "ru"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
