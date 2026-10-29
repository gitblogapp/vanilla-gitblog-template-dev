import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

// Site-copy fallback shared with the CLI. Explicit empty env values also win.
export function siteDefaults(root, values = {}) {
  const file = path.join(root, 'content/site.json');
  const site = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const mapping = {
    PUBLIC_SITE_TITLE: 'title',
    PUBLIC_SITE_TAGLINE: 'tagline',
    PUBLIC_SITE_DESCRIPTION: 'description',
    PUBLIC_SITE_FOOTER: 'footer',
    PUBLIC_SITE_URL: 'url',
    PUBLIC_SITE_OWNER: 'author',
    PUBLIC_GISCUS_REPO: 'giscusRepo',
    PUBLIC_GISCUS_REPO_ID: 'giscusRepoId',
    PUBLIC_GISCUS_CATEGORY: 'giscusCategory',
    PUBLIC_GISCUS_CATEGORY_ID: 'giscusCategoryId',
  };
  const defaults = Object.fromEntries(
    Object.entries(mapping)
      .filter(([, field]) => typeof site[field] === 'string')
      .map(([key, field]) => [key, site[field]]),
  );
  if (values.PUBLIC_SITE_AUTHOR !== undefined)
    defaults.PUBLIC_SITE_OWNER = values.PUBLIC_SITE_AUTHOR;
  if (values.PUBLIC_HUB_REPOSITORY !== undefined)
    defaults.PUBLIC_SITE_REPOSITORY = values.PUBLIC_HUB_REPOSITORY;
  return defaults;
}

export function readPublicSettings(root, environment = process.env) {
  const file = path.join(root, '.env.production');
  const values = {
    ...(existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {}),
    ...Object.fromEntries(Object.entries(environment).filter(([, value]) => value !== undefined)),
  };
  return { ...siteDefaults(root, values), ...values };
}
