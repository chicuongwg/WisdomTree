import assert from "node:assert/strict";
import { foldName } from "@/lib/mention-fold";
import { inlineTokens, markdownToHtml, parseBlocks } from "@/lib/markdown-core";
import {
  backlinkContext,
  buildWikiIndex,
  excerpt,
  normalizeTitle,
  parseWikiLinks,
  wikiTargetKeys,
} from "@/lib/wikilink";
import { validateMarkdown } from "@/lib/markdown-validation";

export function run() {
  assert.deepEqual(parseBlocks("# Title\n\nFirst\nline\n\n- one\n* two"), [
    { type: "heading", level: 1, text: "Title" },
    { type: "p", text: "First line" },
    { type: "ul", items: [{ text: "one" }, { text: "two" }] },
  ]);
  assert.deepEqual(inlineTokens("See **bold** and [[Cây tri thức|the tree]]."), [
    { kind: "text", text: "See " },
    { kind: "bold", text: "bold" },
    { kind: "text", text: " and " },
    { kind: "wiki", target: "Cây tri thức", key: "cay tri thuc", label: "the tree" },
    { kind: "text", text: "." },
  ]);
  assert.equal(
    markdownToHtml('# <script>alert("x")</script>\n\n**safe & sound**'),
    "<h1 id=\"&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;\">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</h1>\n" +
      "<p><strong>safe &amp; sound</strong></p>",
  );
  const docs = parseBlocks(
    "## Cài đặt\n\n1. Một\n2. Hai\n\n- [x] Xong\n- [ ] Chờ\n\n```ts title=\"demo.ts\"\nconst ok = true;\n```\n\n:::warning[Chú ý]\nKhông chạy tùy ý.\n:::\n\n| A | B |\n| --- | --- |\n| 1 | 2 |",
  );
  assert.equal(docs[0].type, "heading");
  assert.equal(docs[1].type, "ol");
  assert.deepEqual(docs[2], {
    type: "ul",
    items: [{ text: "Xong", checked: true }, { text: "Chờ", checked: false }],
  });
  assert.deepEqual(docs[3], {
    type: "code",
    code: "const ok = true;",
    language: "ts",
    title: "demo.ts",
  });
  assert.equal(docs[4].type, "admonition");
  assert.equal(docs[5].type, "table");
  assert.match(markdownToHtml("[x](javascript:alert(1))"), /javascript:alert/);
  assert.doesNotMatch(markdownToHtml("[x](javascript:alert(1))"), /<a /);
  assert.match(markdownToHtml("![remote](https://example.com/a.png)"), /image-blocked/);
  assert.doesNotMatch(markdownToHtml("![remote](https://example.com/a.png)"), /<img/);
  assert.deepEqual(parseBlocks("![[Trang nội bộ]]"), [
    { type: "embed", target: "Trang nội bộ", key: "trang noi bo" },
  ]);
  assert.deepEqual(
    validateMarkdown("[[Có]] [[Thiếu]]\n\n![ảnh](https://example.com/a.png)", ["co"]).map(
      (issue) => issue.code,
    ),
    ["external_image", "broken_wiki_link"],
  );

  assert.equal(normalizeTitle("  Cây   Đời  "), "cay doi");
  assert.deepEqual(parseWikiLinks("[[A]] [[B|Bee]]"), [
    { target: "A", label: "A" },
    { target: "B", label: "Bee" },
  ]);
  assert.deepEqual(wikiTargetKeys("[[Cây Đời]] [[cay doi|duplicate]]"), ["cay doi"]);
  assert.equal(
    buildWikiIndex([
      { id: "first", title: "Cây Đời" },
      { id: "later", title: "cay doi" },
    ])["cay doi"].id,
    "first",
  );
  assert.equal(
    backlinkContext("Opening.\nSupports [[Cây Đời|the tree]]. Next.", "cay doi"),
    "Supports the tree.",
  );
  assert.equal(excerpt("# Heading\n- **Bold** and [[Node|label]]", 50), "Heading Bold and label");

  assert.equal(foldName("Phạm Thu Hương"), "pham thu huong");
  assert.equal(foldName("Đặng"), "dang");
  assert.equal(foldName("Hương").length, "Hương".length);
}
