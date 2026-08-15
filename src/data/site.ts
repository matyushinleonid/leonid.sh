import { load as parseYaml } from "js-yaml";

import enYaml from "../../content/cv.en.yaml?raw";
import ruYaml from "../../content/cv.ru.yaml?raw";

export const locales = ["en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const projectSlugs = ["k8s", "sein", "minecraft"] as const;

export type ProjectSlug = (typeof projectSlugs)[number];

type Link = {
  label: string;
  href: string;
};

export type Highlight = {
  title?: string;
  description: string;
  technologies?: string[];
};

type Experience = {
  company: string;
  cvBullets?: boolean;
  role: string;
  period: string;
  location: string;
  highlights: Highlight[];
};

type Project = {
  slug: ProjectSlug;
  name: string;
  description: string;
  href: string;
  status: string;
  argocdApp?: string;
  technologies: string[];
  extraLink?: Link;
};

type Achievement = {
  name: string;
  period: string;
  organization?: string;
  description: string;
};

export type SiteCopy = {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    experience: string;
    projects: string;
    stack: string;
    education: string;
  };
  hero: {
    name: string;
    role: string;
    location: string;
    primaryAction: string;
    cvAction: string;
  };
  labels: {
    selectedExperience: string;
    projects: string;
    stack: string;
    education: string;
    achievements: string;
    source: string;
    portrait: string;
  };
  contact: {
    email: string;
    site: string;
    telegram: string;
  };
  experience: Experience[];
  projects: Project[];
  stack: Array<{
    group: string;
    items: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    period: string;
  }>;
  achievements: Achievement[];
  links: Link[];
};

function loadCopy(locale: Locale, source: string): SiteCopy {
  const copy = parseYaml(source) as SiteCopy;

  const required = [
    "meta",
    "nav",
    "hero",
    "labels",
    "contact",
    "experience",
    "projects",
    "stack",
    "education",
    "achievements",
    "links",
  ] as const;

  for (const key of required) {
    if (copy?.[key] === undefined) {
      throw new Error(`content/cv.${locale}.yaml is missing "${key}"`);
    }
  }

  for (const project of copy.projects) {
    if (!projectSlugs.includes(project.slug)) {
      throw new Error(
        `content/cv.${locale}.yaml has unknown project slug "${project.slug}"`,
      );
    }
  }

  return copy;
}

export const siteCopy: Record<Locale, SiteCopy> = {
  en: loadCopy("en", enYaml),
  ru: loadCopy("ru", ruYaml),
};

export function cvHref(locale: Locale): string {
  return `/cv/leonid-matyushin-${locale}.pdf`;
}
