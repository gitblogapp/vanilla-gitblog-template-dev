import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locales } from '../scripts/lib/authoring.mjs';

const languages = ['ar', 'de', 'ko', 'en', 'es', 'fr', 'it', 'ja', 'pt', 'pt-br', 'zh-hans', 'zh-hant'];
test('all twelve platform languages fit with any source and duplicate/source targets do not count twice', () => {
 for (const source of languages) {
  const result = locales({ PUBLIC_SOURCE_LOCALE:source, PUBLIC_TRANSLATION_LOCALES:[...languages, source.toUpperCase(), 'ZH_HANS'].join(',') });
  assert.equal(result.source, source);
  assert.equal(result.targets.length, 11);
  assert.deepEqual(new Set([result.source,...result.targets]), new Set(languages));
 }
});
test('thirteen distinct feeds remain rejected', () => {
 assert.throws(() => locales({PUBLIC_SOURCE_LOCALE:'ko', PUBLIC_TRANSLATION_LOCALES:[...languages,'nl'].join(',')}), /at most 12 feeds/);
});
