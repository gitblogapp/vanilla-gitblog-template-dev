import fs from "node:fs";
import { html, serialize } from "./html.js";
import {
  renderHeader,
  renderContent,
  renderFooter,
} from "../../theme/render.js";
import { copy } from "../../theme/copy.js";

/** Browser data is explicitly selected; no raw metadata, source paths, environment or body duplication. */
export function browserData(data) {
  const s = data.site;
  return {
    locale: data.locale,
    base: data.base,
    home: data.home,
    search: data.search,
    site: {
      giscusEnabled: s.giscusEnabled,
      giscusHost: s.giscusHost,
      giscusRepo: s.giscusRepo,
      giscusRepoId: s.giscusRepoId,
      giscusCategory: s.giscusCategory,
      giscusCategoryId: s.giscusCategoryId,
    },
    post: data.post
      ? {
          id: data.post.id,
          giscusTerm: data.post.giscusTerm,
          membershipId: data.post.membershipId,
        }
      : null,
    integrations: data.integrations,
  };
}
export function renderPage(data, assets, custom = "") {
  const { post, site } = data;
  const image = post?.cover
    ? new URL(post.cover, data.canonical).href
    : site.image;
  const meta = (name, content, property = false) =>
    `<meta ${property ? "property" : "name"}="${html(name)}" content="${html(content)}">`;
  const link = (attributes) =>
    `<link ${Object.entries(attributes)
      .map(([key, value]) => `${key}="${html(value)}"`)
      .join(" ")}>`;
  const structured = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: data.description,
        datePublished: new Date(post.date).toISOString(),
        dateModified: post.lastModified,
        author: { "@type": "Person", name: site.author },
        mainEntityOfPage: data.canonical,
        url: data.canonical,
        inLanguage: site.language,
        ...(image ? { image } : {}),
        ...(post.access === "membership"
          ? {
              isAccessibleForFree: false,
              hasPart: {
                "@type": "WebPageElement",
                isAccessibleForFree: false,
                cssSelector: ".membership-embed",
              },
            }
          : {}),
      }
    : null;
  const head = [
    `<title>${html(data.title)}</title>`,
    meta("description", data.description),
    link({ rel: "canonical", href: data.canonical }),
    link({
      rel: "icon",
      type: "image/svg+xml",
      href: `${data.base}/favicon.svg`,
    }),
    link({ rel: "manifest", href: `${data.base}/site.webmanifest` }),
    meta("theme-color", "#ffffff"),
    ...(data.page === "404"
      ? [meta("robots", "noindex")]
      : data.alternates.map((a) =>
          link({ rel: "alternate", hreflang: a.hreflang, href: a.href }),
        )),
    ...(post && data.markdown
      ? [
          link({
            rel: "alternate",
            type: "text/markdown",
            href: `${data.canonical}index.md`,
          }),
        ]
      : []),
    link({
      rel: "alternate",
      type: "application/rss+xml",
      title: `${site.title} RSS`,
      href: data.rss,
    }),
    meta("og:title", post?.title ?? site.title, true),
    meta("og:description", data.description, true),
    meta("og:url", data.canonical, true),
    meta("og:type", post ? "article" : "website", true),
    meta("og:site_name", site.title, true),
    meta("og:locale", site.language.replace("-", "_"), true),
    ...(image ? [meta("og:image", image, true)] : []),
    meta("twitter:card", image ? "summary_large_image" : "summary"),
    ...(post
      ? [
          meta(
            "article:published_time",
            new Date(post.date).toISOString(),
            true,
          ),
          meta("article:modified_time", post.lastModified, true),
        ]
      : []),
    ...(site.verification
      ? [meta("google-site-verification", site.verification)]
      : []),
    ...(site.bingVerification
      ? [meta("msvalidate.01", site.bingVerification)]
      : []),
    ...(structured
      ? [`<script type="application/ld+json">${serialize(structured)}</script>`]
      : []),
    ...assets.styles.map((href) => link({ rel: "stylesheet", href })),
    `<script>try{const t=localStorage.getItem('gitblog-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme='light'}</script>`,
  ].join("\n");
  const tokens = {
    lang: html(site.language),
    head,
    bodyAttributes: post ? "" : 'data-pagefind-ignore="all"',
    skip: html(copy(data.locale).skip),
    header: renderHeader(data),
    content: renderContent(data, custom),
    footer: renderFooter(data),
    client: `<span hidden data-gitblog-analytics="${html(JSON.stringify(data.integrations.analytics))}"></span><script id="page-data" type="application/json">${serialize(browserData(data))}</script><script type="module" src="${html(assets.script)}"></script>`,
  };
  const layout = fs.readFileSync(
    new URL("../../theme/layout.html", import.meta.url),
    "utf8",
  );
  return layout.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in tokens)) throw new Error(`Unknown layout token: ${key}`);
    return tokens[key];
  });
}
