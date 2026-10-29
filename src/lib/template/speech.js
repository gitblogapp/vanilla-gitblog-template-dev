import fs from "node:fs";
import path from "node:path";
import { createSpokenText } from "@gitblogapp/core/body-excerpt";
import {
  speechLocale,
  findAudio,
  ttsHash,
  rawAudio,
} from "@gitblogapp/core/speech";
import { loadBlog } from "./content.js";
import { rss } from "./outputs.js";
function speechManifest(includeInput = false) {
  const blog = loadBlog(),
    posts = [];
  const file = path.join(blog.config.root, "content/audio/manifest.json");
  const audio = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf8")).posts ?? [])
    : [];
  const decode = (text) =>
    text.replace(
      /&(amp|lt|gt|quot|apos);/g,
      (_, k) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[k],
    );
  for (const locale of blog.config.locales) {
    const items = [
      ...rss(blog, locale).matchAll(/<item>([\s\S]*?)<\/item>/g),
    ].map((m) => m[1]);
    for (const post of blog.forLocale(locale)) {
      if (post.access === "membership") continue;
      const item =
        items.find(
          (x) =>
            decode(
              x.match(/<hub:postId>([\s\S]*?)<\/hub:postId>/)?.[1] || "",
            ) === post.id,
        ) || "";
      const preview =
        decode(
          item.match(/<hub:bodyExcerpt>([\s\S]*?)<\/hub:bodyExcerpt>/)?.[1] ||
            "",
        )
          .replace(/\r\n?/g, "\n")
          .replace(/[\t ]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim() || post.description.replace(/\s+/g, " ").trim();
      const text = Array.from(preview).slice(0, 1200).join(""),
        fullText = createSpokenText(post.body),
        enabled = post.ttsEnabled && speechLocale(locale) !== null;
      const entry = enabled
          ? findAudio(audio, post.id, locale, post.ttsVoice, fullText)
          : void 0,
        textHash = ttsHash(text);
      posts.push({
        postId: post.id,
        locale,
        enabled,
        voice: post.ttsVoice,
        textHash,
        previewUrl:
          entry?.textHash === textHash
            ? rawAudio(blog.config.repository, entry.previewPath)
            : null,
        fullUrl: entry
          ? rawAudio(blog.config.repository, entry.fullPath)
          : null,
        ...(includeInput
          ? { text, fullText, fullHash: ttsHash(fullText) }
          : {}),
      });
    }
  }
  return { version: 1, posts };
}
export { speechManifest };
