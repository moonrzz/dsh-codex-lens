# Changelog

## 0.4.0 — 2026-11-09

- Rename the npm package to `dsh-codex-lens` so it can be published and installed with `dsh plugin --profile desktop add dsh-codex-lens`. The plugin id stays `dsh-codex-bridge`, so bindings, the sidebar tab and existing configuration keep working.
- Add DSH marketplace metadata: `dsh-plugin` / `deepseek-harness` keywords and a `dsh.catalog` block (category `tools`, EN/ZH summaries, capabilities).
- Add a 256 px PNG icon at `docs/icon.png` for marketplace cards.
- Document the GitHub install command in the README.

## 0.3.3 — 2026-11-09

- Fix double-click on a thread row: the row is no longer disabled while the bind request is in flight, and a single click now waits 240 ms before binding, so the second click of a double-click is not swallowed.
- Double-click is detected by the row itself (two clicks within 240 ms): it opens the thread detail and binds the thread in one gesture.
- The open thread detail survives a page reload (`sessionStorage`, keyed by DSH session).

## 0.3.2 — 2026-11-09

- New icon: brand-blue magnifier with a terminal prompt (`#4d6bfe`), legible down to 20 px.
- Display name unified as **Codex Lens / Codex 透镜**.

## 0.3.1 — 2026-11-09

- Rename display name from "Codex" to "Codex Lens"; locale, prompt section, binding card and README updated.

## 0.3.0 — 2026-11-09

- Thread detail page: three tabs (overview / live activity / workspace files).
- Overview: six KPIs, per-turn duration bars, activity donut, status stack, activity sparkline, tool metrics, top changed files, first request. Hand-drawn SVG, no chart library.
- Stats endpoint: `POST /api/dsh-codex-bridge/stats`.
- Live activity from the rollout tail; auto-switches to the live tab while a thread is running.

## 0.2.0 — 2026-11-09

- Thread detail page inside the right-sidebar tab (list ↔ detail).
- Live activity: `POST /api/dsh-codex-bridge/live`.
- Workspace file tree and Explorer reveal: `/tree`, `/reveal`; paths confined to the thread cwd.
- `codex_status` includes live activity while the thread is running.

## 0.1.1 — 2026-11-08

- Fix client boot failure: declare `sidebarRightTabs` in the client `inject` list.
- Fix locale lookup: use flat dotted keys.
- Fix overview line-break formatting.

## 0.1.0 — 2026-11-08

- First working version: thread roster grouped by project, bind to the current DSH session, four read-only tools (`codex_status`, `codex_overview`, `codex_turn`, `codex_search`), binding card injection, right-sidebar tab.
