#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { load } from "js-yaml";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content");
const OUTPUT_DIR = join(ROOT, "build", "gemini");

const SITE_URL = "https://leonid.sh/";
const PORTRAIT = "portrait.jpg";
const PORTRAIT_WIDTH = 400;
const FAVICON = "📺";

const LABELS = {
  en: {
    alternate: "Русская версия",
    alternateHref: "/ru/",
    web: "This CV on the web",
    portrait: "Photograph",
    lang: "en",
  },
  ru: {
    alternate: "English version",
    alternateHref: "/",
    web: "Эта страница в вебе",
    portrait: "Фотография",
    lang: "ru",
  },
};

const LOCALES = Object.keys(LABELS);

function text(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .replace(/[ \t\n\r]+/g, " ")
    .trim()
    .replace(/\*\*(.+?)\*\*/g, "$1");
}

function paragraph(value) {
  const body = text(value);
  return /^(=>|#|\*|>|```)/.test(body) ? ` ${body}` : body;
}

function heading(value) {
  const body = text(value);
  return body.charAt(0).toUpperCase() + body.slice(1);
}

const GLYPHS = {
  " ": ["  ", "  ", "  ", "  ", "  "],
  ".": ["  ", "  ", "  ", "  ", "# "],
  A: [" ### ", "#   #", "#####", "#   #", "#   #"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: ["###", " # ", " # ", " # ", "###"],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
  Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
  А: [" ### ", "#   #", "#####", "#   #", "#   #"],
  Д: [" ####", " #  #", " #  #", "#####", "#   #"],
  Е: ["#####", "#    ", "#### ", "#    ", "#####"],
  И: ["#   #", "#  ##", "# # #", "##  #", "#   #"],
  Л: [" ####", " #  #", " #  #", " #  #", "#   #"],
  М: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  Н: ["#   #", "#   #", "#####", "#   #", "#   #"],
  О: [" ### ", "#   #", "#   #", "#   #", " ### "],
  Т: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  Ш: ["#  #  #", "#  #  #", "#  #  #", "#  #  #", "#######"],
  Ю: ["#  ### ", "#  #  #", "####  #", "#  #  #", "#  ### "],
};

function asciiArt(value) {
  const letters = [...value.toUpperCase()];
  if (letters.some((letter) => !GLYPHS[letter])) {
    return null;
  }
  return [0, 1, 2, 3, 4].map((row) =>
    letters
      .map((letter) => GLYPHS[letter][row])
      .join(" ")
      .replace(/\s+$/, ""),
  );
}

function banner(cv) {
  const name = text(cv.hero.name);
  const words = name.split(" ").map(asciiArt);
  const rows = words.every(Boolean) ? words.flat() : [name.toUpperCase()];
  return [
    "```" + name,
    ...rows,
    "",
    `${text(cv.hero.role)} · ${text(cv.hero.location)}`,
    "```",
  ];
}

function stack(items) {
  return items?.length ? text(items.join(", ")) : "";
}

function experience(cv) {
  const lines = [`## ${heading(cv.labels.selectedExperience)}`, ""];
  for (const entry of cv.experience ?? []) {
    lines.push(`### ${text(entry.company)}`);
    lines.push(
      `${text(entry.role)} — ${text(entry.period)} — ${text(entry.location)}`,
      "",
    );
    for (const item of entry.highlights ?? []) {
      const title = item.title ? `${text(item.title)}: ` : "";
      lines.push(`* ${title}${paragraph(item.description)}`);
      const tools = stack(item.technologies);
      if (tools) {
        lines.push(`  ${tools}`);
      }
    }
    lines.push("");
  }
  return lines;
}

function projects(cv) {
  const lines = [`## ${heading(cv.labels.projects)}`, ""];
  for (const entry of cv.projects ?? []) {
    lines.push(`### ${text(entry.name)}`);
    lines.push(paragraph(entry.description));
    const tools = stack(entry.technologies);
    if (tools) {
      lines.push(tools);
    }
    lines.push("", `=> ${entry.href} ${text(entry.name)} — source`);
    if (entry.extraLink) {
      lines.push(`=> ${entry.extraLink.href} ${text(entry.extraLink.label)}`);
    }
    lines.push("");
  }
  return lines;
}

function education(cv) {
  const lines = [`## ${heading(cv.labels.education)}`, ""];
  for (const entry of cv.education ?? []) {
    lines.push(`* ${text(entry.degree)}`);
    lines.push(`  ${text(entry.institution)} — ${text(entry.period)}`);
  }
  return [...lines, ""];
}

function skills(cv) {
  const lines = [`## ${heading(cv.labels.stack)}`, ""];
  for (const group of cv.stack ?? []) {
    lines.push(`* ${heading(group.group)}: ${stack(group.items)}`);
  }
  return [...lines, ""];
}

function achievements(cv) {
  const lines = [`## ${heading(cv.labels.achievements)}`, ""];
  for (const entry of cv.achievements ?? []) {
    lines.push(`### ${text(entry.name)}`);
    const meta = [text(entry.period), text(entry.organization)]
      .filter(Boolean)
      .join(" — ");
    lines.push(meta, paragraph(entry.description), "");
  }
  return lines;
}

function render(cv, labels, locale) {
  const lines = [
    ...banner(cv),
    "",
    `# ${text(cv.hero.name)}`,
    "",
    paragraph(cv.meta.description),
    "",
    `=> /${PORTRAIT} ${labels.portrait}`,
    `=> ${labels.alternateHref} ${labels.alternate}`,
    `=> /cv/leonid-matyushin-${locale}.pdf ${heading(cv.hero.cvAction)} (PDF)`,
    ...(cv.links ?? []).map((link) => `=> ${link.href} ${text(link.label)}`),
    `=> ${SITE_URL} ${labels.web}`,
    "",
    ...experience(cv),
    ...projects(cv),
    ...education(cv),
    ...skills(cv),
    ...achievements(cv),
  ];
  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

async function main() {
  for (const locale of LOCALES) {
    const labels = LABELS[locale];
    const source = join(CONTENT_DIR, `cv.${locale}.yaml`);
    const cv = load(await readFile(source, "utf8"));
    const directory = locale === "en" ? OUTPUT_DIR : join(OUTPUT_DIR, locale);
    await mkdir(directory, { recursive: true });
    const target = join(directory, "index.gmi");
    await writeFile(target, render(cv, labels, locale), "utf8");
    await writeFile(
      join(directory, ".meta"),
      `*.gmi: ;lang=${labels.lang}\n`,
      "utf8",
    );
    process.stdout.write(`${source} -> ${target}\n`);
  }

  const pdfs = join(OUTPUT_DIR, "cv");
  await mkdir(pdfs, { recursive: true });
  await writeFile(join(pdfs, ".meta"), "*.pdf: application/pdf\n", "utf8");

  await writeFile(join(OUTPUT_DIR, "favicon.txt"), `${FAVICON}\n`, "utf8");

  const portrait = join(ROOT, "src", "assets", "images", "portrait.jpg");
  await sharp(portrait)
    .resize({ width: PORTRAIT_WIDTH })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join(OUTPUT_DIR, PORTRAIT));
  process.stdout.write(`${portrait} -> ${join(OUTPUT_DIR, PORTRAIT)}\n`);
}

await main();
