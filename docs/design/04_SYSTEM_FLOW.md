# System Flow — Akao CMS Revenue Pipeline

Describes the role of Akao CMS in the automated content + AdSense revenue system.

---

## Three Components, Three Roles

| Component      | Exact Role                                                                     | Location                                    |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------- |
| **Akao CMS**   | HTML printing machine with AdSense — takes Markdown, outputs a working website | `/Users/mac/Documents/freelancer/shop`      |
| **Social MCP** | Traffic pump from Facebook to website                                          | `/Users/mac/Documents/freelancer/socialmcp` |
| **AI Agents**  | Automated workforce: writes content + triggers pipeline                        | External (Claude, GPT...)                   |

---

## Data Flow Diagram

```
┌──────────────────┐   Markdown files      ┌─────────────────────────┐
│   AI AGENTS      │ ─────────────────────→│        AKAO CMS         │
│                  │                        │                         │
│  - Text gen      │ ←── trigger build ─── │  content/posts/*.md     │
│  - Image gen     │                        │  npm run build:cms      │
│  - Scheduler     │                        │  → HTML + AdSense       │
│                  │                        │  → sitemap.xml + rss    │
└────────┬─────────┘                        │  → build/errors.log     │
         │                                  └──────────┬──────────────┘
         │ MCP tool calls                              │ Static HTML
         │ post(url, teaser)                           │ + .hash files
         ↓                                             ↓
┌──────────────────┐                        ┌─────────────────────────┐
│   SOCIAL MCP     │                        │   CDN / Website         │
│                  │                        │                         │
│  Chrome Ext      │   User clicks link     │  Pre-rendered HTML      │
│  + MCP Server    │ ──────────────────────→│  Light DOM AdSense slots│
│                  │                        │  OG tags (FB preview)   │
│  10+ FB Pages    │                        └──────────┬──────────────┘
│  X / Instagram   │                                   │
│  Threads         │                                   │ Impression / Click
└────────┬─────────┘                                   ↓
         │                                  ┌─────────────────────────┐
         │ Organic reach                    │    GOOGLE ADSENSE       │
         ↓                                  │                         │
   Facebook Users  ──── click link ────────→│  Impression → ~$0.001  │
                                            │  Click     → ~$0.05+   │
                                            │  Net 30 → Bank          │
                                            └─────────────────────────┘
```

---

## Automated Trigger Chain (zero humans required)

```
1. AI Agent receives topic/keyword or reads RSS feed
2. AI generates article content (title, body, meta description, image URL)
3. AI writes:
   - content/posts/published/YYYY/MM/DD/XX/YY/<locale>.md  ← body only, no frontmatter
   - content/posts/published/YYYY/MM/DD/XX/YY/meta.json    ← metadata (title, slug, date, category, ...)
4. AI runs: npm run build:cms
   → read meta.json + Markdown body (no frontmatter parsing)
   → generate HTML + .hash files
   → update build/manifest.json (incremental diff)
   → update sitemap.xml + rss.xml
   → write build/errors.log (any failed files)
5. Static HTML live at /[locale]/[category]/[slug]/
6. AI calls Social MCP: post(url, teaser_text) → 10+ FB pages
7. Facebook distributes organically
8. User clicks → CMS page → AdSense loads → impression recorded → $$$
```

---

## CMS Features That Directly Affect Revenue

| Feature                                     | Revenue Impact                                     | Priority   |
| ------------------------------------------- | -------------------------------------------------- | ---------- |
| Page load speed (static CDN)                | Low bounce rate = more impressions                 | ❗ Critical |
| AdSense script in correct position          | High CTR = higher CPC                              | ❗ Critical |
| Open Graph tags (title, description, image) | Good FB preview = higher CTR from Social MCP posts | ❗ Critical |
| Clean URL + canonical                       | Correct SEO indexing                               | ❗ Critical |
| Sitemap.xml                                 | Google crawls faster                               | ❗ Critical |
| RSS feed                                    | AI Agent uses as content source                    | ❗ Critical |
| Meta title/description                      | Organic Google traffic                             | 🔥 High     |
| Incremental build                           | Scale to 330K+ pages without slowdown              | 🔥 High     |

---

## Scale Requirements

```
Operating assumptions:
  - 10 Facebook pages
  - 5 posts/page/day
  - Start: 1 locale (English)
  - Expand: up to 18 locales

Phase 1 (1 locale):
  10 pages × 5 posts = 50 articles/day
  50 articles/day × 30 days = 1,500 articles/month

Phase 2 (18 locales):
  50 source articles × 18 locales = 900 Markdown files/day
  After 1 year: ~330,000 HTML pages on CDN
```

**Critical bottleneck:** Build time. Incremental build from day 1 — only rebuild changed files.

---

## Why Akao Beats WordPress / Ghost for This Use Case

| Criteria                | WordPress                          | Ghost            | **Akao**                      |
| ----------------------- | ---------------------------------- | ---------------- | ----------------------------- |
| Hosting cost            | $600+/year                         | $108+/year       | **$0 (CDN)**                  |
| AI integration          | REST API + auth + cache invalidate | API + DB write   | **Write file → done**         |
| 330K pages              | DB query lag, cache complexity     | Limited          | **Flat CDN, unlimited**       |
| 18 locales              | WPML $200/year plugin              | Not native       | **Core feature, free**        |
| AdSense reliability     | Plugin conflict risk               | Theme edit       | **Direct HTML, full control** |
| Security attack surface | CVEs, xmlrpc, wp-admin             | Smaller          | **Zero (static files)**       |
| Time to first byte      | 200–800ms                          | 100–400ms        | **< 50ms (CDN edge)**         |
| Upgrade debt            | React/plugin breakage              | Node.js upgrades | **None — zero deps**          |

**Economic moat:** $0 hosting makes "50 articles/day × $0.10/article/day AdSense RPM" profitable from day one. WordPress requires enough traffic to cover hosting costs before any profit.

---

## Revenue Pipeline Risks

| Risk                                          | Probability        | Impact | Mitigation                                                                 |
| --------------------------------------------- | ------------------ | ------ | -------------------------------------------------------------------------- |
| **AI content spam → AdSense + Facebook flag** | High               | High   | Quality gate before publish; avoid thin content patterns                   |
| **Facebook organic reach decay**              | Very High          | Medium | Industry structural issue; diversify to X, Threads, Instagram              |
| **AdSense policy violation**                  | Medium             | High   | Validate content quality; human review for first 100 articles              |
| **Build pipeline failure**                    | Medium             | Medium | Per-file isolation in build:cms; fail-per-file → errors.log                |
| **CSS containment blocking AdSense**          | Low but definitive | High   | Never use `contain`, `transform`, `will-change`, `filter` on ad containers |

**Risk #1 is not technical:** Content quality. AI generating 900 files/day without quality control = spam signal to both AdSense and Facebook simultaneously.

---

## Social MCP — Specific Role in Pipeline

Social MCP at `/Users/mac/Documents/freelancer/socialmcp`:

**Architecture:**
```
AI Agent → Node MCP Server → Chrome Extension → Content Script → facebook.com
```

**Tools AI calls:** `post(url, teaser_text)`, later: `schedule`, `comment`, `react`

**Goal:** Post article link to multiple FB pages simultaneously, without DOM parsing

**What each Facebook post needs:**
- CMS article URL (required)
- Short teaser text (AI generated)
- Open Graph image preview — CMS must have correct OG tags for Facebook to render correctly
