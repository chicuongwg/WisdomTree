# Product

WisdomTree is a storage-first knowledge platform for a small,
non-technical, Vietnamese-speaking team. It replaces the team's scattered
Excel/Docs habits with one place to store, edit, and connect knowledge.

## The three goals (and deliberately no more)

1. **Task & project management** — a Trello/Jira-shaped surface: Kanban
   board (`/board`), deadlines with reminders and checklists
   (`/deadlines`), a calendar view and a per-user ICS feed.
2. **Markdown knowledge storage** — the Library (`/library`) stores
   uploaded files (store-first: available the moment upload returns) with
   OCR/pandoc text extraction, and physical books as first-class Library
   items (category *Sách*) with a borrow/return desk. Personal note
   branches are **live-edited** markdown with full version history,
   diff and restore; content reaches the shared tree only through the
   single review boundary (see architecture.md § Two-tier editing). An
   Obsidian-style graph view (`/graph`) shows the link structure.
3. **User management** — Google OIDC sign-in (invite-only), DB-backed
   per-session auth with an inactivity timeout, a per-account traffic
   cap, and a three-role model.

Anything outside these three (analytics, multi-channel notifications,
document rendering, automated pipelines) is out of scope until someone
asks for it — see roadmap.md for the one planned exception (RAG).

## Roles

| Role (DB literal) | Vietnamese | May do |
| --- | --- | --- |
| `user` | Thành viên | Everything personal: own branches (live edit), uploads, loans, board/deadlines in their spaces, propose promotion of their own nodes. |
| `editor` | Biên tập viên | Plus: edit/propose on shared content they authored, and **review** — decide promotions and change proposals they did not write themselves. |
| `admin_op` | Quản trị/Vận hành | Plus: user management (invite/role/disable), spaces, physical books & the loan desk, tree export, health, audit trail. |

Separation of duties is orthogonal to roles: nobody reviews their own
submission, whatever their role.

## Language

The UI is Vietnamese; the vocabulary is owned by the humanities side of
the team (vocabulary-vi.md). Internals are English (README.md
§ Conventions).
