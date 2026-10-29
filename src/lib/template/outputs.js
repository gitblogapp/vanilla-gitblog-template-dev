import { localizedSite } from "./config.js";
import { escapeHtml } from "./content.js";
import { absolute, homePath, postPath, rssPath, searchPath } from "./urls.js";
import { bodyExcerptXml } from "./body-excerpt.js";
const xml = (value) => escapeHtml(value).replaceAll("&#39;", "&apos;");
const limitedUrl = (value) => {
  if (value.length > 2048)
    throw new Error(`Hub URL exceeds 2048 characters: ${value.slice(0, 100)}`);
  return value;
};
function manifest(config) {
  const value = {
    schemaVersion: 1,
    name: config.site.title,
    imageUrl: /^https:\/\//.test(config.site.image) ? config.site.image : null,
    buildCommit: config.buildCommit || void 0,
    enabled: config.hubEnabled,
    repository: config.repository,
    siteUrl: limitedUrl(config.siteUrl),
    sourceLocale: config.sourceLocale,
    feeds: config.locales.map((locale) => ({
      locale,
      url: limitedUrl(absolute(config, rssPath(config, locale))),
    })),
  };
  if (Buffer.byteLength(JSON.stringify(value)) > 64 * 1024)
    throw new Error("Hub manifest exceeds 64 KiB");
  return value;
}
function rss(blog, locale) {
  const { config } = blog;
  const site = localizedSite(config, locale);
  const posts = blog.forLocale(locale);
  if (config.hubEnabled && posts.length > 1e3)
    throw new Error(
      `Hub v1: ${locale} exceeds 1000 items; refusing to truncate feed`,
    );
  const latest = posts.reduce(
    (max, post) => Math.max(max, Date.parse(post.updated ?? post.date)),
    0,
  );
  const render = (bodyBudget = 0) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:hub="https://gitblog.dev/ns/hub/1.0"><channel>
<title>${xml(site.title)}</title><link>${xml(absolute(config, homePath(config, locale)))}</link><description>${xml(site.description)}</description><language>${xml(site.language)}</language>
<hub:schemaVersion>1</hub:schemaVersion><hub:sourceLocale>${xml(config.sourceLocale)}</hub:sourceLocale>
${config.buildCommit ? `<hub:buildCommit>${xml(config.buildCommit)}</hub:buildCommit>` : ""}
<atom:link href="${xml(absolute(config, rssPath(config, locale)))}" rel="self" type="application/rss+xml" />
${latest ? `<lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>` : ""}
${posts.map((post) => `<item><title>${xml(post.title)}</title><link>${xml(limitedUrl(absolute(config, postPath(config, locale, post.slug))))}</link><guid isPermaLink="false">${xml(post.id)}</guid><description>${xml(post.description)}</description>${bodyExcerptXml(post.bodyExcerpt, bodyBudget)}<pubDate>${new Date(post.date).toUTCString()}</pubDate><hub:postId>${xml(post.id)}</hub:postId><hub:access>${post.access}</hub:access><hub:previewAllowed>${post.previewAllowed}</hub:previewAllowed><hub:locale>${xml(locale)}</hub:locale><hub:sourceLocale>${xml(config.sourceLocale)}</hub:sourceLocale><hub:giscusTerm>${post.giscusTerm}</hub:giscusTerm>${post.cover ? `<hub:cover>${xml(limitedUrl(absolute(config, post.cover)))}</hub:cover>` : ""}${post.updated ? `<hub:updated>${new Date(post.updated).toISOString()}</hub:updated>` : ""}${[post.category, ...post.tags].map((category) => `<category>${xml(category)}</category>`).join("")}${post.taxonomy ? `<hub:taxonomy>${xml(JSON.stringify({ version: 1, ...post.taxonomy }))}</hub:taxonomy>` : ""}</item>`).join("\n")}
</channel></rss>`;
  const remaining = 2 * 1024 * 1024 - Buffer.byteLength(render());
  if (remaining < 0) throw new Error(`Hub v1: ${locale} feed exceeds 2 MiB`);
  return render(posts.length ? Math.floor(remaining / posts.length) : 0);
}
function searchIndex(blog, locale) {
  return blog.forLocale(locale).map((post) => ({
    title: post.title,
    description: post.description,
    text: post.text,
    category: post.category,
    tags: post.tags,
    aliases: post.taxonomy?.tags.flatMap((tag) => tag.aliases) ?? [],
    date: post.date,
    url: postPath(blog.config, locale, post.slug),
  }));
}
function sitemap(blog) {
  const { config } = blog;
  const pages = config.locales
    .flatMap((locale) => [homePath(config, locale), searchPath(config, locale)])
    .map((url) => `<url><loc>${xml(absolute(config, url))}</loc></url>`);
  for (const post of blog.posts) {
    const variants = blog.posts.filter((other) => other.id === post.id);
    pages.push(
      `<url><loc>${xml(absolute(config, postPath(config, post.locale, post.slug)))}</loc><lastmod>${post.lastModified}</lastmod>${variants.map((other) => `<xhtml:link rel="alternate" hreflang="${localizedSite(config, other.locale).language}" href="${xml(absolute(config, postPath(config, other.locale, other.slug)))}"/>`).join("")}<xhtml:link rel="alternate" hreflang="x-default" href="${xml(absolute(config, postPath(config, config.sourceLocale, post.slug)))}"/></url>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${pages.join("")}</urlset>`;
}
export { manifest, rss, searchIndex, sitemap, xml };
