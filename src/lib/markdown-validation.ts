import { normalizeTitle, parseWikiLinks } from "./wikilink";

export type MarkdownIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
};

export function validateMarkdown(
  content: string,
  knownTargets: Iterable<string> = [],
): MarkdownIssue[] {
  const issues: MarkdownIssue[] = [];
  const known = new Set(knownTargets);
  const lines = content.split(/\r?\n/);
  const headingIds = new Set<string>();
  let fenceOpen = false;
  let directiveDepth = 0;

  for (const line of lines) {
    if (/^```/.test(line)) fenceOpen = !fenceOpen;
    if (/^:::(?:note|tip|info|warning|danger|details|tabs)(?:\[.*\])?\s*$/.test(line))
      directiveDepth++;
    else if (line.trim() === ":::" && directiveDepth > 0) directiveDepth--;
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      const id = normalizeTitle(heading[1]);
      if (headingIds.has(id))
        issues.push({
          severity: "warning",
          code: "duplicate_heading",
          message: `Tiêu đề lặp lại: ${heading[1]}`,
        });
      headingIds.add(id);
    }
  }
  if (fenceOpen)
    issues.push({
      severity: "error",
      code: "unclosed_code_fence",
      message: "Khối mã chưa được đóng.",
    });
  if (directiveDepth)
    issues.push({
      severity: "error",
      code: "unclosed_directive",
      message: "Khối ::: chưa được đóng.",
    });
  if (/!\[[^\]]*\]\(https?:\/\//i.test(content))
    issues.push({
      severity: "error",
      code: "external_image",
      message: "Ảnh ngoài hệ thống không được phép.",
    });
  if (/\[[^\]]+\]\((?:javascript|data):/i.test(content))
    issues.push({
      severity: "error",
      code: "unsafe_link",
      message: "Liên kết dùng giao thức không an toàn.",
    });
  if (/<\/?[a-z][^>]*>/i.test(content))
    issues.push({
      severity: "warning",
      code: "raw_html",
      message: "HTML thô sẽ chỉ hiển thị như văn bản.",
    });

  for (const link of parseWikiLinks(content)) {
    if (!known.has(normalizeTitle(link.target)))
      issues.push({
        severity: "warning",
        code: "broken_wiki_link",
        message: `Chưa tìm thấy trang: ${link.target}`,
      });
  }
  return issues;
}
