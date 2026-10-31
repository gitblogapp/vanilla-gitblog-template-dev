import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { exportTemplate, config } from '../scripts/distribution/export.mjs';
import { publish, nextVersion } from '../scripts/distribution/publish.mjs';

test('exports a clean user template and publishes resolvable stable revisions idempotently', () => {
	const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'template-export-test-'));
	const git = (args, cwd = temp) =>
		execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
	try {
		const output = exportTemplate(path.join(temp, 'output'));
		for (const name of [
			'tests',
			'node_modules',
			'.preview',
			'scripts/distribution',
			'eslint.config.js',
			'.github/workflows/release-template.yml',
			'.github/workflows/test-history.yml'
		])
			assert.ok(!fs.existsSync(path.join(output, name)), name);
		const pkg = JSON.parse(fs.readFileSync(path.join(output, 'package.json')));
		assert.ok(
			!Object.keys(pkg.scripts).some((name) => /^(test|release|distribution)(:|$)/.test(name))
		);
		assert.ok(!Object.values(pkg.scripts).some((value) => value.includes('tests/')));
		for (const dependency of config.omitDependencies)
			assert.equal(pkg.devDependencies[dependency], undefined);
		for (const name of [
			'.env.production',
			'.pages.yml',
			'AGENTS.md',
			'scripts/tts/generate.py',
			'.github/workflows/validate-update.yml',
			'.gitblog/update-policy.json',
			'scripts/sync-giscus-discussions.mjs'
		])
			assert.ok(fs.existsSync(path.join(output, name)), name);
		assert.ok(
			!fs
				.readFileSync(path.join(output, '.github/workflows/validate-update.yml'), 'utf8')
				.includes('test:')
		);
		const policy = JSON.parse(fs.readFileSync(path.join(output, '.gitblog/update-policy.json')));
        assert.ok(policy.preserve.includes('README.md'));
        assert.ok(policy.preserve.includes('.gitblog/user-instructions.md'));
        for (const file of config.excludeFiles) assert.ok(!fs.existsSync(path.join(output, file)), file);
        assert.equal(fs.readFileSync(path.join(output, 'README.md'), 'utf8'), fs.readFileSync(new URL('../distribution/README.md', import.meta.url), 'utf8'));
        // Owner edits and even removal must not break the authoring harness.
        const context = () => JSON.parse(execFileSync(process.execPath, ['scripts/authoring.mjs', 'context'], { cwd: output, encoding: 'utf8' }));
        fs.symlinkSync(path.resolve('node_modules'), path.join(output, 'node_modules'), 'dir');
        try {
            const before = context();
            fs.writeFileSync(path.join(output, 'README.md'), '# Completely custom owner README\n');
            assert.deepEqual(context(), before);
            fs.unlinkSync(path.join(output, 'README.md'));
            assert.deepEqual(context(), before);
        } finally {
            fs.unlinkSync(path.join(output, 'node_modules'));
            fs.copyFileSync(new URL('../distribution/README.md', import.meta.url), path.join(output, 'README.md'));
        }
        assert.throws(() => exportTemplate(output), /new/);
		const remote = path.join(temp, 'remote.git'),
			seed = path.join(temp, 'seed');
		git(['init', '--bare', '--initial-branch=main', remote]);
		git(['clone', remote, seed]);
		git(['config', 'user.name', 'test'], seed);
		git(['config', 'user.email', 'test@example.com'], seed);
		fs.writeFileSync(path.join(seed, 'old-development-test.txt'), 'remove me');
		fs.mkdirSync(path.join(seed, '.gitblog'));
		fs.writeFileSync(path.join(seed, '.gitblog/release.json'), JSON.stringify({schemaVersion:1, version:'2.0.2', revision:'b'.repeat(40)}));
		git(['add', '.'], seed);
		git(['commit', '-m', 'initial'], seed);
		git(['push', 'origin', 'main'], seed);
		git(['tag', 'v1.0.0'], seed);
		git(['push', 'origin', 'refs/tags/v1.0.0'], seed);
		const historicalTag = git(['rev-parse', 'refs/tags/v1.0.0'], remote);
		const first = publish(output, remote);
		assert.equal(first.version, '1.0.0');
		const published = JSON.parse(git(['show', 'main:.gitblog/release.json'], remote));
		assert.deepEqual(published, first);
		assert.equal(first.channel, 'stable');
		assert.equal(git(['rev-parse', 'refs/tags/v1.0.0'], remote), historicalTag);
		assert.equal(git(['rev-parse', 'refs/tags/stable/v1.0.0'], remote), git(['rev-parse', 'main'], remote));
		assert.equal(pkg.version, '1.0.0');
		assert.ok(git(['ls-tree', '--name-only', first.revision], remote).includes('src'));
		assert.ok(
			!git(['ls-tree', '--name-only', 'main'], remote).includes('old-development-test.txt')
		);
		const head = git(['rev-parse', 'main'], remote);
		publish(output, remote);
		assert.equal(git(['rev-parse', 'main'], remote), head);
		const provenance = path.join(output, '.gitblog/distribution.json');
		const data = JSON.parse(fs.readFileSync(provenance));
		data.sourceRevision = 'a'.repeat(40);
		fs.writeFileSync(provenance, JSON.stringify(data));
		assert.equal(publish(output, remote).version, '1.0.1');
		assert.equal(nextVersion('1.14.4', '2.0.0'), '2.0.0');
		assert.equal(nextVersion('2.3.4', '2.0.0'), '2.3.5');
	} finally {
		fs.rmSync(temp, { recursive: true, force: true });
	}
});
