import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { load } from "cheerio";
import { seedContent } from "./helpers/fixture.js";
import { loadConfig } from "../src/lib/template/config.js";
import { loadBlog } from "../src/lib/template/content.js";
import { pageData } from "../src/lib/template/page-data.js";
import { browserData, renderPage } from "../src/lib/template/document.js";

test("renderer escapes attributes and titles while keeping browser data public and minimal", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vanilla-render-"));
  try {
    seedContent(root);
    const blog = loadBlog(
      loadConfig(root, "production", { DEEPL_API_KEY: "SECRET_SENTINEL" }),
    );
    const data = pageData(blog, "ko", "post", blog.posts[0]);
    data.post.title = '</h1><img src=x onerror="BAD_SENTINEL">';
    data.description = "</script><script>BAD_SENTINEL</script>";
    data.post.metadata = { private: "PRIVATE_METADATA_SENTINEL" };
    const markup = renderPage(data, {
      script: "/assets/client.js",
      styles: ["/assets/client.css"],
    });
    const $ = load(markup);
    assert.equal($("h1").text(), data.post.title);
    assert.equal($("img[onerror]").length, 0);
    assert.equal($("meta[name=description]").attr("content"), data.description);
    assert.equal(
      JSON.parse($('script[type="application/ld+json"]').text()).description,
      data.description,
    );
    assert.match($(".article-content").text(), /STATIC_PUBLIC_SENTINEL/);
    const payload = $("#page-data").text();
    assert.deepEqual(
      JSON.parse(payload),
      JSON.parse(JSON.stringify(browserData(data))),
    );
    for (const marker of [
      "STATIC_PUBLIC_SENTINEL",
      "SECRET_SENTINEL",
      "PRIVATE_METADATA_SENTINEL",
      root,
    ])
      assert.ok(!payload.includes(marker));
    assert.ok(!markup.includes("PRIVATE_METADATA_SENTINEL"));
    assert.equal(
      $("script").filter((_, el) => $(el).text() === "BAD_SENTINEL").length,
      0,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
