import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { XMLParser } from "fast-xml-parser";
import { loadConfig, languageTag, localizedSite } from "../src/lib/template/config.js";
import { loadBlog, giscusTerm, renderMarkdown } from "../src/lib/template/content.js";
import { manifest, rss, sitemap, searchIndex } from "../src/lib/template/outputs.js";
import { discoveryManifest, publicMarkdown, llmsText } from "../src/lib/template/discovery.js";
import { absolute, postPath, withBase } from "../src/lib/template/urls.js";
import { fixtureId, fixtureSlug, seedContent } from "./helpers/fixture.js";
function fixture(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vanilla-contract-"));
  try {
    seedContent(dir);
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
const write = (dir, file, value) => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), value);
};
test("environment and legacy site copy agree across renderer and harness, preserving explicit blanks", () => fixture((dir) => {
  const config = loadConfig(dir, "production", {});
  assert.equal(config.site.title, "Fixture blog");
  assert.deepEqual(loadConfig(dir, "development", {}), config);
  assert.equal(loadConfig(dir, "production", { PUBLIC_SITE_TITLE: "" }).site.title, "");
  assert.equal(
    loadConfig(dir, "production", { PUBLIC_SITE_OWNER: "Author" }).site.author,
    "Author"
  );
  assert.equal(
    loadConfig(dir, "production", { GITHUB_REPOSITORY: "fork/blog" }).repository,
    "fork/blog"
  );
  assert.equal(
    loadConfig(dir, "production", { SITE_BASE_PATH: "/preview" }).siteUrl,
    "https://fixture.github.io/preview/"
  );
  for (const code of ["en", "en-gb", "zh-hans", "zh-hant"])
    assert.equal(languageTag(code), Intl.getCanonicalLocales(code)[0]);
  assert.throws(
    () => loadConfig(dir, "production", { PUBLIC_SITE_URL: "http://example.com" }),
    /HTTPS/
  );
  assert.throws(
    () => loadConfig(dir, "production", { PUBLIC_TRANSLATION_LOCALES: "en,ja,fr,de,es,pt,it,nl" }),
    /8 feeds/
  );
  write(dir, "content/translations/en/site.json", '{"footer":""}');
  assert.equal(localizedSite(config, "en").footer, "");
}));
test("identity, base URL encoding, XML, excerpt, build SHA and public-only discovery", () => fixture((dir) => {
  const config = loadConfig(dir, "production", { GITBLOG_BUILD_COMMIT: "a".repeat(40) });
  const blog = loadBlog(config);
  const post = blog.posts[0];
  assert.equal(blog.posts.length, 1);
  assert.equal(giscusTerm(fixtureId), "giscus-post-b27eb57690b38dc2");
  assert.equal(withBase(config, "/blog/uploads/a.svg"), "/blog/uploads/a.svg");
  assert.equal(
    postPath(config, "ko", fixtureSlug),
    `/blog/blog/${encodeURIComponent(fixtureSlug)}/`
  );
  assert.equal(
    absolute(config, "/uploads/a.svg"),
    "https://fixture.github.io/blog/uploads/a.svg"
  );
  const feed = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(
    rss(blog, "ko")
  );
  assert.equal(feed.rss.channel.item.guid["#text"], fixtureId);
  assert.equal(feed.rss.channel.item["hub:giscusTerm"], post.giscusTerm);
  assert.match(feed.rss.channel.item["hub:bodyExcerpt"], /STATIC_PUBLIC_SENTINEL/);
  assert.equal(feed.rss.channel["hub:buildCommit"], "a".repeat(40));
  assert.equal(manifest(config).buildCommit, "a".repeat(40));
  assert.equal(discoveryManifest(blog).pages.length, 1);
  assert.equal(
    discoveryManifest(blog).pages[0].canonicalUrl,
    absolute(config, postPath(config, "ko", fixtureSlug))
  );
  for (const output of [
    rss(blog, "ko"),
    sitemap(blog),
    llmsText(blog),
    JSON.stringify(searchIndex(blog, "ko"))
  ])
    assert.ok(!output.includes("PRIVATE_DRAFT_SENTINEL"));
  assert.ok(!publicMarkdown(blog, post).includes("sourceHash:"));
  assert.match(publicMarkdown(blog, post), /url: "https:/);
  const disabled = loadBlog(
    loadConfig(dir, "production", {
      PUBLIC_AI_MARKDOWN_ENABLED: "false",
      PUBLIC_AI_LLMS_ENABLED: "false"
    })
  );
  assert.equal(discoveryManifest(disabled).pages[0].markdownUrl, null);
  assert.equal(llmsText(disabled), "# Discovery index disabled\n");
  assert.throws(() => publicMarkdown(disabled, disabled.posts[0]), /not published/);
}));
test("translation timestamps, reciprocal links and source withdrawal propagate to every output", () => fixture((dir) => {
  const original = matter(
    fs.readFileSync(path.join(dir, `content/posts/${fixtureSlug}.md`), "utf8")
  );
  write(
    dir,
    `content/translations/en/posts/${fixtureSlug}.md`,
    matter.stringify(original.content, {
      ...original.data,
      locale: "en",
      sourceLocale: "ko",
      translatedAt: "2026-02-01T00:00:00Z"
    })
  );
  let blog = loadBlog(loadConfig(dir, "production", {}));
  assert.equal(blog.posts.length, 2);
  assert.equal(blog.forLocale("en")[0].lastModified, "2026-02-01T00:00:00.000Z");
  assert.equal(discoveryManifest(blog).pages[0].alternateLinks.length, 3);
  write(
    dir,
    `content/posts/${fixtureSlug}.md`,
    matter.stringify(original.content, { ...original.data, published: false })
  );
  blog = loadBlog(loadConfig(dir, "production", {}));
  assert.equal(blog.posts.length, 0);
  assert.equal(discoveryManifest(blog).pages.length, 0);
  assert.ok(!sitemap(blog).includes(encodeURIComponent(fixtureSlug)));
  assert.ok(!rss(blog, "en").includes(fixtureId));
}));
test("taxonomy labels and aliases reach UI search and RSS without changing source metadata", () => fixture((dir) => {
  write(
    dir,
    "content/taxonomy.json",
    JSON.stringify({
      schemaVersion: 1,
      sourceLocale: "ko",
      categories: [
        { id: "notes", source: "Notes", labels: { ko: "\uB178\uD2B8", en: "Notes" }, aliases: [] }
      ],
      tags: [
        {
          id: "build",
          source: "build",
          labels: { ko: "\uBE4C\uB4DC", en: "Build" },
          aliases: ["compile"]
        }
      ]
    })
  );
  const blog = loadBlog(loadConfig(dir, "production", {}));
  assert.equal(blog.posts[0].category, "\uB178\uD2B8");
  assert.deepEqual(blog.posts[0].tags, ["\uBE4C\uB4DC"]);
  assert.equal(blog.posts[0].metadata.category, "Notes");
  assert.ok(searchIndex(blog, "ko")[0].aliases.includes("compile"));
  assert.match(rss(blog, "ko"), /hub:taxonomy/);
}));
test("Markdown rendering preserves existing design behavior and validates duplicate identities", () => fixture((dir) => {
  const config = loadConfig(dir, "production", {});
  const rendered = renderMarkdown(
    "## Hello\n\n## Hello\n\n```unknown\n<script>alert(1)<\/script>\n```\n\n![Image](/uploads/fixture.svg)\n\n| A | B |\n| - | - |\n| x | y |",
    config
  );
  assert.deepEqual(
    rendered.toc.map((item) => item.id),
    ["hello", "hello-2"]
  );
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.match(rendered.html, /table-scroll/);
  assert.match(rendered.html, /\/blog\/uploads\/fixture.svg/);
  fs.copyFileSync(
    path.join(dir, `content/posts/${fixtureSlug}.md`),
    path.join(dir, "content/posts/duplicate.md")
  );
  assert.throws(() => loadBlog(config), /duplicate id/);
}));
