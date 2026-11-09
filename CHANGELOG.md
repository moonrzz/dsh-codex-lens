# Changelog

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
