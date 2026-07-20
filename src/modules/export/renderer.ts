// Dev-mode substitution boundary (docs/roadmap/demo-brief.md): document
// rendering (integration-contracts.md § Document Render Job) sits behind this
// interface. When pandoc is on PATH the real converter runs (md → docx/pdf;
// pdf additionally needs a pdf engine). When it is not, the DocRenderStub
// produces an HTML artifact through the same src/lib/markdown pipeline and
// reports converterWarnings — degraded but visible, never a silent failure.

export interface RenderInput {
  markdown: string;
  title: string;
  format: "docx" | "pdf";
}

export interface RenderResult {
  body: Buffer;
  contentType: string;
  /** File extension of the produced artifact, without the dot. */
  extension: string;
  /** Contract output field: converter warnings, empty when clean. */
  converterWarnings: string[];
}

export interface DocumentRenderer {
  render(input: RenderInput): Promise<RenderResult>;
}

import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { markdownToHtml } from "@/lib/markdown-core";

const run = promisify(execFile);

function onPath(cmd: string, args: string[] = ["--version"]): boolean {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Checked once at startup (module load). pdf needs pandoc AND a pdf engine;
// docx needs pandoc alone — engine missing means "unavailable for pdf only".
const PDF_ENGINES = ["tectonic", "typst", "weasyprint", "wkhtmltopdf", "xelatex", "pdflatex"];
const pandocAvailable = onPath("pandoc");
const pdfEngine = pandocAvailable ? PDF_ENGINES.find((e) => onPath(e)) : undefined;

/** Which formats the real converter can produce right now (health surface). */
export function rendererAvailability(): { pandoc: boolean; pdfEngine: string | null } {
  return { pandoc: pandocAvailable, pdfEngine: pdfEngine ?? null };
}

const CONTENT_TYPES: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

class PandocRenderer implements DocumentRenderer {
  async render({ markdown, format }: RenderInput): Promise<RenderResult> {
    const dir = await mkdtemp(path.join(tmpdir(), "wt-render-"));
    try {
      const src = path.join(dir, "input.md");
      const out = path.join(dir, `output.${format}`);
      await writeFile(src, markdown, "utf8");
      const args = ["--from", "markdown", src, "-o", out];
      if (format === "pdf" && pdfEngine) args.push(`--pdf-engine=${pdfEngine}`);
      const { stderr } = await run("pandoc", args);
      return {
        body: await readFile(out),
        contentType: CONTENT_TYPES[format],
        extension: format,
        converterWarnings: stderr.trim() ? [stderr.trim()] : [],
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

class DocRenderStub implements DocumentRenderer {
  async render({ markdown, title }: RenderInput): Promise<RenderResult> {
    const html = [
      `<!doctype html>`,
      `<html lang="vi"><head><meta charset="utf-8">`,
      `<title>${title.replace(/</g, "&lt;")}</title>`,
      `<style>body{font-family:system-ui,sans-serif;max-width:44rem;margin:2rem auto;padding:0 1rem;line-height:1.6}</style>`,
      `</head><body>`,
      markdownToHtml(markdown),
      `</body></html>`,
    ].join("\n");
    return {
      body: Buffer.from(html, "utf8"),
      contentType: "text/html; charset=utf-8",
      extension: "html",
      converterWarnings: ["stub: pandoc unavailable"],
    };
  }
}

const pandoc = new PandocRenderer();
const stub = new DocRenderStub();

/** Best renderer for the requested format given what is installed. */
export function rendererFor(format: "docx" | "pdf"): DocumentRenderer {
  if (!pandocAvailable) return stub;
  if (format === "pdf" && !pdfEngine) return stub;
  return pandoc;
}
