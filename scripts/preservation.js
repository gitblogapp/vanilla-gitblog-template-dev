import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
function snapshot(root, paths) {
  const result = {};
  function visit(relative) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) return;
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) result[relative] = `symlink:${fs.readlinkSync(file)}`;
    else if (stat.isDirectory()) {
      result[`${relative}/`] = "directory";
      fs.readdirSync(file).sort().forEach((child) => visit(path.join(relative, child)));
    } else result[relative] = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  }
  paths.forEach(visit);
  return result;
}
export {
  snapshot
};
