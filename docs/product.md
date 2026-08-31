# Product

WisdomTree is a secure internal wiki and knowledge platform for a small,
non-technical, Vietnamese-speaking team. It replaces the team's scattered
Excel/Docs habits with one place to store, edit, and connect knowledge.

## The three goals (and deliberately no more)

1. **Task & project management** — a Trello/Jira-shaped surface: Kanban
   board (`/board`), deadlines with reminders and checklists
   (`/deadlines`), a calendar view and a per-user ICS feed.
2. **Internal wiki and Markdown knowledge storage** — team branches are
   isolated by space membership; personal branches are private to their
   owner. Pages support hierarchy, manual ordering, canonical URLs, table of
   contents, previous/next navigation, unified search, wiki links/embeds,
   safe Markdown, and Vietnamese content with an optional English version.
   Team edits autosave into private drafts while readers keep seeing the
   official page. Contributors self-publish normal pages; pages marked
   protected require an independent review.
   Managers can create immutable per-space releases at `/wiki/releases`.
   The Library (`/library`) stores
   uploaded files (store-first: available the moment upload returns) with
   OCR/pandoc text extraction, and physical books as first-class Library
   items (category _Sách_) with a borrow/return desk. Personal note
   branches are **live-edited** markdown with full version history,
   diff and restore; promotion into the shared tree remains reviewed (see
   architecture.md § Wiki editing lifecycle). An
   Obsidian-style graph view (`/graph`) shows the link structure.
3. **User management** — Google OIDC sign-in (invite-only), DB-backed
   per-session auth with an inactivity timeout, a per-account traffic
   cap, and a three-role model.

Anything outside these three (analytics, multi-channel notifications,
document rendering, automated pipelines) is out of scope until someone
asks for it — see roadmap.md for the one planned exception (RAG).

## Roles

| Role (DB literal) | Vietnamese        | May do                                                                                                                                       |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `user`            | Thành viên        | Own personal branches, team drafts and self-publish in contributor spaces, uploads, loans, board/deadlines, and personal-node promotion.     |
| `editor`          | Biên tập viên     | Contributor editing plus review of protected changes and submissions they did not write themselves.                                        |
| `admin_op`        | Quản trị/Vận hành | Cross-space knowledge administration plus user management, spaces, physical books & the loan desk, releases/export, health, and audit trail. |

Space membership adds a second permission axis: viewer, contributor, and
manager. A global role alone does not expose a space, except the documented
Admin/Op break-glass access for knowledge operations. Denied out-of-scope
reads return 404 so they do not reveal whether another space's record exists.

## Wiki content boundary

The renderer supports headings and anchors, lists/tasks, links, code,
blockquote, tables, horizontal rules, admonitions, details, tabs, and internal
embeds. Raw HTML is displayed as text; MDX, unsafe protocols, and external
images are not executed. The release gate additionally rejects malformed
Markdown and unresolved wiki links.

Separation of duties applies to protected pages and promotion: nobody reviews
their own submission, whatever their role.

## Language

The UI is Vietnamese; the vocabulary is owned by the humanities side of
the team (vocabulary-vi.md). Internals are English (README.md
§ Conventions).
