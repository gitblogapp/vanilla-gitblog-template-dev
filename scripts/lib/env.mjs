import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { siteDefaults } from './site-settings.mjs';

// Shared precedence for renderer, authoring, translations and CI.
export const loadEnvFile = (filePath) => {
  const file = filePath instanceof URL ? fileURLToPath(filePath) : path.resolve(filePath);
  if (existsSync(file)) {
    for (const [key, value] of Object.entries(parseEnv(readFileSync(file, 'utf8'))))
      if (process.env[key] === undefined) process.env[key] = value;
  }
  if (path.basename(file) === '.env.production') {
    for (const [key, value] of Object.entries(siteDefaults(path.dirname(file), process.env)))
      if (process.env[key] === undefined) process.env[key] = value;
  }
};
