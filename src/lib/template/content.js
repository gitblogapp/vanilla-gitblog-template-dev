import { membershipStub } from "@gitblogapp/core/membership";
import { voice, findAudio, rawAudio } from "@gitblogapp/core/speech";
import { createSpokenText } from "@gitblogapp/core/body-excerpt";
import { createGiscusTerm } from "@gitblogapp/core/post-identity";
import fs from "node:fs";
import path from "node:path";
import matter from "./frontmatter.js";
import { Marked } from "marked";
import hljs from "highlight.js";
import { load } from "cheerio";
import { loadConfig, normalizeLocale } from "./config.js";
import { absolute, withBase } from "./urls.js";
import { createBodyExcerpt } from "./body-excerpt.js";
import {
  resolvePostTaxonomy,
  validateTaxonomy,
} from "../../../scripts/lib/taxonomy-core.js";
const isPostId = (id) =>
  typeof id === "string" &&
  (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  ) ||
    /^[0-9A-HJKMNP-TV-Z]{26}$/.test(id));
const giscusTerm = createGiscusTerm;
const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
function normalizeTags(input) {
  const values = (Array.isArray(input) ? input : [input]).flatMap((value) =>
    typeof value === "string"
      ? value.split(value.includes("#") ? /[\s,]+/ : ",")
      : [],
  );
  const seen = /* @__PURE__ */ new Set();
  return values
    .map((tag) => tag.trim().replace(/^#+/, "").trim())
    .filter((tag) => {
      if (!tag || seen.has(tag.toLowerCase())) return false;
      seen.add(tag.toLowerCase());
      return true;
    });
}
const markdown = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const language = lang?.split(/\s+/)[0].toLowerCase();
      const known = language && hljs.getLanguage(language);
      const html = known
        ? hljs.highlight(text, { language, ignoreIllegals: true }).value
        : escapeHtml(text);
      return `<div class="code-block"><span class="code-label">${escapeHtml(known ? language : "text")}</span><pre><code class="hljs">${html}</code></pre></div>`;
    },
  },
});
function renderMarkdown(body, config) {
  const $ = load(markdown.parse(body), {}, false);
  const toc = [];
  const used = /* @__PURE__ */ new Set(["post-title"]);
  $("h2,h3").each((index, element) => {
    const el = $(element);
    const base =
      (el.attr("id") || el.text())
        .trim()
        .toLowerCase()
        .normalize("NFKC")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "") || `heading-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    el.attr("id", id);
    toc.push({ id, text: el.text(), level: Number(element.tagName[1]) });
  });
  $("[href],[src],[poster]").each((_, element) => {
    const el = $(element);
    for (const attr of ["href", "src", "poster"]) {
      const value = el.attr(attr);
      if (value) el.attr(attr, withBase(config, value));
    }
  });
  $("[srcset]").each((_, element) => {
    const el = $(element);
    const value = el.attr("srcset");
    if (!value.includes("data:"))
      el.attr(
        "srcset",
        value
          .split(",")
          .map((candidate) =>
            candidate
              .trim()
              .split(/\s+/)
              .map((part, i) => (i ? part : withBase(config, part)))
              .join(" "),
          )
          .join(", "),
      );
  });
  $("table").wrap('<div class="table-scroll" tabindex="0"></div>');
  const text = $.root().clone();
  text.find("script,style").remove();
  return { html: $.html(), toc, text: text.text().replace(/\s+/g, " ").trim() };
}
function parsePost(file, source, locale, config, original) {
  const fail = (reason) => {
    throw new Error(`${file}: ${reason}`);
  };
  let parsed;
  try {
    parsed = matter(source);
  } catch (error) {
    return fail(`invalid frontmatter: ${String(error)}`);
  }
  const { data, content: rawBody } = parsed;
  const membership = membershipStub(data, rawBody, original);
  const body = membership.body;
  const ttsVoice =
    original?.ttsVoice ?? voice(data.ttsVoice, config.env.PUBLIC_TTS_VOICE);
  const ttsEnabled =
    membership.access === "public" &&
    (original?.ttsEnabled ??
      (typeof data.tts === "boolean"
        ? data.tts
        : config.env.PUBLIC_TTS_ENABLED === "true"));
  const manifestPath = path.join(config.root, "content/audio/manifest.json");
  const entries = fs.existsSync(manifestPath)
    ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")).posts ?? [])
    : [];
  const audio = ttsEnabled
    ? findAudio(
        entries,
        String(data.id),
        locale,
        ttsVoice,
        createSpokenText(body),
      )
    : void 0;
  if (!isPostId(data.id))
    fail("missing or invalid immutable id (UUID or uppercase ULID required)");
  for (const key of ["title", "description"])
    if (typeof data[key] !== "string" || !data[key].trim())
      fail(`${key} must be a non-empty string`);
  const dateValue = (key, optional = false) => {
    if (
      optional &&
      (data[key] === void 0 || data[key] === null || data[key] === "")
    )
      return null;
    const value =
      data[key] instanceof Date ? data[key].toISOString() : data[key];
    if (
      typeof value !== "string" ||
      !value.trim() ||
      Number.isNaN(Date.parse(value))
    )
      fail(`invalid ${key}`);
    return value;
  };
  const date = dateValue("date");
  const updated = dateValue("updated", true);
  const translatedAt = dateValue("translatedAt", true);
  const lastModified = new Date(
    Math.max(
      Date.parse(updated ?? date),
      locale !== config.sourceLocale && translatedAt
        ? Date.parse(translatedAt)
        : 0,
    ),
  ).toISOString();
  if (data.published !== void 0 && typeof data.published !== "boolean")
    fail("published must be boolean");
  if (data.category !== void 0 && typeof data.category !== "string")
    fail("category must be string");
  if (data.locale && normalizeLocale(String(data.locale)) !== locale)
    fail(`locale metadata does not match path (${locale})`);
  if (
    data.sourceLocale &&
    normalizeLocale(String(data.sourceLocale)) !== config.sourceLocale
  )
    fail("sourceLocale metadata does not match configured source locale");
  const cover =
    typeof data.cover === "string" && data.cover.trim()
      ? data.cover.trim()
      : null;
  if (cover && (!cover.startsWith("/") || cover.startsWith("//")))
    fail("cover must be a site-relative path, e.g. /uploads/covers/image.svg");
  if (
    cover &&
    config.hubEnabled &&
    new URL(absolute(config, cover)).origin !== new URL(config.siteUrl).origin
  )
    fail("Hub cover must have same origin");
  const rendered = renderMarkdown(body, config);
  return {
    ...membership,
    ttsEnabled,
    ttsVoice,
    audioUrl: audio ? rawAudio(config.repository, audio.fullPath) : null,
    id: data.id,
    slug: path.basename(file, ".md"),
    locale,
    sourceLocale: config.sourceLocale,
    title: data.title,
    description:
      membership.access === "membership" && !membership.previewAllowed
        ? "Members-only article"
        : data.description,
    date,
    updated,
    translatedAt,
    lastModified,
    published: data.published !== false,
    category: data.category?.trim() || "Notes",
    tags: normalizeTags(data.tags),
    taxonomy: void 0,
    cover,
    body,
    bodyExcerpt: createBodyExcerpt(body),
    ...rendered,
    file,
    metadata: data,
    timestamp: Date.parse(date),
    readingMinutes: Math.max(
      1,
      Math.ceil(rendered.text.split(/\s+/).length / 220),
    ),
    giscusTerm: giscusTerm(data.id),
  };
}
const filesIn = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((file) => file.isFile() && file.name.endsWith(".md"))
        .map((file) => path.join(dir, file.name))
        .sort()
    : [];
function loadBlog(config = loadConfig()) {
  const read = (dir, locale, sources) =>
    filesIn(dir).map((file) =>
      parsePost(
        file,
        fs.readFileSync(file, "utf8"),
        locale,
        config,
        sources?.get(path.basename(file, ".md")),
      ),
    );
  const originals = read(
    path.join(config.root, "content/posts"),
    config.sourceLocale,
  );
  const byId = /* @__PURE__ */ new Map();
  for (const post of originals) {
    if (byId.has(post.id))
      throw new Error(
        `${post.file}: duplicate id ${post.id}; first used by ${byId.get(post.id).file}`,
      );
    byId.set(post.id, post);
  }
  const bySlug = new Map(originals.map((post) => [post.slug, post]));
  const posts = [...originals.filter((post) => post.published)];
  const translationsRoot = path.join(config.root, "content/translations");
  const directories = fs.existsSync(translationsRoot)
    ? fs
        .readdirSync(translationsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
    : [];
  const seenLocales = /* @__PURE__ */ new Set();
  for (const dir of directories) {
    const locale = normalizeLocale(dir.name);
    if (!config.locales.includes(locale) || locale === config.sourceLocale)
      continue;
    if (seenLocales.has(locale) || dir.name !== locale)
      throw new Error(
        `${translationsRoot}/${dir.name}: translation directory must use unique normalized locale ${locale}`,
      );
    seenLocales.add(locale);
    for (const post of read(
      path.join(translationsRoot, dir.name, "posts"),
      locale,
      bySlug,
    )) {
      const original = bySlug.get(post.slug);
      if (!original)
        throw new Error(
          `${post.file}: translation has no source with the same filename`,
        );
      if (post.id !== original.id)
        throw new Error(
          `${post.file}: translation id differs from ${original.file}`,
        );
      if (post.published && original.published) posts.push(post);
    }
  }
  posts.sort(
    (a, b) =>
      b.timestamp - a.timestamp ||
      b.date.localeCompare(a.date) ||
      b.slug.localeCompare(a.slug),
  );
  const dictionaryFile = path.join(config.root, "content/taxonomy.json");
  if (fs.existsSync(dictionaryFile)) {
    const dictionary = JSON.parse(fs.readFileSync(dictionaryFile, "utf8"));
    validateTaxonomy(dictionary);
    if (dictionary.sourceLocale !== config.sourceLocale)
      throw new Error("Taxonomy sourceLocale differs from site configuration");
    for (const post of posts) {
      post.taxonomy = resolvePostTaxonomy(
        dictionary,
        post.category,
        post.tags,
        post.locale,
      );
      post.category = post.taxonomy.category.label;
      post.tags = post.taxonomy.tags.map((tag) => tag.label);
    }
  }
  const taxonomy = (name) =>
    filesIn(path.join(config.root, "content", name)).map((file) => {
      const { data } = matter(fs.readFileSync(file, "utf8"));
      if (typeof data.title !== "string" || !data.title.trim())
        throw new Error(`${file}: taxonomy title must be a non-empty string`);
      return { title: data.title.trim(), file, metadata: data };
    });
  return {
    config,
    posts,
    originals,
    categories: taxonomy("categories"),
    tags: taxonomy("tags"),
    forLocale: (locale) => posts.filter((post) => post.locale === locale),
  };
}
export {
  escapeHtml,
  giscusTerm,
  isPostId,
  loadBlog,
  normalizeTags,
  parsePost,
  renderMarkdown,
};
