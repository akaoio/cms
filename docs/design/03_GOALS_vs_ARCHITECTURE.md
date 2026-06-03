# GOALS vs ARCHITECTURE — Đối Chiếu

**Score: 8 fully covered / 4 partial / 4 absent (trong 16 requirements)**

---

## Scorecard

```
Layer 1 — AdSense fires:       3/4  ✅✅⚠️✅   (thiếu: quality gate)
Layer 2 — Facebook traffic:    2/4  ✅⚠️❌✅   (thiếu: og:image fallback, fb_caption)
Layer 3 — Pipeline automation: 3/4  ⚠️✅✅✅   (thiếu: auto build trigger)
Layer 4 — Protect assets:      0/2  ⚠️❌       (thiếu: quality gate, invalid traffic doc)
Layer 5 — Feedback loop:       0/2  ❌❌        (thiếu: GA4, AdSense reporting)
```

---

## Những gì ARCHITECTURE làm tốt

- **Build pipeline core** — ingest→parse→render→output chain solid. ADR-001–004, Pattern 1–6.
- **SEO layer** — FR-4.1–4.6 đầy đủ: title, description, canonical, OG, JSON-LD, sitemap, RSS, robots.txt.
- **Fault isolation** — per-file try/catch + machine-readable errors.log. Được think through nhất.
- **AdSense delivery** — light DOM (no Shadow DOM), named slots, IDs từ config. Rationale rõ.
- **Zero-dependency** — NFR-1 nghiêm: inline YAML parser, inline Markdown converter.

---

## 5 Gaps + Fix

### Gap 1 — fb_caption không tồn tại (GOALS #7) — **P0**
PRD UJ-1 mention `post(url, teaser)` nhưng không define teaser từ đâu. Frontmatter không có field này.

SEO description ≠ Facebook caption — hai format khác nhau hoàn toàn.

**Fix:**
- Thêm `fb_caption` (optional) vào frontmatter schema
- Fallback: `fb_caption || description`
- AI instruction explicitly generate field này

---

### Gap 2 — og:image không có fallback (GOALS #6) — **P0**
`image:` là URL passthrough, không validate, không fallback. AI bỏ trống → blank Facebook preview → CTR ~0.

**Fix (2 dòng):**
```yaml
# cms/config.yaml
site:
  default_og_image: https://example.com/default-og.jpg
```
```js
og:image = meta.image || config.site.default_og_image || ""
```

---

### Gap 3 — Quality gate chỉ check structure, không check content (GOALS #3, #13) — **P1**
NFR-6 chỉ validate required frontmatter fields. Bài 30 chữ với đủ fields → pass và live.

Thin content (<300 chữ) = AdSense policy violation. 20%+ thin → domain bị flag → recovery mất tháng.

**Fix (~10 lines trong pipeline.js):**
```js
if (wordCount < 300) { appendError(...); continue }
if (manifest.entries[meta.slug]) { appendError(...); continue }
```

---

### Gap 4 — Analytics (GOALS #15, #16) — **Post-MVP**

Hai vấn đề khác nhau hoàn toàn:

**#15 GA4 traffic data** — không phức tạp. CMS không cần track hành vi phức tạp như eCommerce (add to cart, checkout, abandoned cart). Chỉ cần biết bài viết được bao nhiêu người xem, xem bao lâu. Giải pháp là cắm đoạn code cơ bản của Google Analytics vào `<head>` — 2 dòng HTML, không phải một feature. Triển khai lúc nào cũng được sau MVP.

```yaml
analytics:
  ga4_measurement_id: G-XXXXXXXXXX
```

**#16 AdSense per-page RPM** — khác GA4. Cần AdSense Reporting API hoặc manual export từ dashboard. Không có in-pipeline solution. Genuinely deferred.

**Fix cho #15 (~10 lines render.js):** Inject GA4 snippet trong `<head>` nếu `ga4_measurement_id` có trong config. Không cần custom events, không cần programmatic tracking.

---

### Gap 5 — Auto build trigger (GOALS #9) — **P3**
SCOPE Q8 intentionally deferred. AI phải manually run `npm run build:cms`. Miss step → content written nhưng không live.

Được accept trong current design. Phase 2 fix = file watcher hoặc cron.

---

## Summary: Deltas cần làm

| Delta                | File                      | Effort        | Priority |
| -------------------- | ------------------------- | ------------- | -------- |
| D1: fb_caption field | frontmatter schema + UJ-1 | 1 line config | P0       |
| D2: default_og_image | config.yaml + seo.js      | 2 lines       | P0       |
| D3: quality gate     | pipeline.js               | ~10 lines     | P1       |
| D4: GA4 inject       | render.js + config.yaml   | ~10 lines     | Post-MVP |
