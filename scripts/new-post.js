import { spawnSync } from "node:child_process";
const [slug, title] = process.argv.slice(2);
if (!slug || !title)
  throw new Error(
    "Usage: npm run posts:new -- <slug> <title>; prefer author:new with explicit description/date."
  );
const result = spawnSync(
  process.execPath,
  [
    "scripts/authoring.mjs",
    "new",
    slug,
    "--title",
    title,
    "--description",
    title,
    "--date",
    (/* @__PURE__ */ new Date()).toISOString()
  ],
  { stdio: "inherit" }
);
process.exitCode = result.status ?? 1;
