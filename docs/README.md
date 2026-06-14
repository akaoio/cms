# Akao CMS — Documentation

**Project:** Akao CMS — Zero-dependency, AI-driven, AdSense-ready static site generator
**Status:** Architecture complete. Ready for implementation.
**Last updated:** 2026-06-01

---

## Documents

| File                                              | Purpose                                                                    | Status  |
| ------------------------------------------------- | -------------------------------------------------------------------------- | ------- |
| [02_SYSTEM_FLOW.md](./design/02_SYSTEM_FLOW.md)   | Business model, revenue pipeline, why Akao vs WordPress                    | ✅ Final |
| [PRD.md](./PRD.md)                                | Product requirements — FRs, NFRs, scope, schemas, locked decisions, DoD    | ✅ Final |
| [01_ARCHITECTURE.md](./design/01_ARCHITECTURE.md) | Technical architecture — ADRs, file structure, patterns, FR→file mapping   | ✅ Final |
| [STORIES.md](./plan/STORIES.md)                   | 20 stories across 3 epics with acceptance criteria                         | ✅ Final |
| [FAN_OUT.md](./implement/FAN_OUT.md)              | TDD strategy, module list, architectural constraints, implementation guide | ✅ Final |

---

## Quick Summary

**What:** A static CMS that converts Markdown files → pre-rendered HTML with AdSense slots.
**Who uses it:** AI agents (write content), End readers (consume content), Operators (configure via CLI).
**Revenue model:** AI writes content → CMS builds static site → Social MCP posts to Facebook → traffic → AdSense.
**Why not WordPress:** $0 hosting, no upgrade debt, AI writes files directly, 18 locales native, <50ms TTFB.

---

## Key Constraints (non-negotiable)

1. **Zero dependencies** — no npm packages at any layer. All parsers written inline.
2. **No `attachShadow`** on `cms-page` or `cms-list` — AdSense requires light DOM.
3. **Hybrid routing** — build emits complete HTML files. `cms-page` is progressive enhancement only.
4. **Config-driven** — locales and categories changed in `src/cms/config.yaml`, never in code.
5. **Incremental build** — hash diff via `build/manifest.json`, never full rebuild unless necessary.

---

## Project Repositories

| Project    | Path        | Role                               |
| ---------- | ----------- | ---------------------------------- |
| Akao CMS   | `akao`      | This project — content engine      |
| Social MCP | `socialmcp` | Facebook/social posting automation |
| ZEN        | `zen`       | Decentralized graph DB (Phase 2)   |
