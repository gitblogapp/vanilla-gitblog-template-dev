import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { load } from 'js-yaml';
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const history = load(await read('.github/workflows/post-history.yml'));
assert.ok(history.jobs.history.if.includes("vars.GITBLOG_OFFICIAL_INTEGRATION == 'true'"));
assert.equal(
  history.jobs.history.uses,
  'gitblogapp/svelte-gitblog-template/.github/workflows/post-history-worker.yml@59a3f6dfece69d2e50dd7e8d7196ab7d96cedbfb',
);
assert.equal(history.permissions['id-token'], 'write');
assert.equal(history.jobs.history.steps, undefined);
for (const file of ['.github/workflows/platform-speech.yml', 'scripts/tts/platform-worker.py'])
  await assert.rejects(access(new URL(`../${file}`, import.meta.url)), { code: 'ENOENT' });
for (const file of ['scripts/tts/generate.py', 'docs/gitblog/tts.md', 'docs/gitblog/images.md'])
  await access(new URL(`../${file}`, import.meta.url));
const ci = load(await read('.github/workflows/release-template.yml'));
assert.ok(ci.jobs.verify.steps.some((step) => step.run === 'npm run release:check'));
const pkg = JSON.parse(await read('package.json'));
for (const command of ['test:tts', 'test:memberships', 'test:integration', 'test:browser'])
  assert.ok(pkg.scripts['release:check'].includes(`npm run ${command}`));
console.log(
  'Template parity: dedicated platform worker boundary, guarded history workflow and CI coverage passed.',
);
