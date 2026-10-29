import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadBlog } from "../src/lib/template/content.js";
import { loadConfig } from "../src/lib/template/config.js";
import { createSpokenText } from "@gitblogapp/core/body-excerpt";
import { ttsHash } from "@gitblogapp/core/speech";
import { spawn } from "node:child_process";
import {
  templateFixture,
  fixtureSlug,
  run,
  cleanEnv,
} from "../tests/helpers/fixture.js";
const temp = templateFixture();
const environment = {
  ...cleanEnv(),
  PUBLIC_SITE_URL: "https://fixture.github.io/preview",
  PUBLIC_TTS_ENABLED: "true",
};
let preview;
let browser;
try {
  const blog = loadBlog(loadConfig(temp, "production", environment));
  fs.mkdirSync(path.join(temp, "content/audio"), { recursive: true });
  fs.writeFileSync(
    path.join(temp, "content/audio/manifest.json"),
    JSON.stringify({
      version: 1,
      posts: blog.posts.map((post) => ({
        postId: post.id,
        locale: post.locale,
        voice: "F1",
        version: "supertonic3-v1",
        textHash: ttsHash(post.bodyExcerpt),
        fullHash: ttsHash(createSpokenText(post.body)),
        previewPath: `content/audio/${"a".repeat(64)}.mp3`,
        fullPath: `content/audio/${"a".repeat(64)}.mp3`,
      })),
    }),
  );
  run(temp, "npm", ["run", "build"], environment);
  preview = spawn(process.execPath, ["scripts/preview.mjs", "--port", "0"], {
    cwd: temp,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Preview startup timed out")),
      1e4,
    );
    preview.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    preview.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Preview exited ${code}`));
    });
    preview.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/http:\/\/[^\s]+/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0].replace(/\/$/, ""));
      }
    });
  });
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    colorScheme: "light",
  });
  const pcmBytes = 24e3 * 2 * 30;
  const wav = Buffer.alloc(44 + pcmBytes);
  wav.write("RIFF");
  wav.writeUInt32LE(36 + pcmBytes, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(24e3, 24);
  wav.writeUInt32LE(48e3, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(pcmBytes, 40);
  await page.route(
    "https://raw.githubusercontent.com/fixture/blog/**",
    (route) => {
      const range = /^bytes=(\d+)-(\d*)$/.exec(
        route.request().headers().range || "",
      );
      const start = range ? Number(range[1]) : 0;
      const end = range?.[2]
        ? Math.min(Number(range[2]), wav.length - 1)
        : wav.length - 1;
      return route.fulfill({
        status: range ? 206 : 200,
        contentType: "audio/wav",
        headers: {
          "Accept-Ranges": "bytes",
          ...(range
            ? { "Content-Range": `bytes ${start}-${end}/${wav.length}` }
            : {}),
        },
        body: wav.subarray(start, end + 1),
      });
    },
  );
  await page.route("https://gitblog.app/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(message.text());
  });
  await page.goto(`${base}/`);
  assert.equal(await page.locator("html").getAttribute("lang"), "ko");
  await page
    .getByRole("button", { name: "\uC0C9\uC0C1 \uD14C\uB9C8 \uC804\uD658" })
    .click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.ok(
    await page.evaluate(() => {
      const theme = getComputedStyle(document.documentElement);
      return [
        ["--text", "--ink"],
        ["--text-dim", "--muted"],
        ["--border-dim", "--line"],
        ["--bg-component", "--paper"],
        ["--primary", "--green"],
      ].every(
        ([embed, local]) =>
          theme.getPropertyValue(embed).trim() ===
          theme.getPropertyValue(local).trim(),
      );
    }),
  );
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.goto(`${base}/en/search/?q=searchablebody`);
  await page.locator(".search-result").first().waitFor();
  assert.equal(await page.locator(".search-result").count(), 1);
  await page.goto(`${base}/en/search/?category=Notes`);
  await page.locator(".search-result").first().waitFor();
  assert.equal(await page.locator(".search-result").count(), 1);
  await page.locator(".search-result h2 a").click();
  assert.equal(await page.locator("h1").textContent(), "Contract fixture");
  assert.ok(page.url().includes("/preview/en/blog/"));
  const player = page.locator("[data-article-audio]");
  assert.equal(await player.count(), 1);
  await player
    .getByRole("button", { name: "Playback speed: 1\xD7", exact: true })
    .click();
  assert.equal(await player.getByRole("menu").isVisible(), true);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  assert.equal(
    await player
      .getByRole("button", { name: "Playback speed: 1.25\xD7", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await player.locator("audio").evaluate((el) => el.playbackRate),
    1.25,
  );
  await player.locator(".speed-trigger").press("ArrowDown");
  await page.keyboard.press("Escape");
  assert.equal(await player.getByRole("menu").isVisible(), false);
  await player.locator(".speed-trigger").click();
  await page.locator("h1").click();
  assert.equal(await player.getByRole("menu").isVisible(), false);
  await player.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForFunction(() => {
    const media = document.querySelector("audio");
    return media && !media.paused && Number.isFinite(media.duration);
  });
  await player.getByRole("button", { name: "Pause", exact: true }).click();
  assert.equal(await player.locator("audio").evaluate((el) => el.paused), true);
  await player.getByRole("slider").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    () => (document.querySelector("audio")?.currentTime ?? 0) >= 0.09,
  );
  assert.ok(await player.locator("audio").evaluate((el) => el.currentTime < 1));
  assert.match(await player.locator("[data-duration]").innerText(), /0:30/);
  const markdown = await page.request.get(
    `${base}/en/blog/${encodeURIComponent(fixtureSlug)}/index.md`,
  );
  assert.equal(markdown.status(), 200);
  assert.match(markdown.headers()["content-type"], /text\/markdown/);
  await page.goto(`${base}/search/?q=${encodeURIComponent("\uAC80\uC99D")}`);
  await page.locator(".search-result").first().waitFor();
  assert.equal(await page.locator(".search-result").count(), 1);
  await page.locator("#query").fill("PRIVATE_DRAFT_SENTINEL");
  await page.waitForFunction(
    () => document.querySelector(".search-results")?.childElementCount === 0,
  );
  assert.equal((await page.request.get(`${base}/blog/draft/`)).status(), 404);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      "/",
      `/blog/${encodeURIComponent(fixtureSlug)}/`,
      "/search/?q=STATIC_PUBLIC_SENTINEL",
    ]) {
      await page.goto(`${base}${route}`);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow: ${width} ${route}`,
      );
    }
  }
  await page.goto(`${base}/`);
  const mobileMenu = page.getByRole("button", {
    name: "\uD0D0\uC0C9 \uBA54\uB274 \uC5F4\uAE30",
  });
  await mobileMenu.click();
  assert.equal(
    await page.locator("#mobile-nav").evaluate((el) => el.open),
    true,
  );
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator("#mobile-nav").evaluate((el) => el.open),
    false,
  );
  assert.equal(
    await mobileMenu.evaluate((el) => document.activeElement === el),
    true,
  );
  await mobileMenu.click();
  await page
    .locator("#mobile-nav a.nav-post:not(.category-all)")
    .first()
    .click();
  assert.equal(await page.locator("h1").textContent(), "\uAC80\uC99D \uAE00");
  assert.equal(
    await page.locator("#mobile-nav").evaluate((el) => el.open),
    false,
  );
  await page.locator(".mobile-toc summary").click();
  assert.equal(await page.locator(".mobile-toc nav").isVisible(), true);
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noScript.newPage();
  await staticPage.goto(`${base}/blog/${encodeURIComponent(fixtureSlug)}/`);
  assert.ok(
    (await staticPage.locator(".article-content").innerText()).includes(
      "STATIC_PUBLIC_SENTINEL",
    ),
  );
  assert.equal(await staticPage.locator("audio").getAttribute("controls"), "");
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS browser: project-base preview, Korean/English Pagefind, Unicode, Markdown, drafts, responsive layout, persisted theme, localized audio, mobile dialog/focus/TOC and JavaScript-disabled article reading.",
  );
} finally {
  await browser?.close();
  if (preview && preview.exitCode === null) {
    await new Promise((resolve) => {
      preview.once("exit", () => resolve());
      preview.kill();
    });
  }
  fs.rmSync(temp, { recursive: true, force: true });
}
