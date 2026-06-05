# Akao CMS

A zero-dependency, AI-driven, AdSense-ready static site generator.

```text
AI Agent → writes Markdown → Akao CMS → builds static HTML + AdSense → CDN
                                              ↓
                             Social MCP → Facebook pages → Reader → AdSense $$$
```

---

## What It Does

Akao CMS converts Markdown files into fully rendered, multilingual, SEO-ready web pages — designed to be driven entirely by AI agents without human authoring intervention.

**Why not WordPress or Gatsby?**

|              | Akao CMS          | WordPress       | Gatsby         |
| ------------ | ----------------- | --------------- | -------------- |
| Dependencies | Zero              | Hundreds        | Hundreds       |
| Hosting cost | $0 (static CDN)   | Server required | Build server   |
| AI writeable | Yes (plain files) | API/plugin      | Build pipeline |
| Upgrade debt | None              | Constant        | Constant       |
| TTFB         | < 50ms            | 200–800ms       | ~100ms         |
| 18 locales   | Native            | Plugin          | Config         |

---

## Key Principles

1. **Zero dependencies** — no npm packages at runtime, build time, or devDependencies. Every parser written inline.
2. **No Shadow DOM** on `<cms-page>` or `<cms-list>` — AdSense requires light DOM.
3. **Hybrid routing** — build emits complete HTML files; `<cms-page>` is progressive enhancement only.
4. **Config-driven** — locales and categories changed in `cms/config.yaml`, never in code.
5. **Incremental build** — SHA-256 hash diff via `build/manifest.json`; never a full rebuild unless necessary.

---

## Actors

| Actor          | Role                                                               | Interface        |
| -------------- | ------------------------------------------------------------------ | ---------------- |
| **AI Agent**   | Writes Markdown, triggers build, calls Social MCP                  | CLI + filesystem |
| **End Reader** | Revenue source — clicks from social, generates AdSense impressions | Browser          |
| **Operator**   | Configures locales/categories, debugs builds                       | CLI + config     |

---

## How an Article Gets Published

```text
1. AI writes:
   content/posts/published/YYYY/MM/DD/XX/YY/en.md     ← body only
   content/posts/published/YYYY/MM/DD/XX/YY/meta.json  ← title, date, category, slug, ...

2. npm run build:cms

3. Build outputs:
   build/{locale}/{category}/{slug}/index.html
   build/manifest.json
   sitemap.xml + rss.xml

4. AI calls Social MCP: post(url, teaser) → Facebook
5. Reader clicks → AdSense loads → $$$
```

---

## Requirements

- **Node.js 18+** — build time only
- **Modern browser** — Chrome 90+, Firefox 88+, Safari 14+
- **No npm install needed** — zero dependencies

---

## Build

```bash
# Build all active locales
npm run build:cms

# Incremental — only rebuilds changed files
npm run build:cms

# Full rebuild (clears manifest)
npm run build:cms -- --clean
```

Output lands in `build/`. Never edit `build/` manually — always regenerated.

---

## Configuration

All configuration lives in `cms/config.yaml`:

```yaml
locales:
  active: [en]          # add "es", "vi", etc. to activate
  supported: [en, vi, zh, ja, ko, fr, de, es, pt, ...]

categories: [sports, news, tech, lifestyle]

adsense:
  publisher_id: ca-pub-XXXXXXXXXXXXXXXX
```

Adding a locale or category = edit this file + `npm run build:cms`. Zero code changes.

---

## Content Structure

```text
content/
  posts/
    published/          ← only this folder is scanned by the build
      YYYY/MM/DD/
        XX/YY/
          en.md         ← body only, no frontmatter
          vi.md
          meta.json     ← { title, slug, date, category, tags, description, image }
    draft/              ← never touched by build
    archived/           ← never touched by build
```

`meta.json` required fields: `title`, `date` (ISO 8601), `category`.

---

## Output Structure

```text
build/
  manifest.json         ← slug → contentHash (incremental diff key)
  index.json            ← full content index
  errors.log            ← skipped files + reasons
  {locale}/
    sitemap.xml
    rss.xml             ← per category
    {category}/
      index.html        ← listing page
      {slug}/
        index.html      ← article page
        index.html.hash ← SHA-256, consumed by DB.js cache
```

---

## Core Modules (reused from akao base)

| Module       | Purpose                                                                   |
| ------------ | ------------------------------------------------------------------------- |
| `DB.js`      | Fetch + IndexedDB cache with SHA-256 validation. Enables offline reading. |
| `FS.js`      | Universal file I/O — same API in Node.js (build) and browser (runtime).   |
| `UI.js`      | Zero-dep template engine. `html` tagged literal + `render(template, el)`. |
| `Router.js`  | Locale-aware URL router. Parses `/en/sports/my-article` → params.         |
| `States.js`  | ES6 Proxy reactive state. Components subscribe to keys.                   |
| `Context.js` | Global app state (locale, theme) persisted to localStorage.               |
| `Threads.js` | Web Worker pool — offloads Markdown parsing to background threads.        |

---

## Related Projects

| Project            | Role                                                        |
| ------------------ | ----------------------------------------------------------- |
| `akao` (this repo) | Content engine — Markdown → HTML → CDN                      |
| `socialmcp`        | Social posting automation — Facebook, X, Instagram, Threads |
| `zen`              | Decentralized graph DB (Phase 2)                            |

---

## Documentation

Full specifications live in [`docs/`](docs/):

| Document                                                               | Purpose                                                          |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [`docs/PRD.md`](docs/PRD.md)                                           | Product requirements — FRs, NFRs, user journeys, success metrics |
| [`docs/design/02_ARCHITECTURE.md`](docs/design/02_ARCHITECTURE.md)     | Technical architecture — ADRs, file structure, patterns          |
| [`docs/design/04_SYSTEM_FLOW.md`](docs/design/04_SYSTEM_FLOW.md)       | Business model, revenue pipeline                                 |
| [`docs/design/05_SCALE_AND_RISK.md`](docs/design/05_SCALE_AND_RISK.md) | Scale projections and risk analysis                              |
| [`docs/plan/SCOPE.md`](docs/plan/SCOPE.md)                             | MVP scope — what's in, what's out, all confirmed decisions       |
| [`docs/plan/STORIES.md`](docs/plan/STORIES.md)                         | 19 user stories across 3 epics with acceptance criteria          |

---

## Status

**Architecture complete. Ready for implementation.**

- Phase 1 (MVP): Static build pipeline, 18-locale support, AdSense integration
- Phase 2: Comments (ZEN.js), full-text search (SQL.js), admin UI
