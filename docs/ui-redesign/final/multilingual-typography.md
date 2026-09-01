# Multilingual content and typography specification

## Separate typography roles

### Application chrome

Goal: compact, highly legible Vietnamese/English UI.

Candidate fallback token for Stage 17 testing:

```text
system-ui, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif
```

This is not a final font commitment. Avoid thin weights, all-uppercase Vietnamese labels, and icon-only navigation.

### Research content

Goal: comfortable long-form reading/editing with script-appropriate fallback.

Candidate strategy, subject to installed-font audit:

```text
"Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK JP",
system-ui, sans-serif
```

Use `:lang(...)` overrides where actual content language is known. Do not force one regional CJK glyph style across Chinese, Japanese, Korean, or historical Vietnamese research. Arabic and specialist Hán-Nôm fonts must be selected from actual deployment availability.

## Coverage contract

Arbitrary valid Unicode must round-trip through editor, save, read, copy, and publication without replacement/transliteration. Glyph availability is a separate runtime concern.

Stage 17 typography acceptance requires:

1. Vietnamese diacritic quality at UI/body weights;
2. Chinese/Japanese/Korean sample rendering;
3. Arabic shaping, bidi, selection, and Markdown tests;
4. product-owner Hán-Nôm corpus including supplementary-plane characters;
5. missing-glyph/tofu identification on supported OS/browser environments;
6. preserved text even if a specialist glyph is unavailable.

No single font is claimed to cover all Unicode or Hán-Nôm.

## Directionality

- Application shell remains LTR for vi/en.
- User text containers use `dir="auto"` by default and permit a manual LTR/RTL override stored as presentation metadata only if the product later adds it.
- Isolate user text from neighboring icons/status/punctuation using appropriate bidi isolation (`unicode-bidi: plaintext` or equivalent after browser testing).
- An Arabic paragraph changes its content direction, not sidebar/inspector placement.
- Mixed Vietnamese + Arabic, English + Arabic, and CJK + Latin samples must test cursor movement, selection, lists, inline code, links, and copy/paste.

## Reading metrics

- Latin/Vietnamese reading measure: approximately 65–75 characters per line.
- CJK uses comparable comfortable visual measure rather than a rigid character count.
- Body line height starting tests: 1.65–1.8 Latin/Vietnamese; 1.7–1.9 for dense CJK where needed.
- Headings use moderate scale and robust weights; Markdown hierarchy remains recognizable without oversized marketing typography.
- Research reader may offer a comfortable/wide reading preference later; baseline is comfortable.

## Editor and preview

- Editor body and preview use compatible metrics to limit reflow surprise.
- Markdown syntax may be visually subdued but remains perceivable and selectable.
- Code uses a separate tested monospace stack; code blocks scroll horizontally and preserve explicit direction.
- Inline code is bidi-isolated.
- Safe Markdown parsing/rendering remains mandatory.

## Acceptance corpus

```text
Tiếng Việt: Di sản và ký ức cộng đồng.
English: Supporting research remains version-specific.
漢文: 學而時習之
中文: 社区记忆与地方知识
日本語: 資料の来歴を確認する
한국어: 연구 자료의 출처
Français: mémoire collective et patrimoine
العربية: الذاكرة المجتمعية وسياق البحث
Supplementary-plane probe: 𠀀
Mixed: Hồ sơ 1972 — الذاكرة — Version 3
```

This synthetic set is a technical probe, not proof of Hán-Nôm linguistic coverage.
