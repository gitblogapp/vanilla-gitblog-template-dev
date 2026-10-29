import { readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const manifest = JSON.parse(await readFile('build/.well-known/ai-discovery.json', 'utf8'));
if (!Array.isArray(manifest.pages)) throw new Error('Invalid discovery page inventory');
if (manifest.pages.length === 0) {
  // Pagefind exits nonzero for an empty corpus. Empty search UI never imports it.
  await rm('build/pagefind', { recursive: true, force: true });
  console.log('Search: no published articles; no Pagefind index is needed.');
} else {
  const result = spawnSync('pagefind', ['--site', 'build'], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
