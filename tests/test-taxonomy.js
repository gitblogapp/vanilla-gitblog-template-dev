import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  normalizeTerm,
  resolvePostTaxonomy,
  validateTaxonomy
} from "../scripts/lib/taxonomy-core.js";
import {
  translateTaxonomy,
  collectTaxonomy,
  saveTaxonomy,
  missingTaxonomy
} from "../scripts/lib/taxonomy.js";
const dictionary = () => ({
  schemaVersion: 1,
  sourceLocale: "ko",
  categories: [
    {
      id: "market",
      source: "\uC2DC\uC7A5 \uBD84\uC11D",
      labels: { ko: "\uC2DC\uC7A5 \uBD84\uC11D", en: "Market Analysis" },
      aliases: []
    },
    {
      id: "different",
      source: "\uC2DC\uC7A5\uBD84\uC11D",
      labels: { ko: "\uC2DC\uC7A5\uBD84\uC11D", en: "Market Analysis" },
      aliases: []
    }
  ],
  tags: [
    {
      id: "btc-ko",
      source: "\uBE44\uD2B8\uCF54\uC778",
      labels: { ko: "\uBE44\uD2B8\uCF54\uC778", en: "Bitcoin", ja: "\u30D3\u30C3\u30C8\u30B3\u30A4\u30F3" },
      aliases: ["BTC"]
    },
    { id: "btc-en", source: "bitcoin", labels: { ko: "bitcoin", en: " bitcoin " }, aliases: [] },
    {
      id: "cash",
      source: "\uBE44\uD2B8\uCF54\uC778 \uCE90\uC2DC",
      labels: { ko: "\uBE44\uD2B8\uCF54\uC778 \uCE90\uC2DC", en: "Bitcoin Cash" },
      aliases: []
    }
  ]
});
test("merges only equivalent English tags and publishes all group aliases across locales", () => {
  const data = dictionary();
  validateTaxonomy(data);
  const first = resolvePostTaxonomy(
    data,
    "\uC2DC\uC7A5 \uBD84\uC11D",
    ["\uBE44\uD2B8\uCF54\uC778", "Bitcoin", "\uBE44\uD2B8\uCF54\uC778 \uCE90\uC2DC"],
    "en"
  );
  assert.equal(first.tags.length, 2);
  assert.equal(first.tags[0].id, "btc-ko");
  assert.equal(first.tags[0].label, "Bitcoin");
  for (const query of ["bitcoin", "\uBE44\uD2B8\uCF54\uC778", "\u30D3\u30C3\u30C8\u30B3\u30A4\u30F3", "btc"])
    assert.ok(first.tags[0].aliases.includes(query));
  assert.equal(resolvePostTaxonomy(data, "\uC2DC\uC7A5\uBD84\uC11D", ["bitcoin"], "ko").category.id, "different");
  assert.equal(resolvePostTaxonomy(data, "\uC2DC\uC7A5 \uBD84\uC11D", ["bitcoin"], "ko").tags[0].label, "\uBE44\uD2B8\uCF54\uC778");
  assert.equal(normalizeTerm(" C++ "), "c++");
  assert.notEqual(normalizeTerm("C#"), normalizeTerm("C++"));
});
test("honors separation overrides and keeps categories distinct despite identical translations", () => {
  const data = dictionary();
  data.tags[1].separate = true;
  data.tags[1].labels.en = "Bitcoin";
  const separated = resolvePostTaxonomy(data, "\uC2DC\uC7A5 \uBD84\uC11D", ["\uBE44\uD2B8\uCF54\uC778", "bitcoin"], "en");
  assert.notEqual(separated.tags[0].label, separated.tags[1].label);
  assert.equal(
    resolvePostTaxonomy(data, "\uC2DC\uC7A5 \uBD84\uC11D", ["\uBE44\uD2B8\uCF54\uC778", "bitcoin"], "en").tags.length,
    2
  );
  assert.notEqual(
    resolvePostTaxonomy(data, "\uC2DC\uC7A5 \uBD84\uC11D", [], "en").category.id,
    resolvePostTaxonomy(data, "\uC2DC\uC7A5\uBD84\uC11D", [], "en").category.id
  );
});
test("incrementally translates new terms, preserves corrected labels and IDs, and never edits posts", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "taxonomy-"));
  try {
    await mkdir(path.join(root, "content/posts"), { recursive: true });
    const post = "---\ncategory: \uC2DC\uC7A5 \uBD84\uC11D\ntags: [\uBE44\uD2B8\uCF54\uC778, bitcoin]\n---\n\uC6D0\uBB38\n";
    await writeFile(path.join(root, "content/posts/a.md"), post);
    const calls = [];
    const translate = async (texts, locale) => {
      calls.push([texts, locale]);
      return texts.map(
        (text) => locale === "ko" ? text : text === "\uC2DC\uC7A5 \uBD84\uC11D" ? "Market Analysis" : "Bitcoin"
      );
    };
    const first = await translateTaxonomy(root, "ko", ["en"], translate);
    assert.equal(calls.length, 2);
    assert.equal(missingTaxonomy(first, ["en"]).length, 0);
    first.tags[0].labels.en = "Bitcoin";
    first.tags[0].labels.ko = "\uBE44\uD2B8\uCF54\uC778 (BTC)";
    await saveTaxonomy(root, first);
    await translateTaxonomy(root, "ko", ["en"], translate);
    assert.equal(calls.length, 2);
    assert.equal((await collectTaxonomy(root, "ko")).tags[0].labels.ko, "\uBE44\uD2B8\uCF54\uC778 (BTC)");
    first.categories[0].aliases.push(first.categories[0].source);
    first.categories[0].source = "\uC2DC\uC7A5 \uB3D9\uD5A5";
    await saveTaxonomy(root, first);
    assert.equal((await collectTaxonomy(root, "ko")).categories.length, 1);
    assert.equal(await readFile(path.join(root, "content/posts/a.md"), "utf8"), post);
    await writeFile(path.join(root, "content/posts/b.md"), "---\ntags: [\uC0C8 \uD0DC\uADF8]\n---\n");
    const next = await translateTaxonomy(root, "ko", ["en"], translate);
    assert.equal(next.tags[0].id, first.tags[0].id);
    assert.deepEqual(calls[2][0], ["Notes", "\uC0C8 \uD0DC\uADF8"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("rejects malformed dictionaries and incomplete translation batches", async () => {
  const data = dictionary();
  data.tags[1].id = data.tags[0].id;
  assert.throws(() => validateTaxonomy(data));
  const root = await mkdtemp(path.join(os.tmpdir(), "taxonomy-"));
  try {
    await mkdir(path.join(root, "content/posts"), { recursive: true });
    await writeFile(path.join(root, "content/posts/a.md"), "---\ntags: [\uBE44\uD2B8\uCF54\uC778]\n---\n");
    await assert.rejects(translateTaxonomy(root, "ko", ["en"], async () => []));
    await assert.rejects(readFile(path.join(root, "content/taxonomy.json")), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("does not assume English-site inputs are already English", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "taxonomy-mixed-"));
  try {
    await mkdir(path.join(root, "content/posts"), { recursive: true });
    await writeFile(
      path.join(root, "content/posts/a.md"),
      "---\ncategory: Markets\ntags: [bitcoin, \uBE44\uD2B8\uCF54\uC778]\n---\n"
    );
    const calls = [];
    const data = await translateTaxonomy(
      root,
      "en",
      [],
      async (texts, locale) => {
        calls.push(locale);
        return texts.map((text) => text === "\uBE44\uD2B8\uCF54\uC778" ? "Bitcoin" : text);
      }
    );
    assert.deepEqual(calls, ["en"]);
    assert.equal(
      resolvePostTaxonomy(data, "Markets", ["bitcoin", "\uBE44\uD2B8\uCF54\uC778"], "en").tags.length,
      1
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
