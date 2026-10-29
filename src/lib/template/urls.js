function withBase(config, value) {
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  if (
    config.base &&
    (value === config.base ||
      value.startsWith(`${config.base}/`) ||
      value.startsWith(`${config.base}?`) ||
      value.startsWith(`${config.base}#`))
  )
    return value;
  return `${config.base}${value}`;
}
const homePath = (config, locale) =>
  withBase(config, locale === config.sourceLocale ? "/" : `/${locale}/`);
const postPath = (config, locale, slug) =>
  `${homePath(config, locale)}blog/${encodeURIComponent(slug)}/`;
const searchPath = (config, locale) => `${homePath(config, locale)}search/`;
const rssPath = (config, locale) => `${homePath(config, locale)}rss.xml`;
const absolute = (config, value) =>
  new URL(withBase(config, value), config.siteUrl).href;
export { absolute, homePath, postPath, rssPath, searchPath, withBase };
