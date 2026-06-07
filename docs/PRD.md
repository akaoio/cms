# Product Requirements Document — Akao CMS

**Status:** ✅ Updated — 2026-06-05 (merged SCOPE.md; GA4 deferred; quality gate detail added; archived redirect stub added)

---

## Vision

**Akao CMS is a zero-dependency, static-first content engine that converts Markdown files into fully rendered, multilingual, AdSense-ready web pages — designed to be driven entirely by AI agents without human authoring intervention.**

---

## Problem

Current CMS solutions require either a persistent server (WordPress, Ghost) or a dependency-heavy build toolchain (Gatsby, Next.js). Both create **upgrade debt** — when upstream packages version-bump, the system breaks in unpredictable ways.

For an AI-driven pipeline generating 50–900 articles/day across 18 locales, these failure points compound: a broken build means zero new content, zero new traffic, zero AdSense revenue.

Akao CMS eliminates this by owning every piece of the pipeline with zero external dependencies. A Markdown file written by an AI agent today will build identically five years from now — no upgrade path needed.

**Philosophy:** Same ideology as Gatsby/Grav CMS, but more extreme — no dependencies at any layer, including build time.

---

## System Context

```text
AI Agent → writes Markdown → Akao CMS → builds static HTML + AdSense → CDN
                                               ↓
                              Social MCP → Facebook pages → Reader → AdSense $$$
```

Akao CMS is built by stripping the existing akao shop project — removing all eCommerce/DeFi code, keeping core modules, building CMS on top. **Not** a new project. Not a clone of Grav or WordPress. An HTML-printing machine with AdSense that AI agents can drive without human intervention.

**What is Social MCP?** A separate tool (at `/Users/mac/Documents/freelancer/socialmcp`) that lets AI agents post to Facebook, X, Instagram, and Threads by calling simple commands like `post(url, text)` — without parsing the DOM of those sites.

---

## Foundation — Module Inventory

Akao CMS is built on top of the **akao shop project** by deleting all eCommerce/DeFi code and keeping the core runtime.

### Modules KEPT

| Module        | File                   | CMS Role                                                                                                                                                                               |
| ------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB.js`       | `src/core/DB.js`       | Fetches static files from server, caches in browser IndexedDB with SHA-256 hash validation. On repeat visits, serves from cache — zero network. Enables true offline reading.          |
| `FS.js`       | `src/core/FS.js`       | Universal file I/O that works identically in Node.js (build time) and browser (runtime). Automatically parses `.json`, `.csv` by extension.                                            |
| `UI.js`       | `src/core/UI.js`       | Zero-dependency template engine using JavaScript tagged template literals. `html` creates a template object; `render(template, element)` writes it to the DOM. No Virtual DOM, no JSX. |
| `Router.js`   | `src/core/Router.js`   | URL router that extracts locale and dynamic parameters from paths like `/en/sports/my-article`. Locale-aware by design — all URLs are prefixed with locale code.                       |
| `States.js`   | `src/core/States.js`   | ES6 Proxy-based reactive state. Components subscribe to specific keys; only notified when values actually change.                                                                      |
| `Context.js`  | `src/core/Context.js`  | Global app state (current locale, theme). Persisted to localStorage.                                                                                                                   |
| `Stores.js`   | `src/core/Stores.js`   | IndexedDB store abstraction — shared state across modules.                                                                                                                             |
| `Events.js`   | `src/core/Events.js`   | Event bus.                                                                                                                                                                             |
| `Threads.js`  | `src/core/Threads.js`  | Web Worker pool manager. Offloads heavy tasks (e.g. Markdown parsing at scale) to background threads so the browser stays responsive.                                                  |
| `WebAuthn.js` | `src/core/WebAuthn.js` | Admin auth — Phase 2 only.                                                                                                                                                             |

### Code DELETED

| File/Folder                            | Reason            |
| -------------------------------------- | ----------------- |
| `src/core/Cart.js`                     | eCommerce         |
| `src/core/Wallet.js`                   | Crypto wallet     |
| `src/core/Dex.js`                      | DEX trading       |
| `src/core/DeFi/`                       | Entire DeFi stack |
| `src/core/Chain.js` + `Chains/`        | Blockchain        |
| `src/core/Forex.js`                    | Currency rates    |
| `src/core/Torrent.js` + `Torrent/`     | P2P               |
| `src/core/Three.js`                    | 3D graphics       |
| `src/core/Wave.js` + `Wave/`           | Audio             |
| `src/core/ZEN.js`                      | Phase 2+          |
| `src/core/SQL.js` + `SQL/`             | No search in MVP  |
| `src/UI/routes/checkout/`              | eCommerce         |
| `src/UI/routes/deposit/` + `withdraw/` | Crypto            |
| `src/UI/routes/swap/` + `pools/`       | DeFi              |
| `src/UI/routes/order/` + `dispute/`    | eCommerce         |
| `src/statics/chains/` + `ABIs/`        | Blockchain config |
| `builder/crypto.js`                    | Crypto build      |

---

## Actors

| Actor                    | Role                                                                 | Interacts Via    |
| ------------------------ | -------------------------------------------------------------------- | ---------------- |
| **AI Agent**             | Primary operator — writes Markdown, triggers build, calls Social MCP | CLI + filesystem |
| **End Reader**           | Revenue source — clicks from Facebook, generates AdSense impressions | Browser          |
| **Developer / Operator** | Configures system, debugs builds, adds locales/categories            | CLI + config     |

---

## Functional Requirements

### FR-1 — Content Ingestion

| ID     | Requirement                                                                                                                                                                                                                                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1.1 | Read article metadata from `meta.json` — fields: `title` (req), `slug` (opt), `date` (req, ISO 8601), `category` (req), `tags` (opt array), `description` (req), `image` (opt URL), `lang` (opt), `fb_caption` (opt), `publish_at` (opt, ISO 8601), `updated_at` (opt, ISO 8601). Parsed via native `JSON.parse()` — no YAML, no custom parser. |
| FR-1.2 | Convert Markdown body to HTML — `# h1–h6`, `**bold**`, `*italic*`, `` `code` ``, ` ```block``` `, `[link](url)`, `![img](url)`, `- list`, `1. list`, `> blockquote`, `---`                                                                                                                                                                      |
| FR-1.3 | Each article is a folder containing `<locale>.md` (body only, no frontmatter fence) + `meta.json`. Metadata parsed via native `JSON.parse()` — zero dependencies, no eval, no third-party library.                                                                                                                                              |
| FR-1.4 | Per-file error isolation — one bad article folder skipped, logged to `build/errors.log`, build continues.                                                                                                                                                                                                                                       |
| FR-1.5 | Draft exclusion — build pipeline only recurses into `content/posts/published/`. Files in `draft/` and `archived/` are never read by ingest. Status is structural (folder position), not textual (field value).                                                                                                                                  |
| FR-1.6 | Required field validation — articles missing `title`, `date`, `category` in `meta.json` rejected with structured error.                                                                                                                                                                                                                         |

### FR-2 — Build Pipeline

| ID     | Requirement                                                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-2.1 | `npm run build:cms` → `build/{locale}/{category}/{slug}/index.html` + `build/manifest.json` + `build/index.json`                                                                                           |
| FR-2.2 | SHA-256 hash for every HTML output; `index.hash` written alongside — feeds DB.js offline cache contract.                                                                                                   |
| FR-2.3 | Incremental build — `build/manifest.json` stores `{ slug: contentHash }`; only changed files rebuilt. Hash diff, not mtime.                                                                                |
| FR-2.4 | Config-driven locale activation — `cms/config.yaml` `active: [en]`; adding locale = config change + rebuild, zero code changes.                                                                            |
| FR-2.5 | Config-driven categories — adding category = config change + rebuild, zero code changes.                                                                                                                   |
| FR-2.6 | 18-locale infrastructure — pipeline supports all 18 locales; only `active` ones are built.                                                                                                                 |
| FR-2.7 | `archived/` articles — build emits a redirect stub at `build/{path}/index.html` so archived URLs never return 404.                                                                                         |
| FR-2.8 | Script tag audit — before writing each `index.html`, pipeline scans emitted HTML for any `<script>` missing both `defer` and `type="module"`; if found, log to `errors.log` and abort write for that file. |

### FR-3 — Routing & Pages

| ID     | Requirement                                                                               |
| ------ | ----------------------------------------------------------------------------------------- |
| FR-3.1 | Article page — `/{locale}/{category}/{slug}/`                                             |
| FR-3.2 | Category listing — `/{locale}/{category}/`                                                |
| FR-3.3 | Tag listing — `/{locale}/tag/{tag}/`                                                      |
| FR-3.4 | Static pages — `/{locale}/about/`, `/contact/`, `/privacy-policy/` (required for AdSense) |
| FR-3.5 | Routes auto-injected into `routes.json` at build time — no manual registration.           |

### FR-4 — SEO & Distribution

| ID     | Requirement                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| FR-4.1 | Per-page meta: `<title>`, `<meta name="description">`, `<link rel="canonical">`                                      |
| FR-4.2 | Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type` — required for Social MCP Facebook preview |
| FR-4.3 | JSON-LD Article structured data per article page                                                                     |
| FR-4.4 | `sitemap.xml` per active locale — auto-generated from content index                                                  |
| FR-4.5 | `rss.xml` per category per active locale — latest 20 articles                                                        |
| FR-4.6 | `robots.txt` — allows all crawlers, references sitemap URLs                                                          |

### FR-5 — Web Components

| ID     | Requirement                                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------- |
| FR-5.1 | `<cms-page>` — renders article HTML via DB.js + `html()` + `render()`; **light DOM only**                 |
| FR-5.2 | `<cms-list>` — article listing by category/tag; supports filtering; **light DOM only**                    |
| FR-5.3 | AdSense ad slots as named light DOM elements: `ad-top`, `ad-mid`, `ad-bottom` — **not inside Shadow DOM** |
| FR-5.4 | Link interception — internal links intercepted by SPA router, no hard reload                              |
| FR-5.5 | `disconnectedCallback` cleanup — all subscriptions removed on unmount                                     |

---

## Quality Gate Rules

Enforced by build pipeline — no human intervention needed.

| Condition                 | Behavior                                                    |
| ------------------------- | ----------------------------------------------------------- |
| `word_count < 600`        | ERROR — append to `errors.log`, skip publish, AI auto-retry |
| `duplicate slug`          | ERROR — append to `errors.log`, skip                        |
| `missing required fields` | ERROR — append to `errors.log`, skip                        |
| `publish_at > now`        | SKIP silently — scheduled future content, not an error      |

---

## Non-Functional Requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-1 | **Zero dependencies** — no npm packages at runtime, build time, or devDependencies. Everything inline.                                                                                                                                                                                                                                                                                 |
| NFR-2 | **Build performance** — incremental build < 60s for ≤ 1,000 changed files. Full rebuild < 10 min for 330,000 files. Hash-based diff, not mtime.                                                                                                                                                                                                                                        |
| NFR-3 | **Page performance** — LCP < 2.5s, CLS < 0.1, TBT < 200ms on mobile. Pre-rendered, no client-side article rendering. All `<script>` tags in emitted HTML must use `defer` or `type="module"` — **verified by build pipeline before file is written** (see FR-2.8). No synchronous fetch or parse on main thread during page load. JS and static JSON loaded in background after paint. |
| NFR-4 | **Isomorphic runtime** — `DB.js`, `FS.js`, `UI.js`, `States.js` run identically in Node.js (build) and browser (runtime).                                                                                                                                                                                                                                                              |
| NFR-5 | **Fault isolation** — one bad Markdown file never blocks the build. All failures logged to `build/errors.log`.                                                                                                                                                                                                                                                                         |

---

## User Journeys

### UJ-1 — AI Agent publishes an article (primary flow)

```text
1. AI generates: title, body, meta description, image URL
2. AI writes:
   - content/posts/published/YYYY/MM/DD/XX/YY/en.md  ← body only, no frontmatter
   - content/posts/published/YYYY/MM/DD/XX/YY/meta.json
   (XX/YY = article ID chunked into 2-digit pairs; max 100 subfolders per level)
3. AI runs: npm run build:cms
4. Build:
   - Recursively scan published/** only (draft/ never touched)
   - Read meta.json via JSON.parse → validate required fields
   - Read <locale>.md body → Convert Markdown → HTML
   - Compute SHA-256 hash → write index.hash
   - Write build/{locale}/{category}/{slug}/index.html
   - Update build/manifest.json (incremental diff)
   - Inject route into routes.json
   - Update sitemap.xml + rss.xml
5. Article live at /{locale}/{category}/{slug}/
6. AI calls Social MCP: post(url, teaser) → Facebook pages
7. Facebook preview uses OG tags from article page
8. Reader clicks → AdSense loads → impression → $$$
```

### UJ-2 — Operator adds a new category

```text
1. Edit cms/config.yaml: add "technology" to categories list
2. Run: npm run build:cms
3. /{locale}/technology/ listing route generated automatically
4. AI can now write articles with category: technology
5. Zero code changes required
```

### UJ-3 — Operator activates a new locale

```text
1. Edit cms/config.yaml: add "es" to active locales
2. Run: npm run build:cms
3. /es/{category}/{slug}/ routes generated for all content with lang: es
4. Spanish sitemap.xml generated automatically
5. Zero code changes required
```

---

## Out of Scope — MVP

| Feature                           | Status      | Reason                                                    |
| --------------------------------- | ----------- | --------------------------------------------------------- |
| Admin content editor UI           | Phase 2     | AI writes files directly; no human editor needed for MVP  |
| System dashboard UI               | Phase 2     | Logic-first; all functions testable via CLI               |
| WebAuthn admin auth               | Phase 2     | No user sessions in this flow                             |
| Comment system                    | Phase 2     | ZEN.js integration                                        |
| Video content pipeline            | Phase 2+    | Images only for MVP                                       |
| Image resize / media CDN          | Phase 2     | AI provides image URL directly in meta.json               |
| Full-text search                  | Phase 2     | SQL.js removed for MVP                                    |
| ZEN.js integration                | Phase 2     | Multi-author, realtime sync                               |
| Deploy automation / CI-CD         | Deferred    | Local-first first; deploy decision pending                |
| Dark mode                         | Not planned | No revenue impact                                         |
| GA4 / GSC                         | Post-MVP    | 2 lines of HTML in `<head>` — not a feature, not blocking |
| Content optimization / AI rewrite | Phase 2     | Needs traffic data first; no value before MVP has users   |

---

## Success Metrics

***Build Pipeline Health***

- Build success rate ≥ 99% (≤ 1 failed build per 100 runs)
- Incremental build < 60s for ≤ 1,000 changed files
- Zero build failures caused by a single malformed Markdown file

***Content Delivery***

- All articles reachable at correct URL within 5 minutes of build completing
- Open Graph tags render correctly on Facebook Sharing Debugger
- Sitemap.xml accepted by Google Search Console

***Revenue Pipeline***

- AdSense script present and loading on every article page
- Google PageSpeed Insights score ≥ 85 on mobile
- Social MCP post preview renders OG image + title correctly on Facebook

***Scale***

- System handles 50 new articles/day without build time degradation
- Adding locale: config change + rebuild only — zero code changes
- Adding category: config change + rebuild only — zero code changes

---

## Technical Constraints

- JavaScript ES modules, no TypeScript, no JSX
- Native Web Components, light DOM only — no `attachShadow` on `cms-page` or `cms-list`
- Leading `/` import paths for browser modules (`/core/DB.js`)
- `build/` directory never edited manually — always regenerated
- Single config source: `cms/config.yaml`
- No npm packages at any layer — zero dependencies
- Node.js 18+ for build; modern browsers for runtime

---

## Locked Decisions

| Decision               | Answer                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Locales                | 18-locale infrastructure, config-driven. Launch: `en` only                                                                                                                                       |
| Project structure      | In-place refactor of akao shop — not a new project                                                                                                                                               |
| Categories             | Config-driven via `cms/config.yaml` — never hardcoded                                                                                                                                            |
| Deploy target          | Deferred — local-first first; build designed config-driven for easy swap                                                                                                                         |
| Dependencies           | Zero — not even devDependencies; all parsers inline                                                                                                                                              |
| Admin UI               | Phase 2; logic-first approach                                                                                                                                                                    |
| SQL layer              | Removed for MVP; re-add when search is scoped                                                                                                                                                    |
| Build trigger          | Manual `npm run build:cms`; file watcher Phase 2                                                                                                                                                 |
| Image handling         | URL passthrough in `meta.json` `image` field — no processing                                                                                                                                     |
| Content file structure | `content/posts/{status}/YYYY/MM/DD/XX/YY/<locale>.md + meta.json`. Chunked 2-digit ID (e.g., 1042 → `/10/42/`) caps fan-out at 100 subfolders per level — VS Code stays usable at 330K articles. |
| Status management      | Factory-model folders: `draft/`, `published/`, `archived/`. Build recurses `published/` only. Status is structural, never a file field.                                                          |
| Metadata format        | `meta.json` (JSON, not YAML). No frontmatter fence in `.md` files. `JSON.parse()` is zero-dep, V8-native, throws with position on errors.                                                        |

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
  ga4_measurement_id: G-XXXXXXXXXX  # optional — inject 2-line snippet vào <head> nếu có

quality_gate:
  min_word_count: 600      # < 600 = ERROR, block publish, log to errors.log, AI retry
```

---

## Meta Schema — Locked

Each article is a folder containing:

- `<locale>.md` — body only, no `---` frontmatter fence
- `meta.json` — all metadata

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

Fields removed vs old frontmatter schema:

- `draft` — removed; draft status = article lives in `content/posts/draft/` folder
- `status` — removed; status = folder position (`draft/`, `published/`, `archived/`)

Folder position → build behavior:

| Folder       | Build behavior                                                      |
| ------------ | ------------------------------------------------------------------- |
| `published/` | Built and deployed                                                  |
| `draft/`     | Never scanned — invisible to build                                  |
| `archived/`  | `build/{path}/index.html` written as redirect stub — URL never 404s |

---

## Build Output Contract — Locked

```text
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

```text
✅ AI Agent writes meta.json + <locale>.md to content/posts/published/YYYY/MM/DD/XX/YY/
✅ npm run build:cms succeeds with zero errors
✅ build/{locale}/{category}/{slug}/index.html exists with complete HTML
✅ AdSense script present on page (in initial HTML, not deferred)
✅ Open Graph tags correct → validated with Facebook Sharing Debugger
✅ sitemap.xml contains URL of new article
✅ rss.xml contains entry for new article
✅ Social MCP posts article link to Facebook, preview renders with OG image
✅ Incremental build: add 1 article → only 1 file rebuilt
✅ Add locale to config.yaml → rebuild → new locale online, zero code changes
✅ Add category to config.yaml → rebuild → new listing route exists, zero code changes
✅ Quality gate rejects article < 300 words, logs to errors.log
✅ 1 bad article does not crash the build — errors.log has enough detail for AI to self-fix
✅ No <script> tag in any emitted HTML is missing defer or type="module" — verified by build pipeline (FR-2.8)
```
