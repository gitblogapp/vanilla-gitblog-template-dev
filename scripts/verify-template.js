import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import matter from "gray-matter";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import { loadConfig } from "../src/lib/template/config.js";
import { loadBlog } from "../src/lib/template/content.js";
import { absolute, postPath } from "../src/lib/template/urls.js";
import { snapshot } from "./preservation.js";
import {
  fixtureId,
  fixtureSlug,
  run,
  templateFixture,
} from "../tests/helpers/fixture.js";
const temp = templateFixture();
const seoOnly = process.argv.includes("--seo");
try {
  fs.writeFileSync(
    path.join(temp, "src/pages/custom.html"),
    "<h1>USER_PAGE_SENTINEL</h1>",
  );
  const slot = path.join(temp, "src/extensions/slots.js");
  fs.writeFileSync(
    slot,
    fs
      .readFileSync(slot, "utf8")
      .replace(
        'return "";',
        'return `<span data-test-extension="${_context.name}">${_context.locale}:${_context.post?.id ?? _context.site.title}</span>`;',
      ),
  );
  const policy = JSON.parse(
    fs.readFileSync(path.join(temp, ".gitblog/update-policy.json"), "utf8"),
  );
  const protectedPaths = [...policy.preserve, ...policy.mergeOnly];
  const before = snapshot(temp, protectedPaths);
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    isArray: (name) => ["item", "xhtml:link"].includes(name),
  });
  for (const siteUrl of [
    "https://fixture.github.io",
    "https://fixture.github.io/my-blog",
    "https://notes.example.org",
  ]) {
    const env = {
      PUBLIC_SITE_URL: siteUrl,
      GITHUB_REPOSITORY: "fixture/current-blog",
      GITBLOG_BUILD_COMMIT: "a".repeat(40),
    };
    run(temp, "npm", ["run", "build"], env);
    assert.deepEqual(
      snapshot(temp, protectedPaths),
      before,
      "Build changed protected source",
    );
    const out = path.join(temp, "build");
    const read = (file) => fs.readFileSync(path.join(out, file), "utf8");
    const config = loadConfig(temp, "production", env);
    const blog = loadBlog(config);
    const hub = JSON.parse(read(".well-known/blog-hub.json"));
    const discovery = JSON.parse(read(".well-known/ai-discovery.json"));
    const webManifest = JSON.parse(read("site.webmanifest"));
    assert.equal(webManifest.name, config.site.title);
    assert.equal(webManifest.start_url, `${config.base}/`);
    assert.equal(webManifest.scope, `${config.base}/`);
    assert.equal(webManifest.icons[0].src, `${config.base}/favicon.svg`);
    assert.equal(hub.siteUrl, `${siteUrl}/`);
    assert.equal(hub.repository, "fixture/current-blog");
    assert.equal(hub.buildCommit, env.GITBLOG_BUILD_COMMIT);
    assert.equal(discovery.pages.length, 2);
    const sitemap = parser.parse(read("sitemap.xml"));
    assert.ok(sitemap.urlset);
    assert.match(read("custom/index.html"), /USER_PAGE_SENTINEL/);
    for (const locale of config.locales) {
      const prefix = locale === "ko" ? "" : `${locale}/`;
      const feed = parser.parse(read(`${prefix}rss.xml`));
      assert.equal(feed.rss.channel.item.length, 1);
      assert.equal(feed.rss.channel.item[0]["hub:postId"], fixtureId);
      assert.equal(feed.rss.channel.item[0]["hub:buildCommit"], void 0);
      assert.equal(
        feed.rss.channel["hub:buildCommit"],
        env.GITBLOG_BUILD_COMMIT,
      );
      assert.equal(feed.rss.channel.item[0].guid["@_isPermaLink"], "false");
      const post = blog.forLocale(locale)[0];
      const articlePath = `${prefix}blog/${fixtureSlug}/`;
      const $ = load(read(`${articlePath}index.html`));
      const canonical = absolute(config, postPath(config, locale, fixtureSlug));
      const thumbnail = `${siteUrl}/uploads/fixture.svg`;
      assert.equal($('meta[property="og:image"]').attr("content"), thumbnail);
      assert.equal($('meta[name="twitter:image"]').attr("content"), thumbnail);
      assert.equal(
        $('meta[name="twitter:card"]').attr("content"),
        "summary_large_image",
      );
      assert.equal(
        $('meta[property="og:image:alt"]').attr("content"),
        post.title,
      );
      assert.equal(
        $('meta[name="twitter:image:alt"]').attr("content"),
        post.title,
      );
      assert.equal($("html").attr("lang"), locale);
      const related = $(".related-panel");
      assert.equal(related.attr("data-post-id"), fixtureId);
      assert.equal(related.attr("data-lang"), locale);
      assert.equal(related.attr("data-limit"), "4");
      assert.equal(
        JSON.parse($("[data-gitblog-analytics]").attr("data-gitblog-analytics"))
          .repository,
        "fixture/current-blog",
      );
      const speech = JSON.parse(read(".well-known/tts-input.json"));
      assert.ok(
        speech.posts.some(
          (entry) => entry.postId === fixtureId && entry.locale === locale,
        ),
      );
      assert.equal($("link[rel=canonical]").attr("href"), canonical);
      assert.equal(
        $('link[type="text/markdown"]').attr("href"),
        `${canonical}index.md`,
      );
      assert.equal($('a[href$="/index.md"]').length, 1);
      assert.equal($("link[hreflang]").length, 3);
      assert.ok(
        $(".article-content").text().includes("STATIC_PUBLIC_SENTINEL"),
      );
      assert.equal(
        $('[data-test-extension="article-before-body"]').text(),
        `${locale}:${fixtureId}`,
      );
      assert.equal($('[data-test-extension="article-after-body"]').length, 1);
      assert.equal($('[data-test-extension="site-footer"]').length, 1);
      assert.equal(
        JSON.parse($('script[type="application/ld+json"]').text()).dateModified,
        post.lastModified,
      );
      assert.match(
        read(`${articlePath}index.md`),
        new RegExp(
          JSON.stringify(canonical).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      );
      assert.ok(
        !read(`${articlePath}index.md`).includes("translationContentHash:"),
      );
      assert.ok(read("llms.txt").includes(canonical));
      for (const link of $("link[hreflang]").toArray())
        assert.ok(read("sitemap.xml").includes($(link).attr("href")));
      $('a[href^="/"],img[src^="/"]').each((_, el) =>
        assert.ok(
          ($(el).attr("href") || $(el).attr("src")).startsWith(
            `${config.base}/`,
          ),
        ),
      );
      assert.equal(JSON.parse(read(`${prefix}search.json`)).length, 1);
    }
    assert.ok(fs.existsSync(path.join(out, "pagefind/pagefind.js")));
    const entries = JSON.parse(read("pagefind/pagefind-entry.json"));
    assert.equal(entries.languages.ko.page_count, 1);
    assert.equal(entries.languages.en.page_count, 1);
    assert.ok(!read("sitemap.xml").includes("draft"));
    assert.ok(!read("search.json").includes("PRIVATE_DRAFT_SENTINEL"));
    assert.equal(
      fs.existsSync(path.join(out, "CNAME")),
      siteUrl === "https://notes.example.org",
    );
    if (siteUrl === "https://notes.example.org")
      assert.equal(read("CNAME"), "notes.example.org\n");
    console.log(
      `PASS ${siteUrl}: full build, SEO, feeds, Markdown/discovery, Pagefind, extensions and source preservation.`,
    );
  }
  if (!seoOnly) {
    const env = {
      PUBLIC_SITE_URL: "https://fixture.github.io/my-blog",
      PUBLIC_AI_MARKDOWN_ENABLED: "false",
      PUBLIC_AI_LLMS_ENABLED: "false",
    };
    run(temp, "npm", ["run", "build"], env);
    assert.ok(
      !fs.existsSync(path.join(temp, `build/blog/${fixtureSlug}/index.md`)),
      "stale Markdown survived disabling",
    );
    assert.equal(
      fs.readFileSync(path.join(temp, "build/llms.txt"), "utf8"),
      "# Discovery index disabled\n",
    );
    const disabled = load(
      fs.readFileSync(
        path.join(temp, `build/blog/${fixtureSlug}/index.html`),
        "utf8",
      ),
    );
    assert.equal(
      disabled('link[type="text/markdown"], a[href$="/index.md"]').length,
      0,
    );
    const source = path.join(temp, `content/posts/${fixtureSlug}.md`);
    const raw = fs.readFileSync(source, "utf8");
    fs.writeFileSync(source, raw + "\nChanged source.\n");
    run(temp, process.execPath, ["scripts/authoring.mjs", "check"], {}, false);
    fs.writeFileSync(source, raw);
    const parsed = matter(raw);
    fs.writeFileSync(
      source,
      matter.stringify(parsed.content, { ...parsed.data, published: false }),
    );
    run(temp, "npm", ["run", "build"], env);
    assert.ok(
      !fs.existsSync(path.join(temp, `build/blog/${fixtureSlug}/index.html`)),
    );
    assert.ok(
      !fs.existsSync(
        path.join(temp, `build/en/blog/${fixtureSlug}/index.html`),
      ),
    );
    assert.equal(
      JSON.parse(
        fs.readFileSync(
          path.join(temp, "build/.well-known/ai-discovery.json"),
          "utf8",
        ),
      ).pages.length,
      0,
    );
    fs.rmSync(path.join(temp, "content/posts"), { recursive: true });
    fs.rmSync(path.join(temp, "content/translations"), {
      recursive: true,
      force: true,
    });
    fs.mkdirSync(path.join(temp, "content/posts"));
    run(temp, "npm", ["run", "build"], env);
    assert.ok(fs.existsSync(path.join(temp, "build/rss.xml")));
    console.log(
      "PASS manual freshness rejection, disabled export cleanup, source withdrawal and completely empty blog.",
    );
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
