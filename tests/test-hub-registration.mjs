import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { load } from 'js-yaml';

for (const [file, upstream] of [['deploy.yml', 'build'], ['sync-hub.yml', 'settings']]) {
  test(`${file}: feed participation alone enables the trusted registration job`, () => {
    const workflow = load(readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8'));
    const job = workflow.jobs.register;
    const output = upstream === 'build' ? 'hub_enabled' : 'enabled';
    assert.equal(job.if, `needs.${upstream}.outputs.${output} == 'true'`);
    for (const enabled of ['true', 'false', '']) {
      for (const vars of [{}, { GITBLOG_OFFICIAL_INTEGRATION: 'false' }, { GITBLOG_OFFICIAL_INTEGRATION: 'true' }]) {
        const needs = { [upstream]: { outputs: { [output]: enabled } } };
        assert.equal(Function('needs', 'vars', `return (${job.if});`)(needs, vars), enabled === 'true');
      }
    }
    assert.equal(job.uses, 'gitblogapp/svelte-gitblog-template/.github/workflows/register-blog.yml@032838d5374d380d9bb87c278b04addf21dea406');
    assert.equal(job.with.hub_url, '${{ needs.' + upstream + '.outputs.hub_url }}');
    assert.equal((job.permissions || workflow.permissions)['id-token'], 'write');
    assert.ok([job.needs].flat().includes(upstream));
    if (file === 'deploy.yml') assert.ok(job.needs.includes('deploy'));
  });
}
