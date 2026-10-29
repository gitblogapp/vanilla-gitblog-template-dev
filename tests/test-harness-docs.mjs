import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const root = fileURLToPath(new URL('../', import.meta.url));
const policy = JSON.parse(await readFile(path.join(root, '.gitblog/update-policy.json'), 'utf8'));
for (const file of ['README.md', '.gitblog/user-instructions.md'])
  assert.ok(policy.preserve.includes(file), `${file} must remain user-owned`);
assert.ok(policy.mergeOnly.includes('AGENTS.md'));
const docs = ['AGENTS.md', ...(await readdir(path.join(root, 'docs/gitblog'))).filter((file) => file.endsWith('.md')).map((file) => `docs/gitblog/${file}`)];
let links = 0;
for (const file of docs) {
  const targets = [];
  marked.walkTokens(marked.lexer(await readFile(path.join(root, file), 'utf8')), (token) => {
    if (!['link', 'image'].includes(token.type) || /^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(token.href)) return;
    const target = path.resolve(root, path.dirname(file), decodeURIComponent(token.href.split('#')[0]));
    assert.ok(target.startsWith(root), `${file}: link escapes repository`);
    if (['README.md', '.gitblog/user-instructions.md'].includes(path.relative(root, target))) return;
    targets.push(target);
  });
  for (const target of targets) { assert.ok((await stat(target)).isFile(), `${file}: broken link ${target}`); links++; }
}
console.log(`Harness documentation: ${links} local links and user ownership verified.`);
