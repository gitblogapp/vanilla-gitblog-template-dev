import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import matter from 'gray-matter';
import { load } from 'cheerio';
import { sourceHash, translationHash } from '../scripts/lib/authoring.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-webp-cover-'));
const excluded = new Set(['.git', 'node_modules', '.svelte-kit', '.astro', 'build', 'content', '.cache', 'dist', 'distribution-output']);
async function write(file, text) {
  const target = path.join(fixture, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, text);
}
const read = file => readFile(path.join(fixture, file), 'utf8');
try {
  await cp(root, fixture, { recursive: true, filter: file => !path.relative(root, file).split(path.sep).some(part => excluded.has(part)) });
  await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
  await write('.gitblog/authoring.json', JSON.stringify({ schemaVersion: 1, translationMode: 'manual' }));
  const image = await sharp({ create: { width: 1700, height: 900, channels: 4, background: { r: 200, g: 90, b: 40, alpha: 0.5 } } }).png().toBuffer();
  await write('static/uploads/covers/webp-fixture.png', image);
  const data = { id: '7e328659-8d41-44d1-a6ad-a1d977f6b1f1', title: 'WebP cover', description: 'Cover contract', date: '2026-01-01', published: true, category: 'Notes', tags: [], cover: '/uploads/covers/webp-fixture.png', tts: false };
  const source = matter.stringify('## Body\n\nPublic image verification.', data);
  await write('content/posts/webp-cover.md', source);
  const translated = matter(matter.stringify('English public body.', { ...data, title: 'English WebP cover', locale: 'en', sourceLocale: 'ko', sourcePath: 'content/posts/webp-cover.md', sourceHash: sourceHash(source), translationSource: 'manual', translatedAt: '2026-11-04T00:00:00Z' }));
  translated.data.translationContentHash = translationHash(translated);
  const translation = matter.stringify(translated.content, translated.data);
  await write('content/translations/en/posts/webp-cover.md', translation);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PUBLIC_|DEEPL_|GITHUB_|GITBLOG_|SITE_BASE_PATH|NODE_OPTIONS)/.test(key)));
  Object.assign(env, { PUBLIC_SOURCE_LOCALE: 'ko', PUBLIC_TRANSLATION_LOCALES: 'en', PUBLIC_RELEASE_USE_TRANSLATIONS: 'true', PUBLIC_SITE_URL: 'https://fixture.github.io/blog', PUBLIC_SITE_OWNER: 'Test Writer', PUBLIC_SITE_AUTHOR: 'Test Writer', PUBLIC_SITE_REPOSITORY: 'fixture/blog', PUBLIC_HUB_REPOSITORY: 'fixture/blog', PUBLIC_GISCUS_ENABLED: 'false', PUBLIC_TTS_ENABLED: 'false', PUBLIC_HUB_ENABLED: 'true', PUBLIC_AI_MARKDOWN_ENABLED: 'true' });
  const result = spawnSync('npm', ['run', 'build'], { cwd: fixture, env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, timeout: 180000 });
  assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
  let cover;
  for (const prefix of ['', 'en/']) {
    const feed = await read(`build/${prefix}rss.xml`);
    const url = feed.match(/<hub:cover>([^<]+)<\/hub:cover>/)?.[1];
    assert.match(url, /^https:\/\/fixture\.github\.io\/blog\/uploads\/gitblog-covers\/[a-f0-9]{64}\.webp$/);
    if (cover) assert.equal(url, cover, 'source and translation must share one cover');
    cover = url;
    const relative = new URL(url).pathname.slice('/blog/'.length);
    const bytes = await readFile(path.join(fixture, 'build', relative));
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 960); assert.equal(metadata.hasAlpha, true);
    const $ = load(await read(`build/${prefix}blog/webp-cover/index.html`));
    assert.equal($('meta[property="og:image"]').attr('content'), url);
    assert.equal($('meta[name="twitter:image"]').attr('content'), url);
    assert.ok($('img').toArray().some(el => new URL($(el).attr('src') || '', `https://fixture.github.io/blog/${prefix}blog/webp-cover/`).href === url));
    const schema = $('script[type="application/ld+json"]').toArray().map(el => JSON.parse($(el).text())).find(value => value['@type'] === 'BlogPosting');
    assert.deepEqual(Array.isArray(schema.image) ? schema.image : [schema.image], [url]);
    const home = load(await read(`build/${prefix}index.html`));
    assert.ok(home('img').toArray().some(el => new URL(home(el).attr('src') || '', `https://fixture.github.io/blog/${prefix}`).href === url));
  }
  assert.equal(await read('content/posts/webp-cover.md'), source);
  assert.equal(await read('content/translations/en/posts/webp-cover.md'), translation);
  assert.deepEqual(await readFile(path.join(fixture, 'static/uploads/covers/webp-fixture.png')), image);
  assert.ok((await readFile(path.join(fixture, 'build/uploads/covers/webp-fixture.png'))).length > 0, 'old image URLs remain available');
  console.log('PASS WebP cover: source and translated HTML, home, OG, Twitter, JSON-LD, RSS, real bytes, project base and owner source preservation.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
