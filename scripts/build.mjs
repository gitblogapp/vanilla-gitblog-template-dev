import fs from "node:fs/promises";
import path from "node:path";
import { build as bundle } from "esbuild";
import { load as parseHtml } from "cheerio";
import { loadBlog } from "../src/lib/template/content.js";
import {
  manifest,
  rss,
  sitemap,
  searchIndex,
} from "../src/lib/template/outputs.js";
import {
  discoveryManifest,
  llmsText,
  publicMarkdown,
} from "../src/lib/template/discovery.js";
import { robotsText } from "../src/lib/template/ai-policy.js";
import { speechManifest } from "../src/lib/template/speech.js";
import { pageData } from "../src/lib/template/page-data.js";
import { renderPage } from "../src/lib/template/document.js";

const blog = loadBlog(),
  { config } = blog;
const output = path.resolve("build");
await fs.rm(output, { recursive: true, force: true });
await fs.cp("static", output, { recursive: true });
const bundled = await bundle({
  entryPoints: ["src/client.js"],
  outdir: "build/assets",
  entryNames: "[name]-[hash]",
  assetNames: "[name]-[hash]",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  metafile: true,
});
const [entryFile, entry] = Object.entries(bundled.metafile.outputs).find(
  ([, value]) => value.entryPoint === "src/client.js",
);
const assetUrl = (file) =>
  `${config.base}/${path.relative(output, path.resolve(file)).split(path.sep).join("/")}`;
const assets = {
  script: assetUrl(entryFile),
  styles: entry.cssBundle ? [assetUrl(entry.cssBundle)] : [],
};
const write = async (file, text) => {
  const target = path.resolve(output, file);
  if (!target.startsWith(output + path.sep))
    throw new Error(`Invalid output path: ${file}`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, text);
};
const json = (file, value) => write(file, JSON.stringify(value));
for (const locale of config.locales) {
  const prefix = locale === config.sourceLocale ? "" : `${locale}/`;
  for (const page of ["home", "search"])
    await write(
      `${prefix}${page === "home" ? "" : "search/"}index.html`,
      renderPage(pageData(blog, locale, page), assets),
    );
  await write(
    `${prefix}blog/index.html`,
    renderPage(pageData(blog, locale, "home"), assets),
  );
  for (const post of blog.forLocale(locale)) {
    const directory = `${prefix}blog/${post.slug}/`;
    await write(
      `${directory}index.html`,
      renderPage(pageData(blog, locale, "post", post), assets),
    );
    if (config.policy.markdown)
      await write(`${directory}index.md`, publicMarkdown(blog, post));
  }
  await write(`${prefix}rss.xml`, rss(blog, locale));
  await json(`${prefix}search.json`, searchIndex(blog, locale));
}
await write(
  "404.html",
  renderPage(pageData(blog, config.sourceLocale, "404"), assets),
);
await write("sitemap.xml", sitemap(blog));
await write("robots.txt", robotsText(config.policy, config.siteUrl));
await write("llms.txt", llmsText(blog));
await json(".well-known/blog-hub.json", manifest(config));
await json(".well-known/ai-discovery.json", discoveryManifest(blog));
await json(".well-known/tts-input.json", speechManifest(true));
await json(".well-known/tts.json", speechManifest());
await json("site.webmanifest", {
  name: config.site.title,
  short_name: config.site.title,
  lang: config.sourceLocale,
  start_url: `${config.base}/`,
  scope: `${config.base}/`,
  display: "standalone",
  theme_color: "#ffffff",
  background_color: "#ffffff",
  icons: [
    {
      src: `${config.base}/favicon.svg`,
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
  ],
});
for (const file of await fs.readdir("src/pages")) {
  if (!/^[a-z0-9][a-z0-9-]*\.html$/.test(file)) continue;
  const route = file.replace(/\.html$/, "");
  if (["blog", "search", "index", ...config.locales].includes(route))
    throw new Error(`Reserved custom page: ${route}`);
  const content = await fs.readFile(path.join("src/pages", file), "utf8");
  const data = pageData(blog, config.sourceLocale, "custom");
  data.pathname = `${config.base}/${route}/`;
  data.canonical = new URL(data.pathname, config.siteUrl).href;
  data.title = `${parseHtml(content)("h1").first().text() || route} — ${data.site.title}`;
  data.alternates = [
    { hreflang: data.site.language, href: data.canonical },
    { hreflang: "x-default", href: data.canonical },
  ];
  await write(`${route}/index.html`, renderPage(data, assets, content));
}
console.log(
  `Vanilla SSG: ${blog.posts.length} articles, ${config.locales.length} locales → build/`,
);
console.log(
  `Browser JavaScript: ${entry.bytes} bytes before compression; no framework runtime.`,
);
