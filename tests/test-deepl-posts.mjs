import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-deepl-posts-'));
const output = 'content/translations/en-gb/posts/article.md';
const env = Object.fromEntries(
	Object.entries(process.env).filter(([key]) => !/^(PUBLIC_|DEEPL_|NODE_OPTIONS)/.test(key))
);
const write = async (file, value) => {
	await mkdir(path.dirname(path.join(fixture, file)), { recursive: true });
	await writeFile(path.join(fixture, file), value);
};
const read = (file) => readFile(path.join(fixture, file), 'utf8');
const data = {
	id: 'fc3cb8a9-e920-4720-8bf5-d06e51166d85',
	title: 'Translation',
	description: 'Translation regression fixture',
	date: '2026-01-01',
	published: true,
	category: 'Notes',
	tags: []
};
const source = (body, extra = {}) =>
	write('content/posts/article.md', matter.stringify(body, { ...data, ...extra }));
const run = (mode = 'identity', success = true, extra = {}) => {
	const result = spawnSync(
		process.execPath,
		['--import', './mock.mjs', './scripts/translate-posts.mjs'],
		{
			cwd: fixture,
			env: { ...env, DEEPL_API_KEY: 'fixture:fx', MOCK_MODE: mode, ...extra },
			encoding: 'utf8',
			timeout: 60_000,
			maxBuffer: 10 * 1024 * 1024
		}
	);
	assert.equal(result.status === 0, success, `${result.stdout}\n${result.stderr}`);
	return result;
};
const requests = async () =>
	(await read('requests.jsonl'))
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line));
try {
	await cp(path.join(root, 'scripts/lib'), path.join(fixture, 'scripts/lib'), { recursive: true });
	await cp(
		path.join(root, 'scripts/translate-posts.mjs'),
		path.join(fixture, 'scripts/translate-posts.mjs')
	);
	await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
	await write('.env.production', 'PUBLIC_SOURCE_LOCALE=en\nPUBLIC_TRANSLATION_LOCALES=en-gb\n');
	await write('requests.jsonl', '');
	await write(
		'mock.mjs',
		`
import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
let bodyCalls = 0;
globalThis.fetch = async (url, init) => {
 assert.equal(String(url), 'https://api-free.deepl.com/v2/translate');
 const body = JSON.parse(init.body);
 assert.ok(Buffer.byteLength(init.body) <= 128 * 1024, 'Oversized DeepL request');
 assert.ok(body.text.length <= 50, 'Too many texts in one request');
 assert.ok(body.text.every(text => !text.includes('\\uFFFD')), 'Broken surrogate pair');
 appendFileSync('requests.jsonl', JSON.stringify(body) + '\\n');
 const mode = process.env.MOCK_MODE;
 if (mode === 'forbid') throw new Error('Unnecessary API call');
 if (body.tag_handling === 'xml') {
  bodyCalls++;
  if (mode === 'missing-body' || (mode === 'late-missing-body' && bodyCalls === 2)) return Response.json({translations:[]});
  if (mode === 'invalid-text') return Response.json({translations:body.text.map(() => ({text: null}))});
  if (mode === 'empty-text') return Response.json({translations:body.text.map(() => ({text: ' '}))});
  if (mode === 'extra-body') return Response.json({translations:[...body.text, 'extra'].map(text=>({text}))});
  if (mode === 'missing-fragment') return Response.json({translations:body.text.map(text=>({text:text.replace(/<p>[^]*?<\\/p>/,'')}))});
 }
 return Response.json({translations:body.text.map(text => ({text: mode === 'collapse-lines' ? text.replaceAll('\\n', ' ').replaceAll('Source', 'Translated') : mode === 'corrupt-token' ? text.replaceAll('ZXQPL_KEEP_', 'BROKEN_') : text}))});
};
`
	);
	const table =
		'| Source header | Code |\n| :--- | ---: |\n| Source value | `a \\| b` |\n| [Source link](https://example.com/a?q=1&b=2) | |';
	await source('Intro without a blank line\n' + table + '\n\nAfter the table.');
	run('collapse-lines');
	let translated = matter(await read(output));
	const tableToken = marked.lexer(translated.content).find((token) => token.type === 'table');
	assert.ok(tableToken, 'Translated Markdown must still render as a table');
	assert.equal(tableToken.header.length, 2);
	assert.equal(tableToken.rows.length, 2);
	assert.deepEqual(tableToken.align, ['left', 'right']);
	assert.match(translated.content, /Translated header/);
	assert.ok(translated.content.includes('`a \\| b`'));
	assert.ok(translated.content.includes('https://example.com/a?q=1&b=2'));
	assert.equal(translated.data.locale, 'en-gb');
	assert.equal(translated.data.translationSchemaVersion, 'markdown-xml-v3');
	assert.ok(
		(await requests())
			.filter((row) => row.tag_handling === 'xml')
			.every((row) => row.target_lang === 'EN-GB' && row.source_lang === 'EN')
	);
	const before = await read(output);
	const calls = (await requests()).length;
	run('forbid');
	assert.equal((await requests()).length, calls);
	await source('Updated paragraph with `protectedCode` and another paragraph.');
	for (const mode of [
		'missing-body',
		'invalid-text',
		'empty-text',
		'extra-body',
		'missing-fragment',
		'corrupt-token'
	]) {
		run(mode, false);
		assert.equal(await read(output), before, `${mode} must preserve the previous translation`);
	}
	run();
	assert.notEqual(await read(output), before, 'An updated source must regenerate translations');
	let current = matter(await read(output));
	await write(
		output,
		matter.stringify(current.content, {
			...current.data,
			translationSchemaVersion: 'markdown-xml-v2'
		})
	);
	run();
	assert.equal(matter(await read(output)).data.translationSchemaVersion, 'markdown-xml-v3');

	// Large fenced code is kept locally, including CRLF and nested shorter fences.
	const code =
		'````js\r\n' + 'const CODE_SENTINEL = "😀 안녕하세요";\r\n'.repeat(6000) + '```\r\n````';
	await source('Before code.\n\n' + code + '\n\nAfter code.');
	await write('requests.jsonl', '');
	run();
	assert.ok(matter(await read(output)).content.includes(code));
	assert.ok(
		(await requests()).every((row) => row.text.every((text) => !text.includes('CODE_SENTINEL')))
	);

	// Multi-request Unicode/XML-heavy prose and long individual fields retain ordering.
	const large =
		'한국어 😀 & < > " 문장입니다. '.repeat(18000) + '[Reference](https://example.com/kept)';
	await source(large);
	await write('requests.jsonl', '');
	const previous = await read(output);
	run('late-missing-body', false);
	assert.equal(
		await read(output),
		previous,
		'Failure after a successful batch must not save partial content'
	);
	run();
	assert.equal(matter(await read(output)).content.trim(), large);
	assert.ok((await requests()).filter((row) => row.tag_handling === 'xml').length > 2);

	// More than 50 taxonomy labels exercise the API text-count bound too.
	await source('Taxonomy text count.', { tags: Array.from({ length: 75 }, (_, i) => `Tag${i}`) });
	run();
	await source('Explicit locale override.');
	await write('requests.jsonl', '');
	run('identity', true, { DEEPL_TARGET_LANG_EN_GB: 'EN-US' });
	assert.ok(
		(await requests())
			.filter((row) => row.tag_handling === 'xml')
			.every((row) => row.target_lang === 'EN-US')
	);
	console.log(
		'DeepL post regressions passed: GFM tables, incomplete responses, protected and long code, UTF-8 batching, locale variants, freshness and atomic post preservation.'
	);
} finally {
	await rm(fixture, { recursive: true, force: true });
}
