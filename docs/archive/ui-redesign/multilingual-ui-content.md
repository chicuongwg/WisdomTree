# Bilingual UI and multilingual research content

## UI locale contract

Stage 17 UI chrome supports Vietnamese and English. Research content language is independent and unrestricted Unicode. Locale switching changes interface labels, dates, and accessible names; it does not translate stored research.

Layouts must tolerate at least 30–40% label expansion. Primary destinations use text, not unexplained abbreviations. Truncation is permitted only when the full label remains available through accessible name/tooltip and the action is still identifiable.

## Proposed vocabulary

| Concept | Vietnamese proposal | English | Review status |
| --- | --- | --- | --- |
| TMKT overview | Tổng quan TMKT | TMKT Overview | Ready to test |
| Projects | Dự án | Projects | Ready to test |
| My Work | Việc của tôi | My Work | Ready to test |
| People | Con người | People | **Human review:** may sound abstract; compare `Nhân vật`/`Nhân sự & nhân vật`, but those narrow identity differently. |
| Search | Tìm kiếm | Search | Ready to test |
| Notes | Ghi chú | Notes | Ready to test |
| Materials | Tư liệu | Materials | **Human review:** validate against researchers' use of `Nguồn tư liệu`. |
| Activities | Hoạt động | Activities | Ready to test |
| Tasks | Công việc | Tasks | **Human review:** distinguish from My Work without using technical wording. |
| Library | Thư viện | Library | Ready to test inside Tempo only |
| Overview | Tổng quan | Overview | Ready to test |
| Private draft | Bản nháp riêng tư | Private draft | Ready to test |
| Evidence Note | Ghi chú bằng chứng | Evidence Note | **Human review:** research-method vocabulary. |
| Synthesis Note | Ghi chú tổng hợp | Synthesis Note | **Human review:** research-method vocabulary. |
| Supporting research | Tư liệu nghiên cứu hỗ trợ | Supporting research | **Human review:** intentionally broader than bibliography. |
| Files / versions | Tệp / phiên bản | Files / versions | Ready to test |
| Physical copy | Bản vật lý | Physical copy | **Human review:** `Hiện vật/bản in` may fit particular holdings better. |
| Extracted text | Văn bản trích xuất | Extracted text | Ready to test |
| Publish publicly | Xuất bản công khai | Publish publicly | Use explicit `công khai`; avoid ambiguous `Đăng`. |
| Published, current | Đã xuất bản — cập nhật | Published — current | Needs compact-state usability test |
| Published, changes pending | Đã xuất bản — có thay đổi chưa công bố | Published — changes pending | Needs responsive test |
| TMKT Core | Thành viên nòng cốt TMKT | TMKT Core member | **Human review:** do not show raw capability name. |
| Library operator | Nhân sự vận hành thư viện | Library operator | **Human review:** distinguish from Project manager. |

## Shell expansion example

```text
VI                              EN
┌──────────────────────────┐    ┌──────────────────────────┐
│ + Tạo mới                │    │ + New                    │
│ Tổng quan TMKT           │    │ TMKT Overview            │
│ Dự án                    │    │ Projects                 │
│ Việc của tôi             │    │ My Work                  │
│ Con người                │    │ People                   │
│ Tìm kiếm                 │    │ Search                   │
└──────────────────────────┘    └──────────────────────────┘
```

Use a sidebar wide enough for the longer selected locale; do not encode destinations as `OV`, `PRJ`, or language-dependent initials.

## Typography strategy

### Application chrome

- Use a compact, highly legible system sans stack first. Proposed design token: `system-ui, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif`.
- This is a fallback strategy, not a production font commitment.
- UI labels use locale-aware casing; do not uppercase Vietnamese navigation.
- Default UI size should remain readable at browser zoom and avoid ultra-light weights.

### Research reading/editor

- Use a separate content token that permits script-appropriate fallback rather than forcing the decorative/current display face.
- Candidate strategy for later runtime testing: `"Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK JP", system-ui, sans-serif`, augmented by platform Arabic/Korean and specialist fonts that are actually available.
- Prefer `:lang(...)` and `dir`-aware overrides after a Stage 17 runtime coverage audit. Do not assume one CJK regional shape is correct for Chinese, Japanese, Korean, and historical Vietnamese contexts.
- Reading measure: approximately 65–75 Latin characters; CJK content should use an equivalent comfortable visual measure rather than a fixed character claim.
- Reading line-height: test roughly 1.65–1.8 for Latin/Vietnamese and 1.7–1.9 where dense CJK glyphs require more air. Editor defaults should remain close enough to preview to avoid reflow surprise.

### Hán-Nôm and supplementary-plane constraint

Unicode encoding does not guarantee glyph availability. Rare Han characters may use supplementary planes and require specialist fonts; Noto/system fallbacks must not be advertised as complete Hán-Nôm coverage. Before Stage 17 accepts typography:

1. identify the deployment platforms and actually available font files;
2. test a product-owner-supplied Hán-Nôm corpus including supplementary-plane characters;
3. detect and document missing-glyph/tofu behavior;
4. provide a user-visible fallback/remediation path if specialist fonts are required;
5. preserve code points through edit/save/render/copy even when a glyph is unavailable.

Synthetic coverage probes may include common Han plus a supplementary-plane code point, but a placeholder is not proof of linguistic coverage.

### RTL content

- The vi/en application shell remains LTR.
- User-authored blocks and title/summary fields should use `dir="auto"` by default, with a manual LTR/RTL override for ambiguous mixed text.
- Isolate user text from surrounding UI punctuation/badges; test `unicode-bidi: plaintext` or appropriate bidi isolation at the block boundary.
- Inspector placement does not mirror solely because a content paragraph is Arabic; text alignment/direction belongs to the content region.
- Keyboard selection, Markdown punctuation, lists, code spans, and copy/paste require real Arabic mixed-script tests.

### Code and Markdown

- Code uses a dedicated monospace fallback, but non-code multilingual text never inherits monospace merely because it is in an editor.
- Markdown syntax may use subtle treatment; content remains the primary visual layer.
- Code blocks permit horizontal scrolling and explicit direction; inline code is bidi-isolated.
- Preview and public rendering must use the existing safe Markdown contract.

## Synthetic content set for later prototypes/tests

```text
Tiếng Việt: Di sản không chỉ nằm trong hiện vật mà còn trong ký ức cộng đồng.
English: A source can support more than one synthesis without changing ownership.
漢文: 學而時習之
中文: 社区记忆与地方知识
日本語: 資料の来歴を確認する
한국어: 연구 자료의 출처
Français: mémoire collective et patrimoine
العربية: الذاكرة المجتمعية وسياق البحث
Supplementary-plane probe: 𠀀 (rendering depends on installed glyph coverage)
```

This text is a rendering probe, not a linguistic acceptance corpus.
