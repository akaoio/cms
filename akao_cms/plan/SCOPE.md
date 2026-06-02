# CMS MVP Scope

**Status:** ✅ All decisions confirmed — 2026-06-01

---

## What This Is

**Akao CMS** is built by refactoring the existing akao shop project in-place — deleting all eCommerce/DeFi code, keeping the core runtime modules, and building a CMS content pipeline on top.

**Not** a new project. Not a clone of Grav or WordPress. An HTML-printing machine with AdSense that AI agents can drive without human intervention.

---

## Project Structure Decision

**Confirmed:** In-place refactor of `/Users/mac/Documents/freelancer/shop`.

### Core Modules KEPT

| Module | File | CMS Role |
|---|---|---|
| `DB.js` | `src/core/DB.js` | Hash-validated offline cache |
| `FS.js` | `src/core/FS.js` | Flat-file reader, directory scan |
| `UI.js` | `src/core/UI/html.js` | Template engine — `html()` + `render()` |
| `Router.js` | `src/core/Router.js` | Locale-aware routing |
| `Context.js` | `src/core/Context.js` | Global reactive state |
| `States.js` | `src/core/States.js` | Component-level reactive state |
| `Events.js` | `src/core/Events.js` | Event bus |
| `Stores.js` | `src/core/Stores.js` | IndexedDB store abstraction |
| `HMR.js` | `src/core/HMR.js` | Hot reload (dev only) |
| `Threads.js` | `src/core/Threads.js` | Web Worker pool |
| `WebAuthn.js` | `src/core/WebAuthn.js` | Admin auth — Phase 2 only |

### Code DELETED

| File/Folder | Reason |
|---|---|
| `src/core/Cart.js` | eCommerce |
| `src/core/Wallet.js` | Crypto wallet |
| `src/core/Dex.js` | DEX trading |
| `src/core/DeFi/` | Entire DeFi stack |
| `src/core/Chain.js` + `Chains/` | Blockchain |
| `src/core/Forex.js` | Currency rates |
| `src/core/Torrent.js` + `Torrent/` | P2P |
| `src/core/Three.js` | 3D graphics |
| `src/core/Wave.js` + `Wave/` | Audio |
| `src/core/ZEN.js` | Phase 2+ |
| `src/core/SQL.js` + `SQL/` | No search in MVP |
| `src/UI/routes/checkout/` | eCommerce |
| `src/UI/routes/deposit/` + `withdraw/` | Crypto |
| `src/UI/routes/swap/` + `pools/` | DeFi |
| `src/UI/routes/order/` + `dispute/` | eCommerce |
| `src/statics/chains/` + `ABIs/` | Blockchain configs |
| `builder/crypto.js` | Crypto build |

---

## MVP Goal

A system where an AI Agent can:
1. Write a Markdown file to `content/posts/`
2. Run `npm run build:cms` → HTML + AdSense + OG tags + sitemap + RSS
3. Call Social MCP to post the link to Facebook pages
4. Generate AdSense revenue from reader traffic

**Not in scope:** Admin UI, plugin ecosystem, user auth, comments, media CDN.

---

## What's IN SCOPE

### Content Types
- ✅ **Markdown posts** — `content/posts/published/YYYY/MM/DD/XX/YY/<locale>.md` + `meta.json` — body + metadata in separate files, no YAML frontmatter fence
- ✅ **Draft posts** — `content/posts/draft/YYYY/MM/DD/XX/YY/` — same structure, never scanned by build
- ✅ **Static pages** — `content/pages/YYYY/MM/DD/XX/YY/<locale>.md` + `meta.json` — about, contact, privacy-policy (required for AdSense approval)
- ✅ **Category listing** — `/[locale]/[category]/` — auto-generated from config
- ✅ **Tag listing** — `/[locale]/tag/[tag]/` — auto-generated from meta.json tags

### Locale System
- ✅ **18-locale infrastructure** — build pipeline supports all 18 locales
- ✅ **Config-driven activation** — `cms/config.yaml` → `active: [en]`
- ✅ **Zero code changes** to activate a new locale — edit config + rebuild
- ✅ **Launch default:** `en` only

### Build Pipeline (zero npm dependencies — everything written inline)
- ✅ JSON metadata reader (`cms/src/meta.js`) — reads `meta.json` via `FS.load()` auto-parse (`JSON.parse()` native, zero deps), validates required fields. **Replaces** custom YAML parser + frontmatter fence splitter.
- ✅ Markdown → HTML converter (~150–180 lines) — heading, bold/italic, code, link, image, list, blockquote. Body `.md` files have no frontmatter fence.
- ✅ SHA-256 hash generation for every HTML output — feeds DB.js cache contract
- ✅ Content index builder → `build/manifest.json` (versioned) + `build/index.json`
- ✅ Incremental build via hash diff — only rebuild changed files (not mtime)
- ✅ Per-file error isolation — one bad `.md` file logs to `build/errors.log`, build continues
- ✅ Config-driven categories — never hardcoded
- ✅ Locale-aware route injection into `routes.json`
- ✅ Open Graph tags — critical for Social MCP Facebook post preview
- ✅ Sitemap.xml per active locale
- ✅ RSS feed per category per locale
- ✅ `robots.txt`

### Web Components
- ✅ `<cms-list>` — article listing by category/tag, reads `build/index.json`
- ✅ `<cms-page>` — renders article HTML, reads `build/posts/[slug].json` via DB.js
- ✅ AdSense ad slots in **light DOM** — `ad-top`, `ad-mid`, `ad-bottom`
- ✅ **No `attachShadow`** on `cms-page` or `cms-list` — AdSense requirement

### SEO
- ✅ Meta title + description per page (from frontmatter)
- ✅ Canonical URL per locale
- ✅ Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- ✅ JSON-LD Article structured data
- ✅ `robots.txt` referencing sitemap URLs

---

## What's OUT OF SCOPE — MVP

| Feature | Status | Reason |
|---|---|---|
| Admin content editor UI | Phase 2 | AI writes files directly; no human editor needed for MVP |
| System dashboard UI | Phase 2 | Logic-first; all functions testable via CLI |
| WebAuthn admin auth | Phase 2 | No user sessions in this flow |
| Comment system | Phase 2 | ZEN.js integration |
| Video content pipeline | Phase 2+ | Images only for MVP |
| Image resize / media CDN | Phase 2 | AI provides image URL directly in frontmatter |
| Full-text search | Phase 2 | SQL.js removed for MVP |
| ZEN.js integration | Phase 2 | Multi-author, realtime sync |
| Deploy automation / CI-CD | Deferred | Local-first first; deploy decision pending |
| Dark mode | Not planned | No revenue impact |

---

## Confirmed Decisions

| Decision | Answer |
|---|---|
| Q1: Locales | 18-locale infrastructure, config-driven. Launch: `en` only |
| Q2: Project structure | In-place refactor of akao shop — not a new project |
| Q3: Categories | Config-driven via `cms/config.yaml` — never hardcoded |
| Q4: Deploy target | Deferred — local-first first; build designed config-driven for easy swap |
| Q5: Dependencies | Zero — not even devDependencies; all parsers inline |
| Q6: Admin UI | Type B (dashboard) planned Phase 2; logic-first approach |
| Q7: SQL layer | Removed for MVP; re-add when search is scoped |
| Q8: Build trigger | Manual `npm run build:cms`; file watcher Phase 2 |
| Q9: Image handling | URL passthrough in `meta.json` `image` field — no processing |
| Q10: Content file structure | `content/posts/{status}/YYYY/MM/DD/XX/YY/<locale>.md + meta.json`. Chunked 2-digit ID (e.g., 1042 → `/10/42/`) caps fan-out at 100 subfolders per level — VS Code stays usable at 330K articles. |
| Q11: Status management | Factory-model folders: `draft/`, `published/`, `archived/`. Build recurses `published/` only. Status is structural, never a file field. |
| Q12: Metadata format | `meta.json` (JSON, not YAML). No frontmatter fence in `.md` files. `JSON.parse()` is zero-dep, V8-native, throws with position on errors. |

---

## Config Schema — Locked

```yaml
# cms/config.yaml

locales:
  active: [en]
  available: [en, vi, es, fr, de, ja, ko, ru, ar, hi, pt, it, th, he, ur, zh, zh-TW, no]

categories:
  - sports
  - entertainment

adsense:
  publisher_id: ca-pub-XXXXXXXXXXXXXXXX
  slots:
    ad_top: XXXXXXXXXX
    ad_mid: XXXXXXXXXX
    ad_bottom: XXXXXXXXXX

site:
  name: My Site
  url: https://example.com
  description: Site description
  default_og_image: https://example.com/default-og.jpg  # fallback khi article thiếu image

analytics:
  ga4_measurement_id: G-XXXXXXXXXX  # inject GA4 snippet trong <head> nếu có

quality_gate:
  min_word_count: 300      # < 300 = ERROR, block publish, log to errors.log, AI retry
  warn_word_count: 600     # 300–600 = WARNING, publish nhưng ghi log
```

---

## Meta Schema — Locked

Each article is a folder. The folder contains:
- `<locale>.md` — article body only (no `---` frontmatter fence)
- `meta.json` — all metadata fields

```json
{
  "title": "My Article Title",
  "slug": "my-article-title",
  "date": "2026-06-01",
  "category": "sports",
  "tags": ["football", "premier-league"],
  "description": "Short description",
  "image": "https://example.com/img.jpg",
  "lang": "en",
  "fb_caption": "Hook ngắn cho Facebook — emotion-driven, ≤160 chars; fallback: description[:160]",
  "publish_at": "2026-06-05T09:00:00+07:00",
  "updated_at": "2026-06-10"
}
```

**Fields removed vs old frontmatter schema:**
- `draft` — removed; draft status = article lives in `content/posts/draft/` folder
- `status` — removed; status = folder position (`draft/`, `published/`, `archived/`)

**Folder position → build behavior:**
| Folder | Build behavior |
|---|---|
| `published/` | Built and deployed |
| `draft/` | Never scanned — invisible to build |
| `archived/` | `build/{path}/index.html` written as redirect stub — URL never 404s |

**Quality Gate Rules (automation, no human needed):**
- `word_count < 300` → ERROR: append to `build/errors.log`, skip publish, AI auto-retry
- `300 ≤ word_count < 600` → WARNING: publish but log — không block pipeline
- `duplicate slug` → ERROR: append to errors.log, skip
- `publish_at > now` → SKIP silently (not error — scheduled future content)

---

## Build Output Contract — Locked

```
build/
├── manifest.json          ← { v:1, built:ISO8601, entries:{slug:{hash,locale,category}} }
├── index.json             ← article listing data for <cms-list>
├── errors.log             ← { ts, file, error } one JSON line per failed file
├── sitemap.xml            ← per active locale
├── rss.xml                ← per category per active locale
├── robots.txt
└── {locale}/
    └── {category}/
        └── {slug}/
            ├── index.html ← complete pre-rendered HTML with AdSense slots
            └── index.hash ← SHA-256 of HTML content
```

---

## Definition of Done — MVP

```
✅ AI Agent writes meta.json + <locale>.md to content/posts/published/YYYY/MM/DD/XX/YY/
✅ npm run build:cms succeeds with zero errors
✅ build/{locale}/{category}/{slug}/index.html exists with complete HTML
✅ AdSense script present on page
✅ Open Graph tags correct → validated with Facebook Sharing Debugger
✅ sitemap.xml contains URL of new article
✅ rss.xml contains entry for new article
✅ Social MCP posts article link to Facebook, preview renders with OG image
✅ Incremental build: add 1 article → only 1 file rebuilt
✅ Add locale to config.yaml → rebuild → new locale online, zero code changes
✅ Add category to config.yaml → rebuild → new listing route exists, zero code changes
```
