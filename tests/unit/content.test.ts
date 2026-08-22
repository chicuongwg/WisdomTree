import assert from "node:assert/strict";
import { foldName } from "@/lib/mention-fold";
import { inlineTokens, markdownToHtml, parseBlocks } from "@/lib/markdown-core";
import { extractionDisplay, nextActionFor } from "@/lib/source-status";
import {
  backlinkContext,
  buildWikiIndex,
  excerpt,
  normalizeTitle,
  parseWikiLinks,
  wikiTargetKeys,
} from "@/lib/wikilink";

export function run() {
  assert.deepEqual(parseBlocks("# Title\n\nFirst\nline\n\n- one\n* two"), [
    { type: "h1", text: "Title" },
    { type: "p", text: "First line" },
    { type: "ul", items: ["one", "two"] },
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
    "<h1>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</h1>\n" +
      "<p><strong>safe &amp; sound</strong></p>",
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

  assert.deepEqual(extractionDisplay("processed", false), {
    label: "Chưa đọc được nội dung",
    tone: "no_source",
  });
  assert.equal(
    nextActionFor({ storageState: "stored", extractionStatus: "pending" }),
    "reading",
  );
  assert.equal(
    nextActionFor({ storageState: "archived", extractionStatus: "pending", promoted: true }),
    "archived",
  );
  assert.equal(
    nextActionFor({ storageState: "stored", extractionStatus: "processed", promoted: true }),
    "promoted",
  );
}
