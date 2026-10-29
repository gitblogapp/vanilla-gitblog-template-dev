import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const config = JSON.parse(
	fs.readFileSync(new URL('../../distribution/config.json', import.meta.url), 'utf8')
);
export function nextVersion(previous, minimum) {
	const parse = (v) => {
		if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(v))
			throw new Error('Invalid version');
		return v.split('.').map(Number);
	};
	const floor = parse(minimum);
	if (!previous) return minimum;
	const prior = parse(previous);
	const next = [prior[0], prior[1], prior[2] + 1];
	for (let i = 0; i < 3; i++) {
		if (floor[i] > next[i]) return minimum;
		if (floor[i] < next[i]) return next.join('.');
	}
	return minimum;
}
export function publish(payload, remote = `https://github.com/${config.repository}.git`) {
	const provenance = JSON.parse(
		fs.readFileSync(path.join(payload, '.gitblog/distribution.json'), 'utf8')
	);
	if (
		provenance.repository !== config.repository ||
		provenance.sourceRepository !== config.developmentRepository ||
		!/^[a-f0-9]{40}$/.test(provenance.sourceRevision)
	)
		throw new Error('Invalid distribution provenance');
	if (
		fs.existsSync(path.join(payload, '.git')) ||
		fs.existsSync(path.join(payload, '.gitblog/release.json'))
	)
		throw new Error('Unexpected artifact Git/release metadata');
	const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'gitblog-publish-'));
	const target = path.join(temp, 'repository');
	const run = (args, cwd = target) =>
		execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
	try {
		run(['clone', '--branch', 'main', '--single-branch', remote, target], temp);
		let previous = null,
			oldSource = null;
		const release = path.join(target, '.gitblog/release.json');
		if (fs.existsSync(release)) previous = JSON.parse(fs.readFileSync(release, 'utf8'));
		const source = path.join(target, '.gitblog/distribution.json');
		if (fs.existsSync(source)) oldSource = JSON.parse(fs.readFileSync(source, 'utf8'));
		if (oldSource?.sourceRevision === provenance.sourceRevision) {
			console.log('This development commit is already published.');
			return previous;
		}
		const version = nextVersion(previous?.version, config.minimumVersion);
		run(['config', 'user.name', 'gitblog-template-bot']);
		run(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
		run(['rm', '-r', '--ignore-unmatch', '.']);
		fs.cpSync(payload, target, { recursive: true, errorOnExist: false });
		run(['add', '--all']);
		run(['commit', '-m', `chore: publish template ${version} from ${provenance.sourceRevision}`]);
		const revision = run(['rev-parse', 'HEAD']);
		const metadata = { schemaVersion: 1, version, revision };
		fs.writeFileSync(release, JSON.stringify(metadata, null, 2) + '\n');
		run(['add', '.gitblog/release.json']);
		run(['commit', '-m', `chore: record stable template ${version}`]);
		run(['tag', `v${version}`]);
		// Both the content and its stable pointer become visible together. Never force-push.
		run(['push', '--atomic', 'origin', 'HEAD:main', `refs/tags/v${version}`]);
		console.log(
			JSON.stringify({
				...metadata,
				repository: config.repository,
				sourceRevision: provenance.sourceRevision
			})
		);
		return metadata;
	} finally {
		fs.rmSync(temp, { recursive: true, force: true });
	}
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	if (!process.argv[2])
		throw new Error('Usage: node scripts/distribution/publish.mjs <validated-payload>');
	const source = JSON.parse(
		fs.readFileSync(path.join(process.argv[2], '.gitblog/distribution.json'), 'utf8')
	);
	if (
		!process.env.EXPECTED_SOURCE_REVISION ||
		source.sourceRevision !== process.env.EXPECTED_SOURCE_REVISION
	)
		throw new Error('Artifact does not match the verified workflow revision');
	publish(path.resolve(process.argv[2]));
}
