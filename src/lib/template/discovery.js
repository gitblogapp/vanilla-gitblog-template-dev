import { articleSeoMarkdown } from '@gitblogapp/core/seo';
import { languageTag, localizedSite } from "./config.js";
import { absolute, postPath } from "./urls.js";
function articleLinks(blog, post) {
  const canonicalUrl = absolute(
    blog.config,
    postPath(blog.config, post.locale, post.slug),
  );
  return {
    canonicalUrl,
    alternateLinks: [
      ...blog.posts
        .filter((other) => other.id === post.id)
        .map((other) => ({
          hreflang: languageTag(other.locale),
          href: absolute(
            blog.config,
            postPath(blog.config, other.locale, other.slug),
          ),
        })),
      {
        hreflang: "x-default",
        href: absolute(
          blog.config,
          postPath(blog.config, blog.config.sourceLocale, post.slug),
        ),
      },
    ],
  };
}
function discoveryManifest(blog) {
  const { config } = blog;
  return {
    schemaVersion: 1,
    buildCommit: config.buildCommit,
    siteUrl: config.siteUrl.replace(/\/+$/, ""),
    policy: config.policy,
    pages: blog.posts.map((post) => ({
      ...articleLinks(blog, post),
      title: post.title,
      locale: post.locale,
      markdownUrl: config.policy.markdown
        ? `${articleLinks(blog, post).canonicalUrl}index.md`
        : null,
    })),
  };
}
function publicMarkdown(blog, post) {
  if (!blog.config.policy.markdown || !blog.posts.includes(post))
    throw new Error("Article is not published for Markdown export");
  const site = localizedSite(blog.config, post.locale);
  const metadata = {
    title: post.title,
    description: post.description,
    author: site.author,
    date: post.date,
    updated: post.lastModified,
    language: site.language,
    site_url: blog.config.siteUrl,
    url: articleLinks(blog, post).canonicalUrl,
  };
  return `---
${Object.entries(metadata)
  .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  .join("\n")}
---

${articleSeoMarkdown(post.seo, post.body, post.locale).trim()}
`;
}
const inline = (value) =>
  value.replace(/[\r\n]+/g, " ").replace(/[\\[\]<>]/g, (char) => `\\${char}`);
function llmsText(blog) {
  const { config } = blog;
  if (!config.policy.llms) return "# Discovery index disabled\n";
  const lines = [
    `# ${inline(config.site.title)}`,
    "",
    `> ${inline(config.site.description)}`,
    "",
    `Website: ${config.siteUrl}`,
    "",
    "Published articles. HTML is canonical; Markdown is an optional representation.",
    "Crawling preferences are expressed in the host-root robots.txt.",
    "",
    `- [Sitemap](<${absolute(config, "/sitemap.xml")}>)`,
    "",
  ];
  for (const locale of config.locales) {
    const posts = blog.forLocale(locale);
    if (!posts.length) continue;
    lines.push(`## ${locale}`, "");
    for (const post of posts) {
      const url = articleLinks(blog, post).canonicalUrl;
      lines.push(
        `- [${inline(post.title)}](<${url}>): ${inline(post.description)}`,
      );
      if (config.policy.markdown)
        lines.push(`  - [Markdown](<${url}index.md>)`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
export { articleLinks, discoveryManifest, llmsText, publicMarkdown };
