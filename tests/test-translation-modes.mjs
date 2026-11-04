import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import matter from 'gray-matter';

const root = new URL('../', import.meta.url);
const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PUBLIC_|DEEPL_|NODE_OPTIONS|POST_IDS_ROOT)/.test(key)));
for (const defaultMode of ['deepl', 'manual']) {
 const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-mixed-translations-'));
 const write = async (file, text) => { await mkdir(path.dirname(path.join(fixture, file)), { recursive: true }); await writeFile(path.join(fixture, file), text); };
 const read = (file) => readFile(path.join(fixture, file), 'utf8');
 const env = { ...baseEnv, DEEPL_API_KEY: 'fixture:fx', NODE_OPTIONS: `--import=${path.join(fixture, 'mock.mjs')}` };
 const run = (script, args = [], ok = true) => {
  const result = spawnSync(process.execPath, [`scripts/${script}.mjs`, ...args], { cwd: fixture, env, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status === 0, ok, `${defaultMode}: ${script} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result;
 };
 const status = () => JSON.parse(run('authoring', ['status', 'manual']).stdout).posts[0];
 const register = (ok = true) => {
  for (const locale of ['en', 'ja']) run('authoring', ['translation', 'manual', locale, '--from', '.gitblog/work/translation.md', '--source-hash', status().sourceHash], ok);
 };
 const manualFile = 'content/posts/manual.md';
 const output = 'content/translations/en/posts/manual.md';
 try {
  await cp(new URL('scripts/', root), path.join(fixture, 'scripts'), { recursive: true });
  await symlink(new URL('node_modules/', root), path.join(fixture, 'node_modules'), 'dir');
  await write('.gitblog/authoring.json', JSON.stringify({ schemaVersion: 1, translationMode: defaultMode }));
  await write('.env.production', 'PUBLIC_SOURCE_LOCALE=ko\nPUBLIC_TRANSLATION_LOCALES=en,ja\nPUBLIC_SITE_DESCRIPTION=Site copy\n');
  await write('requests.jsonl', '');
  await write('mock.mjs', `import { appendFileSync } from 'node:fs';
   globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api-free.deepl.com/v2/translate') throw new Error('Unexpected request');
    const body = JSON.parse(init.body);
    if (body.text.some(text => text.includes('MANUAL_ONLY'))) throw new Error('Manual text reached DeepL');
    appendFileSync('requests.jsonl', JSON.stringify(body.text) + '\\n');
    return Response.json({ translations: body.text.map(text => ({ text })) });
   };`);
  const manualData = { id: '11111111-1111-4111-8111-111111111111', title: 'MANUAL_ONLY title', description: 'MANUAL_ONLY description', date: '2026-01-01', published: true, ...(defaultMode === 'deepl' ? { translationMode: 'manual' } : {}) };
  const manualRaw = matter.stringify('MANUAL_ONLY body. [Docs](https://example.com/docs)\n', manualData);
  await write(manualFile, manualRaw);
  await write('content/posts/automatic.md', matter.stringify('AUTOMATIC_ONLY body.\n', { id: '22222222-2222-4222-8222-222222222222', title: 'Automatic', description: 'Automatic description', date: '2026-01-01', published: true, ...(defaultMode === 'manual' ? { translationMode: 'deepl' } : {}) }));
  const siteCopy = JSON.stringify({ locale: 'en', description: 'Owner copy' });
  await write('content/translations/en/site.json', siteCopy);
  assert.equal(status().translationMode, 'manual');
  run('sync-content', [], false); // Missing manual translations fail before provider calls.
  assert.equal(await read('requests.jsonl'), '');
  run('translate-posts', [], false); // Direct entry point has the same guard.
  assert.equal(await read('requests.jsonl'), '');
  await write('.gitblog/work/translation.md', matter.stringify('Manual translated body. [Docs](https://example.com/docs)\n', { title: 'Manual translation', description: 'Reviewed translation' }));
  register();
  const accepted = await read(output);
  const acceptedJa = await read('content/translations/ja/posts/manual.md');
  run('sync-content', ['--prepare']);
  assert.equal(await read('requests.jsonl'), '');
  run('sync-content');
  const requests = await read('requests.jsonl');
  assert.match(requests, /AUTOMATIC_ONLY/);
  assert.ok(!requests.includes('MANUAL_ONLY'));
  assert.equal(await read(output), accepted);
  assert.equal(await read('content/translations/ja/posts/manual.md'), acceptedJa);
  assert.equal(await read(manualFile), manualRaw);
  for (const locale of ['en', 'ja']) assert.equal(matter(await read(`content/translations/${locale}/posts/automatic.md`)).data.translationSource, 'deepl');
  if (defaultMode === 'manual') { assert.equal(await read('content/translations/en/site.json'), siteCopy); assert.ok(!requests.includes('Site copy')); }
  else assert.ok(requests.includes('Site copy'));
  run('authoring', ['check']);
  assert.equal(status().stage, 'ready');
  run('translate-posts');
  assert.equal(await read('requests.jsonl'), requests); // Fresh variants are reused.
  run('authoring', ['translation', 'automatic', 'en', '--from', '.gitblog/work/translation.md', '--source-hash', '0'.repeat(64)], false);
  await write(output, accepted.replace('Manual translated body.', 'Tampered.'));
  run('sync-content', [], false);
  assert.equal(await read('requests.jsonl'), requests);
  await write(output, accepted);
  await write(manualFile, manualRaw + '\nChanged source.\n');
  run('translate-posts', [], false);
  assert.equal(await read(output), accepted);
  assert.equal(await read('requests.jsonl'), requests);
  await write(manualFile, manualRaw);
  await write('content/translations/en/posts/orphan.md', accepted);
  run('sync-content', [], false);
  assert.equal(await read('content/translations/en/posts/orphan.md'), accepted);
  await rm(path.join(fixture, 'content/translations/en/posts/orphan.md'));
  await write(manualFile, matter.stringify('Body', { ...manualData, translationMode: 'typo' }));
  run('sync-content', [], false);
  run('authoring', ['check'], false);
  assert.equal(await read('requests.jsonl'), requests);
  await write(manualFile, matter.stringify('MANUAL_ONLY draft', { ...manualData, published: false }));
  await rm(path.join(fixture, output));
  await rm(path.join(fixture, 'content/translations/ja/posts/manual.md'));
  run('sync-content'); // Draft manual posts may omit variants and never reach DeepL.
  assert.equal(await read('requests.jsonl'), requests);
 } finally { await rm(fixture, { recursive: true, force: true }); }
}
console.log('Mixed translation modes passed: both defaults, registration, provider isolation, freshness, draft/orphan protection, idempotence and site-copy scope.');
