import { load } from "js-yaml";
function matter(source) {
  const match = source.match(
    /^\uFEFF?---[^\S\r\n]*\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(?:\r?\n|$)/,
  );
  if (!match) throw new Error("YAML frontmatter delimited by --- is required");
  const data = load(match[1]);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Frontmatter must be a YAML object");
  return {
    data,
    content: source.slice(match[0].length),
  };
}
export { matter as default };
