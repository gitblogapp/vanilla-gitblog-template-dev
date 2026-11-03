import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createLiveReader,
  waitForDeployment,
  networkFailure,
} from '../scripts/lib/discovery-live.mjs';
import { auditDiscovery } from '../scripts/lib/discovery-audit.mjs';

const manifest = {
  siteUrl: 'https://example.com/notes',
  buildCommit: 'current',
  pages: [],
  policy: { crawlers: [], llms: true },
};
const response = (status, text = '', headers = {}) => new Response(text, { status, headers });
const ready = () => ({ status: 200, text: JSON.stringify(manifest) });
function clock() {
  let time = 0;
  return {
    now: () => time,
    wait: async (ms) => {
      time += ms;
    },
  };
}

test('readiness survives DNS propagation, 404 and a stale build before accepting the exact manifest', async () => {
  const states = [
    { status: 0, error: 'ENOTFOUND' },
    { status: 404 },
    { status: 200, text: '{"buildCommit":"old"}' },
    ready(),
  ];
  const notices = [];
  const result = await waitForDeployment(
    manifest,
    async (url) => {
      assert.equal(url, 'https://example.com/notes/.well-known/ai-discovery.json');
      return states.shift();
    },
    { ...clock(), waitMs: 20000, onRetry: (message) => notices.push(message) },
  );
  assert.equal(result.ready, true);
  assert.equal(result.attempts, 4);
  assert.equal(notices.length, 3);
});

test('permanent DNS failure has a bounded deadline and does not claim article checks ran', async () => {
  const result = await waitForDeployment(
    manifest,
    async () => ({
      status: 0,
      error: networkFailure(new Error('fetch failed', { cause: { code: 'ENOTFOUND' } })),
    }),
    { ...clock(), waitMs: 10000 },
  );
  assert.equal(result.ready, false);
  assert.equal(result.attempts, 2);
  assert.match(result.detail, /ENOTFOUND/);
  assert.match(result.detail, /checks were not run/);
});

test('stale manifests never pass just because HTTP is 200; zero wait probes once', async () => {
  for (const text of ['<html>fallback</html>', '{"buildCommit":"old"}']) {
    const result = await waitForDeployment(manifest, async () => ({ status: 200, text }), {
      ...clock(),
      waitMs: 0,
    });
    assert.equal(result.ready, false);
    assert.equal(result.attempts, 1);
    assert.match(result.detail, /does not match/);
  }
});

test('403 and redirects fail immediately rather than changing domains or hiding a WAF block', async () => {
  for (const status of [301, 302, 401, 403]) {
    const result = await waitForDeployment(manifest, async () => ({ status }), {
      ...clock(),
      waitMs: 180000,
    });
    assert.equal(result.ready, false);
    assert.equal(result.attempts, 1);
    assert.match(result.detail, new RegExp(`HTTP ${status}`));
  }
});

test('reader retries transient failures, preserves user agent and never disables HTTPS verification', async () => {
  const options = [];
  const waits = [];
  let attempt = 0;
  const reader = createLiveReader(manifest.siteUrl, {
    wait: async (ms) => waits.push(ms),
    fetchImpl: async (url, init) => {
      assert.equal(url.origin, 'https://example.com');
      options.push(init);
      attempt++;
      if (attempt === 1) throw new Error('fetch failed', { cause: { code: 'ECONNRESET' } });
      return attempt === 2 ? response(503) : response(200, 'OK');
    },
  });
  assert.equal((await reader.read('https://example.com/notes/', 'OAI-SearchBot')).status, 200);
  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(reader.failures.size, 0);
  for (const init of options) {
    assert.equal(init.headers['User-Agent'], 'OAI-SearchBot');
    assert.equal(init.redirect, 'manual');
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.dispatcher, undefined);
  }
});

test('permanent TLS failures retain actionable codes without raw messages or secrets', async () => {
  const reader = createLiveReader(manifest.siteUrl, {
    wait: async () => {},
    fetchImpl: async () => {
      throw new Error('secret-token', { cause: { code: 'ERR_TLS_CERT_ALTNAME_INVALID' } });
    },
  });
  const result = await reader.read('https://example.com/notes/', 'ClaudeBot');
  assert.equal(result.status, 0);
  assert.match(result.error, /ERR_TLS_CERT_ALTNAME_INVALID/);
  assert.match(result.error, /TLS verification/);
  assert.doesNotMatch(JSON.stringify([...reader.failures.values()]), /secret-token/);
  assert.equal(reader.failures.size, 1);
  assert.match(
    networkFailure(new AggregateError([{ code: 'ETIMEDOUT' }, { code: 'ENETUNREACH' }])),
    /ETIMEDOUT, ENETUNREACH/,
  );
});

test('reader refuses alternate origins/HTTP and does not retry definitive 404, 403 or redirects', async () => {
  let calls = 0;
  const reader = createLiveReader(manifest.siteUrl, {
    fetchImpl: async () => {
      calls++;
      return response(403);
    },
    wait: async () => {
      assert.fail('must not retry');
    },
  });
  assert.throws(() => createLiveReader('http://example.com'), /HTTPS/);
  assert.throws(() => createLiveReader('https://user:secret@example.com'), /credentials/);
  for (const url of [
    'http://example.com/',
    'https://other.example/',
    'https://user:secret@example.com/',
  ])
    await assert.rejects(reader.read(url), /HTTPS origin/);
  assert.equal(calls, 0);
  for (const status of [404, 403, 301]) {
    const single = createLiveReader(manifest.siteUrl, {
      fetchImpl: async () => response(status),
      wait: async () => assert.fail('must not retry'),
    });
    assert.equal((await single.read(manifest.siteUrl)).status, status);
  }
});

test('a published empty blog passes its full live audit after readiness', async () => {
  const f = {
    ...manifest,
    siteUrl: 'https://example.com',
    policy: { crawlers: [{ agent: 'Googlebot', allowed: true }], llms: true },
  };
  const reader = createLiveReader(f.siteUrl, {
    fetchImpl: async (url) => {
      if (url.pathname === '/.well-known/ai-discovery.json')
        return response(200, JSON.stringify(f));
      if (url.pathname === '/robots.txt')
        return response(200, 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml');
      if (url.pathname === '/sitemap.xml') return response(200, '<urlset></urlset>');
      return response(200, '# Blog');
    },
  });
  assert.equal((await waitForDeployment(f, reader.request, { waitMs: 0 })).ready, true);
  const report = await auditDiscovery(f, reader.read, { live: true });
  assert.equal(report.failures, 0);
  assert.equal(report.totalArticles, 0);
});

// Exercise the actual command/report/exit contract without external network access.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('CLI writes an actionable failed report and summary instead of eleven derived content failures', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'discovery-cli-'));
  try {
    mkdirSync(path.join(root, 'build/.well-known'), { recursive: true });
    writeFileSync(path.join(root, 'build/.well-known/ai-discovery.json'), JSON.stringify(manifest));
    const preload = path.join(root, 'network.mjs');
    writeFileSync(
      preload,
      `globalThis.fetch = async () => { throw new Error('private-error-detail', { cause: { code:'ENOTFOUND' } }); };`,
    );
    const summary = path.join(root, 'summary.md');
    const run = spawnSync(
      process.execPath,
      [
        '--import',
        preload,
        fileURLToPath(new URL('../scripts/audit-discovery.mjs', import.meta.url)),
        '--live',
        '--wait-seconds=0',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_STEP_SUMMARY: summary },
      },
    );
    assert.equal(run.status, 1, run.stderr);
    const report = JSON.parse(readFileSync(path.join(root, 'discovery-audit-live.json'), 'utf8'));
    assert.equal(report.failures, 1);
    assert.equal(report.checks[0].check, 'deployment-readiness');
    assert.equal(report.sampledArticles, 0);
    assert.match(run.stdout, /ENOTFOUND/);
    assert.match(readFileSync(summary, 'utf8'), /https:\/\/example.com\/notes/);
    assert.doesNotMatch(run.stdout, /private-error-detail|FAIL sitemap|FAIL llms/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
