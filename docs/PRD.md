# Product Requirements Document — Akao CMS

**Status:** ✅ Updated — 2026-06-02 (boss revise applied: file structure, factory folders, JSON meta, perf)  
**Full document:** `_bmad-output/planning-artifacts/prds/prd-shop-2026-06-01/prd.md`

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

```
AI Agent → writes Markdown → Akao CMS → builds static HTML + AdSense → CDN
                                               ↓
                              Social MCP → Facebook pages → Reader → AdSense $$$
```

Akao CMS is built by stripping the existing akao shop project — removing all eCommerce/DeFi code, keeping core modules, building CMS on top.

---

## Foundation — What Akao Provides

Akao CMS is built on top of the **akao shop project** — an existing framework-free eCommerce engine that happens to have solved the hard infrastructure problems a CMS needs. The eCommerce-specific code is deleted; the core runtime is kept.

Key modules reused (no changes needed to these):

| Module | What it does |
|---|---|
| `DB.js` | Fetches static files from the server, caches them in browser IndexedDB with SHA-256 hash validation. On repeat visits, serves from cache — zero network. Enables true offline reading. |
| `FS.js` | Universal file I/O that works identically in Node.js (build time) and browser (runtime). Automatically parses `.json`, `.yaml`, `.csv` by extension. |
| `UI.js` — `html()` + `render()` | Zero-dependency template engine using JavaScript tagged template literals. `html` creates a template object; `render(template, element)` writes it to the DOM. No Virtual DOM, no JSX. |
| `Router.js` | URL router that extracts locale and dynamic parameters from paths like `/en/sports/my-article`. Locale-aware by design — all URLs are prefixed with locale code. |
| `States.js` | ES6 Proxy-based reactive state. Components subscribe to specific keys; only notified when values actually change. |
| `Context.js` | Global app state (current locale, theme). Persisted to localStorage. |
| `Threads.js` | Web Worker pool manager. Offloads heavy tasks (e.g. Markdown parsing at scale) to background threads so the browser stays responsive. |

**What is Social MCP?** A separate tool (at `/Users/mac/Documents/freelancer/socialmcp`) that lets AI agents post to Facebook, X, Instagram, and Threads by calling simple commands like `post(url, text)` — without parsing the DOM of those sites.

---

## Actors

| Actor | Role | Interacts Via |
|---|---|---|
| **AI Agent** | Primary operator — writes Markdown, triggers build, calls Social MCP | CLI + filesystem |
| **End Reader** | Revenue source — clicks from Facebook, generates AdSense impressions | Browser |
| **Developer / Operator** | Configures system, debugs builds, adds locales/categories | CLI + config files |

---

## Functional Requirements

### FR-1 — Content Ingestion

| ID | Requirement |
|---|---|
| FR-1.1 | Read article metadata from `meta.json` — fields: `title` (req), `slug` (opt), `date` (req, ISO 8601), `category` (req), `tags` (opt array), `description` (req), `image` (opt URL), `lang` (opt), `fb_caption` (opt), `publish_at` (opt, ISO 8601), `updated_at` (opt, ISO 8601). Parsed via native `JSON.parse()` — no YAML, no custom parser. |
| FR-1.2 | Convert Markdown body to HTML — `# h1–h6`, `**bold**`, `*italic*`, `` `code` ``, ` ```block``` `, `[link](url)`, `![img](url)`, `- list`, `1. list`, `> blockquote`, `---` |
| FR-1.3 | JSON metadata — each article is a folder containing `<locale>.md` (body only, no frontmatter fence) + `meta.json`. Metadata parsed via native `JSON.parse()` — zero dependencies, no eval, no third-party library. |
| FR-1.4 | Per-file error isolation — one bad article folder skipped, logged to `build/errors.log`, build continues |
| FR-1.5 | Draft exclusion — build pipeline only recurses into `content/posts/published/`. Files in `content/posts/draft/` and `content/posts/archived/` are never read. Status is structural (folder position), not textual (field value). |
| FR-1.6 | Required field validation — articles missing `title`, `date`, `category` in `meta.json` rejected with structured error |

### FR-2 — Build Pipeline

| ID | Requirement |
|---|---|
| FR-2.1 | `npm run build:cms` → `build/{locale}/{category}/{slug}/index.html` + `build/manifest.json` + `build/index.json` |
| FR-2.2 | SHA-256 hash for every HTML output; `.hash` file written alongside — feeds DB.js offline cache contract |
| FR-2.3 | Incremental build — `build/manifest.json` stores `{ slug: contentHash }`; only changed files rebuilt |
| FR-2.4 | Config-driven locale activation — `cms/config.yaml` `active: [en]`; adding locale = config change + rebuild, zero code changes |
| FR-2.5 | Config-driven categories — adding category = config change + rebuild, zero code changes |
| FR-2.6 | 18-locale infrastructure — pipeline supports all 18 locales; only `active` ones are built |

### FR-3 — Routing & Pages

| ID | Requirement |
|---|---|
| FR-3.1 | Article page — `/{locale}/{category}/{slug}/` |
| FR-3.2 | Category listing — `/{locale}/{category}/` |
| FR-3.3 | Tag listing — `/{locale}/tag/{tag}/` |
| FR-3.4 | Static pages — `/{locale}/about/`, `/contact/`, `/privacy-policy/` |
| FR-3.5 | Routes auto-injected into `routes.json` at build time — no manual registration |

### FR-4 — SEO & Distribution

| ID | Requirement |
|---|---|
| FR-4.1 | Per-page meta: `<title>`, `<meta name="description">`, `<link rel="canonical">` |
| FR-4.2 | Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type` — required for Social MCP Facebook preview |
| FR-4.3 | JSON-LD Article structured data per article page |
| FR-4.4 | `sitemap.xml` per active locale — auto-generated from content index |
| FR-4.5 | `rss.xml` per category per active locale — latest 20 articles |
| FR-4.6 | `robots.txt` — allows all crawlers, references sitemap URLs |

### FR-5 — Web Components

| ID | Requirement |
|---|---|
| FR-5.1 | `<cms-page>` — renders article HTML via DB.js + `html()` + `render()`; **light DOM only** |
| FR-5.2 | `<cms-list>` — article listing by category/tag; supports filtering; **light DOM only** |
| FR-5.3 | AdSense ad slots as named light DOM elements: `ad-top`, `ad-mid`, `ad-bottom` — **not inside Shadow DOM** |
| FR-5.4 | Link interception — internal links intercepted by SPA router, no hard reload |
| FR-5.5 | `disconnectedCallback` cleanup — all subscriptions removed on unmount |

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Zero dependencies** — no npm packages at runtime, build time, or devDependencies. Everything inline. |
| NFR-2 | **Build performance** — incremental build < 60s for ≤ 1,000 changed files. Full rebuild < 10 min for 330,000 files. Hash-based diff, not mtime. |
| NFR-3 | **Page performance** — LCP < 2.5s, CLS < 0.1, TBT < 200ms on mobile. Pre-rendered, no client-side article rendering. All `<script>` tags in emitted HTML must use `defer` or `type="module"`. No synchronous fetch or parse on main thread during page load. JS and static JSON loaded in background after paint. |
| NFR-4 | **Isomorphic runtime** — `DB.js`, `FS.js`, `UI.js`, `States.js` run identically in Node.js (build) and browser (runtime). |
| NFR-5 | **Fault isolation** — one bad Markdown file never blocks the build. All failures logged to `build/errors.log`. |
| NFR-6 | **Content safety gate** — missing required `meta.json` fields = rejected. Files in `draft/` and `archived/` folders excluded structurally (not scanned by ingest, never a runtime flag check). |

---

## User Journeys

### UJ-1 — AI Agent publishes an article (primary flow)

```
1. AI generates: title, body, meta description, image URL
2. AI writes:
   - content/posts/published/YYYY/MM/DD/XX/YY/en.md  ← body only, no frontmatter
   - content/posts/published/YYYY/MM/DD/XX/YY/meta.json  ← metadata (title, slug, date, category, ...)
   (XX/YY = article ID chunked into 2-digit pairs; max 100 subfolders per level)
3. AI runs: npm run build:cms
4. Build:
   - Recursively scan published/** only (draft/ never touched)
   - Read meta.json via JSON.parse → validate required fields
   - Read <locale>.md body → Convert Markdown → HTML
   - Compute SHA-256 hash → write .hash file
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

```
1. Edit cms/config.yaml: add "technology" to categories list
2. Run: npm run build:cms
3. /{locale}/technology/ listing route generated automatically
4. AI can now write articles with category: technology
5. Zero code changes required
```

### UJ-3 — Operator activates a new locale

```
1. Edit cms/config.yaml: add "es" to active locales
2. Run: npm run build:cms
3. /es/{category}/{slug}/ routes generated for all content with lang: es
4. Spanish sitemap.xml generated automatically
5. Zero code changes required
```

---

## Out of Scope — MVP

| Feature | Status |
|---|---|
| Admin content editor UI | Phase 2+ |
| System dashboard UI | Phase 2 |
| Comment system | Phase 2 (ZEN.js) |
| Video pipeline, image CDN | Phase 2+ |
| Deploy automation / CI-CD | Deferred — local first |
| Full-text search | Phase 2 (SQL.js) |
| Dark mode, offline PWA | Not planned |

---

## Success Metrics

**Build Pipeline Health**
- Build success rate ≥ 99% (≤ 1 failed build per 100 runs)
- Incremental build < 60s for ≤ 1,000 changed files
- Zero build failures caused by a single malformed Markdown file

**Content Delivery**
- All articles reachable at correct URL within 5 minutes of build completing
- Open Graph tags render correctly on Facebook Sharing Debugger
- Sitemap.xml accepted by Google Search Console

**Revenue Pipeline**
- AdSense script present and loading on every article page
- Google PageSpeed Insights score ≥ 85 on mobile
- Social MCP post preview renders OG image + title correctly on Facebook

**Scale**
- System handles 50 new articles/day without build time degradation
- Adding locale: config change + rebuild only — zero code changes
- Adding category: config change + rebuild only — zero code changes

---

## Technical Constraints

- JavaScript ES modules, no TypeScript, no JSX
- Native Web Components + Shadow DOM — no framework
- Leading `/` import paths for browser modules (`/core/DB.js`)
- `build/` directory never edited manually — always regenerated
- Single config source: `cms/config.yaml`
- No npm packages at any layer — zero dependencies
- Node.js 18+ for build; modern browsers for runtime
