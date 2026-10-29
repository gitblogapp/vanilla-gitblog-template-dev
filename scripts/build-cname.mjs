import { writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from './lib/env.mjs';
import { siteAddress } from './lib/site-config.mjs';

loadEnvFile(new URL('../.env.production', import.meta.url));
const { cname } = siteAddress(process.env.PUBLIC_SITE_URL);
const output = fileURLToPath(new URL('../build/CNAME', import.meta.url));
// Only the build output changes; source files remain untouched during verification.
if (cname && process.env.GITBLOG_DEPLOY_PROVIDER !== 'cloudflare') await writeFile(output, `${cname}\n`);
else await rm(output, { force: true });
