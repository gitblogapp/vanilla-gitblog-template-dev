import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { load } from 'cheerio';
import { marked } from 'marked';
import { sourceHash, translationHash } from '../scripts/lib/authoring.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await mkdtemp(path.join(os.tmpdir(), 'gitblog-seo-content-'));
const excluded = new Set(['.git', 'node_modules', '.svelte-kit', '.astro', 'build', 'content', '.cache', 'dist', 'distribution-output']);
async function write(file, text) { const target = path.join(fixture, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, text); }
const read = file => readFile(path.join(fixture, file), 'utf8');
const seo = { question: 'What was verified?', answer: 'Verified answer <script>doNotExecute()</script>', dataAsOf: '2026-11-02', sources: [{title:'Original report',url:'https://example.com/report?a=1&b=2'}], faq:[{question:'Any limits?',answer:'Only the tested sample.'}] };
const rows = ['legacy', 'enhanced', 'draft', 'member'];
try {
  await cp(root, fixture, {recursive:true, filter:file => !path.relative(root,file).split(path.sep).some(part=>excluded.has(part))});
  await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'dir');
  await write('.gitblog/authoring.json', JSON.stringify({schemaVersion:1,translationMode:'manual'}));
  for (const [i, slug] of rows.entries()) {
    const id = `${i+1}`.repeat(8)+'-1111-4111-8111-111111111111';
    const data = {id,title:`Article ${slug}`,description:'Public summary',date:'2026-01-01',published:slug!=='draft',category:'Notes',tags:[], ...(slug==='enhanced'?{seo}:{}), ...(slug==='draft'?{seo:{answer:'DRAFT_SEO_MUST_NOT_BE_PUBLISHED'}}:{}), ...(slug==='member'?{access:'membership',membershipId:id,previewAllowed:true,tts:false}:{})};
    const body = slug === 'member' ? data.description : '## Body heading\n\nOriginal body.';
    const raw = matter.stringify(body,data), sourcePath = `content/posts/${slug}.md`;
    await write(sourcePath,raw);
    if (slug === 'draft') continue;
    const translated = matter(matter.stringify('English public body.', {...data,title:`EN ${slug}`,description:'English public summary',locale:'en',sourceLocale:'ko',sourcePath,sourceHash:sourceHash(raw),translationSource:'manual',translatedAt:'2026-11-02T00:00:00Z',...(slug==='enhanced'?{seo:{...seo,question:'Translated question',answer:'Translated verified answer'}}:{})}));
    translated.data.translationContentHash = translationHash(translated);
    await write(`content/translations/en/posts/${slug}.md`,matter.stringify(translated.content,translated.data));
  }
  const env = Object.fromEntries(Object.entries(process.env).filter(([key])=> !/^(PUBLIC_|DEEPL_|GITHUB_|SITE_BASE_PATH|NODE_OPTIONS)/.test(key)));
  Object.assign(env,{PUBLIC_SOURCE_LOCALE:'ko',PUBLIC_TRANSLATION_LOCALES:'en',PUBLIC_RELEASE_USE_TRANSLATIONS:'true',PUBLIC_SITE_URL:'https://fixture.github.io/blog',PUBLIC_SITE_OWNER:'Test Writer',PUBLIC_SITE_AUTHOR:'Test Writer',PUBLIC_AUTHOR_URL:'https://example.com/about',PUBLIC_SITE_REPOSITORY:'fixture/blog',PUBLIC_HUB_REPOSITORY:'fixture/blog',PUBLIC_GISCUS_ENABLED:'false',PUBLIC_TTS_ENABLED:'false',PUBLIC_HUB_ENABLED:'false',PUBLIC_AI_MARKDOWN_ENABLED:'true'});
  const result = spawnSync('npm',['run','build'],{cwd:fixture,env,encoding:'utf8',maxBuffer:20*1024*1024,timeout:180000});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  for (const prefix of ['', 'en/']) {
    const page = await read(`build/${prefix}blog/enhanced/index.html`), $ = load(page);
    assert.equal($('.gitblog-answer').length,1);
    assert.equal($('.gitblog-faq h3').text(),'Any limits?');
    assert.equal($('.gitblog-sources a').attr('href'),seo.sources[0].url);
    assert.equal($('.gitblog-data-as-of time').attr('datetime'),seo.dataAsOf);
    assert.equal($('.gitblog-answer script').length,0);
    const schema = $('script[type="application/ld+json"]').toArray().map(n=>JSON.parse($(n).text())).find(n=>n['@type']==='BlogPosting');
    assert.equal(schema.author['@id'],'https://fixture.github.io/blog/#author');
    assert.equal(schema.author.url,'https://example.com/about');
    assert.equal(schema.citation[0],seo.sources[0].url);
    assert.equal(schema.abstract,prefix?'Translated verified answer':seo.answer);
    assert.ok($('a[rel="author"]').toArray().some(n=>$(n).attr('href')==='https://example.com/about'));
    const md = await read(`build/${prefix}blog/enhanced/index.md`);
    assert.ok(md.includes(seo.dataAsOf) && md.includes('Only the tested sample'));
    assert.equal(load(marked.parse(matter(md).content))('a').first().attr('href'),seo.sources[0].url);
    const legacy = load(await read(`build/${prefix}blog/legacy/index.html`));
    assert.equal(legacy('.gitblog-answer,.gitblog-sources,.gitblog-faq').length,0);
    const member = await read(`build/${prefix}blog/member/index.html`);
    assert.ok(member.includes('membership-embed'));
    assert.equal(load(member)('.gitblog-answer,.gitblog-sources,.gitblog-faq').length,0);
    assert.ok(!(await read(`build/${prefix}blog/member/index.md`)).includes('Verified answer'));
  }
  const sitemap = await read('build/sitemap.xml');
  assert.ok(!sitemap.includes('/draft/'));
  await assert.rejects(read('build/blog/draft/index.html'));
  await assert.rejects(read('build/blog/draft/index.md'));
  console.log('SEO content build passed: initial HTML, Markdown parity, translated metadata, stable author identity, legacy posts, drafts and membership boundary.');
} finally { await rm(fixture,{recursive:true,force:true}); }
