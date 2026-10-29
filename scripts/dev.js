import { watch } from "node:fs";
import { spawn } from "node:child_process";
let building = false,
  queued = false,
  stopping = false,
  child,
  preview;
let timer;
async function rebuild() {
  if (building) {
    queued = true;
    return;
  }
  building = true;
  const code = await new Promise((resolve) => {
    child = spawn("npm", ["run", "build"], { stdio: "inherit" });
    child.once("error", (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.once("exit", resolve);
  });
  building = false;
  if (!code && !preview && !stopping)
    preview = spawn(
      process.execPath,
      ["scripts/preview.mjs", ...process.argv.slice(2)],
      { stdio: "inherit" },
    );
  if (!code)
    console.log("Static build refreshed. Reload your browser to see changes.");
  if (queued && !stopping) {
    queued = false;
    await rebuild();
  }
}
const watchers = [
  "src",
  "content",
  "static",
  "scripts",
  ".gitblog",
  ".env.production",
].map((file) =>
  watch(file, { recursive: true }, (_, name) => {
    if (
      name?.includes("work/") ||
      name?.endsWith(".pyc") ||
      name?.includes("__pycache__")
    )
      return;
    clearTimeout(timer);
    timer = setTimeout(() => void rebuild(), 180);
  }),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopping = true;
    clearTimeout(timer);
    watchers.forEach((w) => w.close());
    child?.kill();
    preview?.kill();
  });
await rebuild();
