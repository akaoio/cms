# Epics & Stories — Akao CMS

**Status:** ✅ Updated — 2026-06-02 (boss revise round 2: file structure, factory folders, JSON meta, perf)
**Full document:** `_bmad-output/planning-artifacts/epics.md`

---

## Summary

| Epic       | Title                          | Stories       | FRs Covered          |
| ---------- | ------------------------------ | ------------- | -------------------- |
| **Epic 1** | Content Build Pipeline         | 11 (1.0–1.10) | 19 FRs + boss revise |
| **Epic 2** | Reading Experience & Revenue   | 5 (2.1–2.5)   | 9 FRs                |
| **Epic 3** | Integration & Launch Readiness | 4 (3.1–3.4)   | All FRs (validation) |

***Total: 20 stories across 3 epics***

**Changes from boss revise round 1 (2026-06-02):**

- Story 1.0: config.yaml schema expanded (default_og_image, ga4, quality_gate)
- Story 1.2: frontmatter schema expanded (fb_caption, publish_at, status, updated_at)
- Story 1.4: quality gate added (word count 300/600, duplicate slug, publish_at logic)
- Story 1.7: REWRITTEN — pattern-based routing (not per-article)
- Story 1.8: og:image fallback + updated_at in JSON-LD
- Story 1.10: NEW — index.json pagination (trigger at 5K articles)
- Story 3.4: GA4 added to DoD

**Changes from boss revise round 2 (2026-06-02):**

- Story 1.0: REWRITTEN — factory-model folder structure (`draft/`, `published/`), fixtures use new layout
- Story 1.1: REWRITTEN — was "Inline YAML Parser", now "Meta Reader + Validator" (`src/cms/meta.js`)
- Story 1.2: REWRITTEN — was "Frontmatter Parser", now "Markdown Body Loader" (no fence splitting)
- Story 1.4: Updated ingest path to `content/posts/published/**` only; `draft/` exclusion is structural
- Story 3.1: TBT < 200ms added to Lighthouse gate
- Story 3.2: Perf verifier added — assert no undeferred `<script>` in emitted HTML

---

## Epic 1: Content Build Pipeline

> `npm run build:cms` produces valid, SEO-ready, hash-signed HTML with sitemap, RSS, and correct routes — zero npm dependencies.

### Story 1.0 — Project Bootstrap *(prerequisite)*

**Goal:** Clean repo, correct factory-model folder structure, test fixtures committed before any parser code is written.

**DoD:**

- `git checkout -b feat/cms-refactor` done
- All eCommerce/DeFi code deleted — `npm run build:core` still passes
- `src/cms/config.yaml` exists with ALL required keys:
  - `site.default_og_image` — fallback OG image URL
  - `analytics.ga4_measurement_id` — GA4 ID (post-MVP, optional key, no-op if absent)
  - `quality_gate.min_word_count: 600`
- Factory-model folder structure created:

  ```text
  content/posts/draft/
  content/posts/published/
  content/posts/archived/
  content/pages/
  ```

- `src/cms/__test__/fixtures/` created with the following layout (mirrors production structure):

  ```text
  src/cms/__test__/fixtures/
  ├── published/2026/06/01/00/01/
  │   ├── en.md          ← valid article body (no frontmatter fence)
  │   └── meta.json      ← all required fields present
  ├── draft/2026/06/01/00/02/
  │   ├── en.md
  │   └── meta.json      ← valid but in draft/ → must NOT appear in build
  ├── published/2026/06/01/00/03/
  │   ├── en.md
  │   └── meta.json      ← missing "title" → should fail validation
  ├── published/2026/06/01/00/04/
  │   └── meta.json      ← { "title": "Barça: el partido", ... } — colon in title
  ├── published/2026/06/01/00/05/
  │   └── meta.json      ← category with Unicode characters
  ├── published/2026/06/01/00/06/
  │   └── en.md          ← < 300 words (thin content)
  └── published/2026/06/01/00/07/
      └── meta.json      ← publish_at = 2099-01-01 (future date → skip silently)
  ```

- `npm run build:cms` registered in package.json (no-op stub OK)

---

### Story 1.1 — Meta Reader + Validator

**File:** `src/cms/meta.js`  
**Why first:** Replaces both `yaml.js` (dropped) and `frontmatter.js` (dropped). All article metadata now lives in `meta.json` — read via `FS.load()` which auto-parses `.json` files natively. No custom parser needed.

**DoD:**

- `readMeta(articleDir)` → calls `FS.load([...articleDir, 'meta.json'])` → returns parsed object
- Validates required fields: `title`, `date`, `category` — throws `{ code: 'MISSING_FIELD', field, dir }` on missing
- Optional fields passed through: `slug`, `tags`, `description`, `image`, `lang`, `fb_caption`, `publish_at`, `updated_at`
- **No `draft` or `status` field** — status is determined by folder position, not field value
- Test suite `src/cms/__test__/meta.test.js` using all 7 fixtures from Story 1.0 — passes with zero dependencies
- Zero external imports (`FS.js` is a core module, not a dependency)

---

### Story 1.2 — Markdown Body Loader

**File:** `src/cms/markdown.js`  
**Note:** `frontmatter.js` is eliminated — no `---` fence to split. Body `.md` files contain article content only.

**DoD:**

- `parseMarkdown(bodyText)` → returns HTML string
- Body files have NO frontmatter fence — first character of `.md` is article content
- Supports: h1–h6, bold, italic, inline code, code block, link, image, unordered list, ordered list, blockquote, `---` rule
- ~150–180 lines, zero external imports
- Test suite covers all element types using fixture body files from Story 1.0

---

### Story 1.3 — Markdown to HTML Converter

**File:** `src/cms/markdown.js`

**DoD:**

- Supports: h1–h6, bold, italic, inline code, code block, link, image, unordered list, ordered list, blockquote, `---`
- ~150–180 lines, zero external imports
- Test suite covers all element types

---

### Story 1.4 — Build Pipeline Entry + Quality Gate + Error Reporting

**Files:** `builder/cms.js`, `builder/cms/pipeline.js`, `builder/cms/errors.js`

**DoD:**

- `npm run build:cms` runs full pipeline
- `ingest.js` recurses `content/posts/published/**` only — `draft/` and `archived/` folders never touched
- One bad article folder → logged to `build/errors.log` as `{ ts, dir, error }`, build continues
- Build exits code 0, prints "N articles, M errors, K warnings"
- **Quality gate (automation without human):**
  - `word_count < 600` → ERROR: skip + `errors.log { code: "THIN_CONTENT", wordCount, dir }` → AI reads log, auto-retries
  - `duplicate slug` → ERROR: skip + `errors.log { code: "DUPLICATE_SLUG", slug }`
  - `publish_at > now` → SKIP silently (scheduled content, not error)
  - Articles in `archived/` → write redirect stub HTML (URL never 404s)
- 10 articles: 1 thin (<600w), 1 future-dated, 1 missing-title, 1 in draft/ → 6 built, 2 errors, 2 skipped

---

### Story 1.5 — Hash Generation + Incremental Build

**Files:** `src/cms/index.js` (hash diff logic), `builder/cms/pipeline.js`

**DoD:**

- Every HTML output has sibling `.hash` file (SHA-256)
- `build/manifest.json` schema: `{ v:1, built:ISO8601, entries:{ slug:{ hash, locale, category } } }`
- Unchanged file → skipped on next build run
- Crash recovery: `manifest.tmp.json` existence → force full rebuild
- 1,000 changed files build in < 60s

---

### Story 1.6 — Content Index + Config System

**Files:** `src/cms/config.js`, `src/cms/index.js`

**DoD:**

- `config.js` loads `src/cms/config.yaml`, returns frozen object, throws on missing required keys
- `build/index.json` contains all published articles: `{ slug, title, date, category, tags, description, locale, url }`
- `active: [en, es]` in config → HTML output in both `build/en/` and `build/es/`
- Adding category to config → articles with that category appear in index — zero code changes

---

### Story 1.7 — Route Registration (Pattern-Based) ⚠️ REWRITTEN

**File:** `builder/cms/routes-inject.js`
**Boss revise R4:** Per-article injection = 50MB at 330K articles. Pattern-based instead — constant size forever.

**DoD:**

- `routes.json` contains **4 pattern entries** only — never grows with article count:

  ```json
  { "pattern": "/{locale}/{category}/{slug}/", "component": "cms-page" }
  { "pattern": "/{locale}/{category}/",        "component": "cms-list" }
  { "pattern": "/{locale}/tag/{tag}/",         "component": "cms-list" }
  { "pattern": "/{locale}/{page}/",            "component": "cms-page" }
  ```

- `routes.json` file size stays constant regardless of article count
- SPA Router.js resolves `/en/sports/my-article/` to `cms-page` via pattern match
- Build runs 1,000 times → `routes.json` unchanged (idempotent)
- **NEVER injects per-article paths** — this story does NOT add individual article entries

---

### Story 1.8 — SEO Module + GA4 Injection

**File:** `src/cms/seo.js`, `builder/cms/render.js`

**DoD:**

- Every rendered HTML page contains: `<title>`, `<meta name="description">`, `<link rel="canonical">`
- All 5 OG tags present: `og:title`, `og:description`, `og:image`, `og:url`, `og:type="article"`
- **og:image fallback (boss revise Gap 2):** `meta.image || config.site.default_og_image || ""`
- **fb_caption in OG (boss revise Gap 1):** `<meta property="og:description">` uses `fb_caption` if present, else `description[:160]`
- JSON-LD Article schema with: `headline`, `datePublished`, `description`, `image`
- **updated_at → dateModified:** `"dateModified": meta.updated_at || meta.date`
- **GA4 injection:** if `config.analytics.ga4_measurement_id` exists → inject `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXX">` + gtag init in `<head>`
- Facebook Sharing Debugger validates OG preview correctly with image visible

---

### Story 1.9 — Sitemap + RSS + robots.txt

**File:** `src/cms/feed.js`

**DoD:**

- `build/sitemap.xml` has `<url>` for every published article in every active locale
- `build/rss.xml` has RSS 2.0 entries for latest 20 articles per category per locale
- `build/robots.txt` has `Allow: /` and `Sitemap: {site.url}/sitemap.xml`
- Sitemap accepted by Google Search Console validator

---

### Story 1.10 — index.json Pagination *(trigger-based — implement when count > 5K)*

**File:** `src/cms/index.js`, `builder/cms/pipeline.js`
**Boss revise R3:** 330K articles × 200 bytes = 66MB browser download. Must paginate before scale.

**Trigger:** Implement this story when total article count exceeds 5,000 (50% buffer before 10K danger threshold).

**DoD:**

- Build pipeline checks article count. If > 5,000: emit warning. If > 8,000: emit error and halt.
- **Paginated output replaces single `build/index.json`:**

  ```text
  build/index/{locale}/{category}/page-1.json   ← 20 articles each (~4KB)
  build/index/{locale}/{category}/page-2.json
  build/index/{locale}/{category}/meta.json     ← { total, pages, category, locale }
  ```

- `<cms-list>` fetches page-N.json based on URL query param `?page=N`
- `build/index.json` kept as compatibility shim (first page only) until cms-list is updated
- No change to `build/manifest.json` or article HTML structure

---

## Epic 2: Reading Experience & Revenue

> Readers can navigate, read articles, and AdSense loads correctly. All Web Components use light DOM — no `attachShadow`.

### Story 2.1 — Article, Category, Tag, Static Page Routes

**Files:** `src/UI/routes/article/[locale]/[category]/[slug]/`, `src/UI/routes/category/[category]/`, `src/UI/routes/tag/[tag]/`, `src/UI/routes/page/[slug]/`

**DoD:**

- `/en/sports/my-article/` loads pre-rendered HTML
- `/en/sports/` loads category listing
- `/en/tag/football/` loads tag listing
- `/en/about/` loads static page
- All navigation via SPA router — no full page reload

---

### Story 2.2 — cms-list Web Component

**File:** `src/UI/components/cms-list/index.js`

**DoD:**

- Renders into `this` (light DOM) — `attachShadow` NOT present in file
- Fetches `build/index.json` via DB.js, filters by category or tag from URL params
- `disconnectedCallback` removes all Context subscriptions

---

### Story 2.3 — cms-page Web Component

**File:** `src/UI/components/cms-page/index.js`

**DoD:**

- Renders into `this` (light DOM) — `attachShadow` NOT present in file
- Loads article HTML from `build/{locale}/{category}/{slug}/` via DB.js
- Three ad slot containers present: `id="ad-top"`, `id="ad-mid"`, `id="ad-bottom"`
- Re-renders on route change without full page reload
- `disconnectedCallback` cancels subscriptions + pending fetches

---

### Story 2.4 — AdSense Slot Wiring

**DoD:**

- AdSense `<script>` with `publisher_id` from `src/cms/config.yaml` in page HTML
- Ad containers are direct light DOM children — NOT inside any Shadow DOM
- Containers have NO `contain`, `transform`, `will-change`, `filter` CSS
- Correct slot IDs from `src/cms/config.yaml` `adsense.slots`
- AdSense iframe renders on mobile Chrome

---

### Story 2.5 — SPA Link Interception + Cleanup

**DoD:**

- Internal article links → SPA router handles navigation, no full reload
- Browser back button works correctly after SPA navigation
- 10 sequential article navigations → no memory leak from subscription accumulation

---

## Epic 3: Integration & Launch Readiness

> Full pipeline verified end-to-end. All DoD criteria confirmed before launch.

### Story 3.1 — End-to-End Integration Test

**File:** `src/cms/__test__/integration.js`

**DoD:**

- Test: write `meta.json + en.md` to `published/` → `build:cms` → HTML exists → OG tags present → hash exists → sitemap has URL
- `build/errors.log` empty for valid content
- Lighthouse score ≥ 85, LCP < 2.5s, CLS < 0.1, **TBT < 200ms**

---

### Story 3.2 — Verifier Enforcement (AdSense Compliance)

**File:** `akao-skill/scripts/verify.js` (update)

**DoD:**

- Asserts `cms-page/index.js` does NOT contain `"attachShadow"`
- Asserts `cms-list/index.js` does NOT contain `"attachShadow"`
- **Performance check:** grep any generated `build/**/*.html` for `<script` without `defer`/`async`/`type="module"` → exit non-zero if found
- Exits non-zero with clear error if any check fails
- Reports all 29+ existing checks + 2 AdSense checks + 1 perf check

---

### Story 3.3 — Single-Locale Build Flag + Scale

**DoD:**

- `npm run build:cms -- --locale es` builds only Spanish, leaves other locales untouched
- Per-category parallelism via `Threads.js` reduces full rebuild time
- 50 new files incremental build completes < 60s

---

### Story 3.4 — DoD Validation + Launch Readiness

**DoD — all items confirmed ✅:**

- AI writes .md → build succeeds
- HTML at correct URL in browser
- AdSense script on every article page
- OG tags valid → **Facebook Sharing Debugger shows image** (og:image fallback working)
- **fb_caption present** in OG description → Social MCP post shows hook text, not SEO description
- Sitemap.xml → Google Search Console accepted
- RSS feed has entries
- Social MCP posts article → preview renders with image + fb_caption
- 1 article changed → 1 file rebuilt (incremental)
- Add locale in config → online, zero code changes
- Add category in config → listing route exists, zero code changes
- **thin-content.md (< 300 words) → errors.log, not published**
- **future-publish.md → skipped silently, not published**
- **GA4 tag fires** on article page (verify in GA4 Realtime)
- `routes.json` has 4 pattern entries only — constant size
- All `cms/docs/` documentation accurate and complete

---

## FR → Story Mapping

| FR     | Story                 |
| ------ | --------------------- |
| FR-1.1 | Story 1.1             |
| FR-1.2 | Story 1.2             |
| FR-1.3 | Story 1.1             |
| FR-1.4 | Story 1.4             |
| FR-1.5 | Story 1.0 + Story 1.4 |
| FR-1.6 | Story 1.1             |
| FR-2.1 | Story 1.4             |
| FR-2.2 | Story 1.5             |
| FR-2.3 | Story 1.5             |
| FR-2.4 | Story 1.6             |
| FR-2.5 | Story 1.6             |
| FR-2.6 | Story 1.6             |
| FR-3.1 | Story 2.1             |
| FR-3.2 | Story 2.1             |
| FR-3.3 | Story 2.1             |
| FR-3.4 | Story 2.1             |
| FR-3.5 | Story 1.7             |
| FR-4.1 | Story 1.8             |
| FR-4.2 | Story 1.8             |
| FR-4.3 | Story 1.8             |
| FR-4.4 | Story 1.9             |
| FR-4.5 | Story 1.9             |
| FR-4.6 | Story 1.9             |
| FR-5.1 | Story 2.3             |
| FR-5.2 | Story 2.2             |
| FR-5.3 | Story 2.4             |
| FR-5.4 | Story 2.5             |
| FR-5.5 | Story 2.5             |
