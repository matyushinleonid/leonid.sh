#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { load } from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "content");

const CANONICAL = "https://leonid.sh/";
const EMOJI = "https://github.githubassets.com/images/icons/emoji";
const SHIPIT = `<img src="${EMOJI}/shipit.png" width="50"/>`;
const SUSPECT = `<img src="${EMOJI}/suspect.png" width="20"/>`;
const BREAK = "  ";

const MONTHS = {
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
};

function text(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value)
    .replace(/[ \t\n\r]+/g, " ")
    .trim()
    .replace(/[&%]/g, (character) => `\\${character}`);
}

function dates(period) {
  return text(period).replace(/\s*[–—-]\s*/g, " - ");
}

function longDates(period) {
  return dates(period).replace(
    /\b[A-Z][a-z]{2}\b/g,
    (month) => MONTHS[month] ?? month,
  );
}

function years(period) {
  return (String(period).match(/\d{4}/g) ?? []).join(" - ");
}

function stack(items) {
  return items?.length ? `**${text(items.join(", "))}**` : "";
}

function link({ label, href }) {
  return `[${text(label)}](${href})`;
}

function heading(en, ru) {
  return [
    `# ${text(en.hero.name)} (${text(ru.hero.name)}) [${SHIPIT}]()`,
    `### ${text(en.hero.role)}`,
    `#### ${text(en.hero.location)}`,
    "",
    en.links.map(link).join(" · "),
    "",
    text(en.meta.description),
  ].join("\n");
}

function experience(cv) {
  const blocks = [];
  for (const entry of cv.experience ?? []) {
    const lines = [
      `### ${text(entry.company)}`,
      `**${text(entry.role)}**${BREAK}`,
      `${longDates(entry.period)} | ${text(entry.location)}${BREAK}`,
    ];
    for (const highlight of entry.highlights ?? []) {
      const body = [
        highlight.title ? `**${text(highlight.title)}**` : "",
        text(highlight.description),
        stack(highlight.technologies),
      ]
        .filter(Boolean)
        .join(" ");
      lines.push(`${SUSPECT} ${body}${BREAK}`);
    }
    blocks.push(lines.join("\n"));
  }
  return `## Experience\n\n${blocks.join("\n\n")}`;
}

function projects(cv) {
  const blocks = [];
  for (const entry of (cv.projects ?? []).filter(
    (project) => project.cvEntry !== false,
  )) {
    const meta = [link({ label: "GitHub", href: entry.href })];
    if (entry.extraLink) {
      meta.push(link(entry.extraLink));
    }
    blocks.push(
      [
        `### ${text(entry.name)}`,
        meta.join(" · "),
        [text(entry.description), stack(entry.technologies)]
          .filter(Boolean)
          .join(" "),
      ].join("\n"),
    );
  }
  return `## Personal Projects\n\n${blocks.join("\n\n")}`;
}

function education(cv) {
  const blocks = (cv.education ?? []).map((entry) =>
    [
      `- **${text(entry.degree)}**${BREAK}`,
      `${text(entry.institution)} · (${years(entry.period)})`,
    ].join("\n"),
  );
  return `## Education\n\n${blocks.join("\n\n")}`;
}

function skills(cv) {
  const lines = (cv.stack ?? []).map(
    (group) => `- ${text((group.items ?? []).join(", "))}`,
  );
  return `## Skills\n\n${lines.join("\n")}`;
}

function achievements(cv) {
  const blocks = (cv.achievements ?? []).map((entry) =>
    [
      `### ${text(entry.name)}`,
      [dates(entry.period), text(entry.organization)]
        .filter(Boolean)
        .join(" | "),
      text(entry.description),
    ].join("\n"),
  );
  return `## Other Achievements\n\n${blocks.join("\n\n")}`;
}

function frontMatter() {
  return ["---", `canonical_url: ${CANONICAL}`, "---"].join("\n");
}

function render(en, ru) {
  const sections = [
    frontMatter(),
    heading(en, ru),
    experience(en),
    projects(en),
    education(en),
    skills(en),
    achievements(en),
  ];
  return `${sections.join("\n\n")}\n`;
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    process.stderr.write(
      "usage: node scripts/generate-markdown.mjs <output.md>\n" +
        "   or: make markdown FILE=<output.md>\n",
    );
    process.exit(1);
  }

  const [en, ru] = await Promise.all(
    ["en", "ru"].map(async (locale) =>
      load(await readFile(join(CONTENT_DIR, `cv.${locale}.yaml`), "utf8")),
    ),
  );

  await writeFile(target, render(en, ru), "utf8");
  process.stdout.write(`${CONTENT_DIR}/cv.{en,ru}.yaml -> ${target}\n`);
}

await main();
