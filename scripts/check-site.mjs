import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const walk = (directory) =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    );
const files = ["src", "scripts", "tests"]
  .filter((directory) => fs.existsSync(directory))
  .flatMap(walk)
  .filter((file) => /\.(mjs|js)$/.test(file));
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(`${file}: ${result.stderr}`);
}
if (["src", "scripts"].flatMap(walk).some((file) => /\.(tsx?|jsx)$/.test(file)))
  throw new Error("Template source must be plain JavaScript and HTML.");
console.log(
  `Syntax checked ${files.length} JavaScript files. No JSX/TypeScript renderer or UI framework.`,
);
