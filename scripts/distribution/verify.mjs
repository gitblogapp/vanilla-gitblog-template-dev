import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { exportTemplate } from './export.mjs';
const archive = path.resolve(process.argv[2] || 'template-distribution.tar');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'gitblog-distribution-'));
try {
	const output = exportTemplate(path.join(temporary, 'template'));
	// Archive the clean source before installing dependencies/building. Upload only after verification passes.
	execFileSync('tar', ['-cf', archive, '-C', output, '.']);
	execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: output, stdio: 'inherit' });
	execFileSync('npm', ['run', 'update:check'], {
		cwd: output,
		stdio: 'inherit',
		env: { ...process.env, PUBLIC_SITE_URL: 'https://template-preview.example.com' }
	});
	console.log(`Validated user distribution: ${archive}`);
} catch (error) {
	fs.rmSync(archive, { force: true });
	throw error;
} finally {
	fs.rmSync(temporary, { recursive: true, force: true });
}
