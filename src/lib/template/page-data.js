import { localizedSite, languageTag } from "./config.js";
import {
  absolute,
  homePath,
  postPath,
  rssPath,
  searchPath,
  withBase,
} from "./urls.js";
import { localeLabel, copy } from "../../theme/copy.js";
function pageData(blog, locale, page, post) {
  const { config } = blog;
  const site = localizedSite(config, locale);
  const home = homePath(config, locale),
    search = searchPath(config, locale);
  const pathname = post
    ? postPath(config, locale, post.slug)
    : page === "search"
      ? search
      : page === "404"
        ? withBase(config, "/404.html")
        : home;
  const variants = post
    ? blog.posts.filter((p) => p.id === post.id).map((p) => p.locale)
    : config.locales;
  const variantPath = (l) =>
    post
      ? postPath(config, l, post.slug)
      : page === "search"
        ? searchPath(config, l)
        : homePath(config, l);
  const summary = (p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    url: postPath(config, locale, p.slug),
    category: p.category,
    tags: p.tags,
    date: p.date,
    updated: p.updated,
    cover: p.cover ? withBase(config, p.cover) : null,
    readingMinutes: p.readingMinutes,
    access: p.access,
  });
  const off = (v) =>
    ["false", "0", "off", "no"].includes((v || "").toLowerCase());
  const limit = Number(config.env.PUBLIC_RELATED_LIMIT || 4);
  return {
    page,
    locale,
    site,
    pathname,
    canonical: absolute(config, pathname),
    base: config.base,
    home,
    search,
    rss: rssPath(config, locale),
    year: /* @__PURE__ */ new Date().getUTCFullYear(),
    title: post
      ? `${post.title} \u2014 ${site.title}`
      : page === "search"
        ? `${copy(locale).search} \u2014 ${site.title}`
        : page === "404"
          ? `404 \u2014 ${site.title}`
          : `${site.title} \u2014 ${site.tagline.replaceAll("\n", " ")}`,
    description: post?.description ?? site.description,
    markdown: config.policy.markdown,
    languages: config.locales.map((l) => ({
      locale: l,
      label: localeLabel(l),
      href: variants.includes(l) ? variantPath(l) : homePath(config, l),
      available: variants.includes(l),
    })),
    alternates: [
      ...variants.map((l) => ({
        hreflang: languageTag(l),
        href: absolute(config, variantPath(l)),
      })),
      {
        hreflang: "x-default",
        href: absolute(config, variantPath(config.sourceLocale)),
      },
    ],
    posts: blog.forLocale(locale).map(summary),
    ...(post
      ? {
          post: {
            ...summary(post),
            html: post.html,
            seo: post.seo,
            toc: post.toc,
            giscusTerm: post.giscusTerm,
            membershipId: post.membershipId,
            previewAllowed: post.previewAllowed,
            audioUrl: post.audioUrl,
            lastModified: post.lastModified,
            aliases: post.taxonomy?.tags.flatMap((t) => t.aliases) ?? [],
          },
        }
      : {}),
    integrations: {
      related: config.hubEnabled && !off(config.env.PUBLIC_RELATED_ENABLED),
      repository: config.repository,
      limit: Number.isInteger(limit) && limit >= 1 && limit <= 8 ? limit : 4,
      thumbnails: !off(config.env.PUBLIC_RELATED_SHOW_THUMBNAIL),
      analytics: {
        enabled: config.env.PUBLIC_ANALYTICS_ENABLED,
        hubEnabled: String(config.hubEnabled),
        hubUrl: config.env.PUBLIC_HUB_URL,
        repository: config.repository,
        siteUrl: config.siteUrl,
      },
    },
  };
}
export { pageData };
