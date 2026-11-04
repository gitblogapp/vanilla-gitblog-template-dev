import { buildWithCoverImages } from '@gitblogapp/cli/cover-images';

await buildWithCoverImages({
  command: process.execPath,
  args: ["scripts/build.mjs"].concat(process.argv.slice(2))
});
