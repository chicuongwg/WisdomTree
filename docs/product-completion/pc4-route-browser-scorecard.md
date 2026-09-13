# PC4 route-by-route browser scorecard

Browser: temporary `nixpkgs#chromium`. Initial real-browser audit used
1440×900, 768×1024, and 390×844; every row rendered and had no document-level
horizontal overflow. Final Chromium E2E rechecked altered surfaces and the
cross-route navigation/deep-link path.

| Route/surface           | Desktop  | Tablet          | Mobile                   | Result |
| ----------------------- | -------- | --------------- | ------------------------ | ------ |
| Overview                | Rendered | Rendered        | Rendered                 | PASS   |
| Projects                | Rendered | Rendered        | Rendered                 | PASS   |
| Project overview        | Rendered | Rendered        | Rendered                 | PASS   |
| Notes / Inspector       | Rendered | Drawer behavior | Drawer + keyboard        | PASS   |
| Materials               | Rendered | Rendered        | Long-content containment | PASS   |
| Activities              | Rendered | Rendered        | Mention/reply composer   | PASS   |
| Tasks list / Kanban     | Rendered | Rendered        | Horizontal lane scroll   | PASS   |
| Calendar                | Rendered | Rendered        | Rendered                 | PASS   |
| People                  | Rendered | Rendered        | Rendered                 | PASS   |
| Search                  | Rendered | Rendered        | Rendered                 | PASS   |
| Graph                   | Rendered | Rendered        | Compact label policy     | PASS   |
| Notifications           | Rendered | Rendered        | Authorized deep-link     | PASS   |
| Account                 | Rendered | Rendered        | Long identity truncation | PASS   |
| Admin                   | Rendered | Rendered        | Rendered                 | PASS   |
| Library                 | Rendered | Rendered        | Rich holding containment | PASS   |
| Project settings/export | Rendered | Rendered        | Rendered                 | PASS   |
| Public `/p` search      | Rendered | Rendered        | One-column search reflow | PASS   |
| Public Note             | Rendered | Rendered        | Long multilingual reflow | PASS   |

`200% zoom/reflow` was exercised as 720 CSS-pixel responsive reflow and the
390px phone viewport; no document-level overflow was observed on the tested
Graph/public surfaces, while the full route audit found none across all rows.
