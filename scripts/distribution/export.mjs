import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
export const config = JSON.parse(
	fs.readFileSync(path.join(root, 'distribution/config.json'), 'utf8')
);
export function exportTemplate(destination) {
	const output = path.resolve(destination);
	if (output === root || root.startsWith(output + path.sep) || fs.existsSync(output))
		throw new Error('Export requires a new, non-ancestor destination');
	const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
		cwd: root,
		encoding: 'utf8'
	}).trim();
	const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
		.split('\0')
		.filter(Boolean);
	const included = (file) =>
		config.files.includes(file) ||
		config.metadata.includes(file) ||
		config.directories.some((dir) => file.startsWith(dir + '/')) ||
		config.workflows.some((name) => file === `.github/workflows/${name}`);
	fs.mkdirSync(output, { recursive: true });
	for (const file of tracked.filter(included)) {
		if (file.startsWith('scripts/distribution/') || config.excludeFiles.includes(file)) continue;
		if (!fs.existsSync(path.join(root, file))) continue;
		if (fs.lstatSync(path.join(root, file)).isSymbolicLink())
			throw new Error(`Symlink not allowed: ${file}`);
		if (
			file
				.split('/')
				.some((part) => ['node_modules', '.git', '.cache', '__pycache__'].includes(part)) ||
			/\.(?:pem|key|pyc)$/.test(file)
		)
			throw new Error(`Unexpected export file: ${file}`);
		if (/^content\/(?:posts|translations)\/.*\.md$/.test(file))
			throw new Error('Publish an empty template, without example posts');
		fs.mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
		fs.copyFileSync(path.join(root, file), path.join(output, file));
	}
	const copy = (from, to) => {
		fs.mkdirSync(path.dirname(path.join(output, to)), { recursive: true });
		fs.copyFileSync(path.join(root, from), path.join(output, to));
	};
	copy('distribution/README.md', 'README.md');
	copy('distribution/AGENTS.md', 'AGENTS.md');
	copy('distribution/validate-update.yml', '.github/workflows/validate-update.yml');
	const pkg = JSON.parse(fs.readFileSync(path.join(output, 'package.json'), 'utf8'));
	for (const key of Object.keys(pkg.scripts))
		if (/^(?:test(?::|$)|distribution:|release:)/.test(key) || ['lint', 'format'].includes(key))
			delete pkg.scripts[key];
	Object.assign(pkg.scripts, config.scripts);
	for (const key of config.omitDependencies) delete pkg.devDependencies[key];
	fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
	const lock = JSON.parse(fs.readFileSync(path.join(output, 'package-lock.json'), 'utf8'));
	lock.packages[''].devDependencies = pkg.devDependencies;
	fs.writeFileSync(path.join(output, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
	// npm resolves the pruned dependency graph against the existing lock, without executing lifecycle scripts.
	execFileSync(
		'npm',
		['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'],
		{ cwd: output, stdio: 'inherit' }
	);
	fs.writeFileSync(
		path.join(output, '.gitblog/distribution.json'),
		JSON.stringify(
			{
				schemaVersion: 1,
				repository: config.repository,
				sourceRepository: config.developmentRepository,
				sourceRevision: revision
			},
			null,
			2
		) + '\n'
	);
	return output;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	if (!process.argv[2])
		throw new Error('Usage: node scripts/distribution/export.mjs <new-output-directory>');
	console.log(exportTemplate(process.argv[2]));
}
