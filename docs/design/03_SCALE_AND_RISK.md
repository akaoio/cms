# Scale & Risk

**3 phạm vi:** CDN deployment · Đọc/ghi trên CDN · Gaps vs Industry Standard (focus: Workflow)

---

## I. CDN Deployment

### Vấn đề gốc

Pipeline hiện tại dừng ở `npm run build:cms → build/`. Không có bước đưa lên CDN. Manual deploy với 50 bài/ngày: painful nhưng feasible. Với 900 bài/ngày (Phase 2, 18 locales): impossible.

### So sánh 4 options

| CDN              | Deploy command                      | Hard limit             | Chi phí scale                                        | Verdict                              |
| ---------------- | ----------------------------------- | ---------------------- | ---------------------------------------------------- | ------------------------------------ |
| **Netlify**      | `netlify deploy --dir=build --prod` | 500 deploys/day        | Free tier đủ Phase 1                                 | Tốt nhất Phase 1                     |
| **Vercel**       | `vercel deploy --prebuilt`          | 100 deploys/day (free) | $20/tháng/member                                     | Output format mismatch — cần adapter |
| **S3+CF**        | `aws s3 sync` + CF invalidation     | Không có               | ~$0.15/tháng storage; invalidation $0 nếu batch `/*` | Tốt nhất Phase 2                     |
| **GitHub Pages** | `git push gh-pages`                 | 1GB repo, 10GB BW      | Vượt Phase 2                                         | Loại ngay                            |

### Migration path

**Phase 1 (hiện tại → 3 tháng):** Netlify semi-auto

```js
// src/builder/cms.js — sau build hoàn thành
if (process.env.NETLIFY_AUTH_TOKEN && process.env.NETLIFY_SITE_ID) {
    await exec("netlify deploy --dir=build --prod")
}
```

**Phase 2 (>10K articles):** S3 + CloudFront

```bash
aws s3 sync build/ s3://bucket/ --delete --cache-control "public,max-age=31536000"
aws cloudfront create-invalidation --paths "/*"  # một lần sau toàn batch — $0 trong 1000 free
```

Cache headers S3: `index.html`→5min, `*.hash`→1 năm immutable, `manifest.json`→1min, sitemap/RSS→1h.

---

## II. Đọc/Ghi Trên CDN

**Nguyên tắc cơ bản:** CDN = read-only. Mọi write phải qua local machine → build → deploy.

### 5 Risks

**R-A: DB.js hash mismatch khi partial deploy**
`index.html` v2 + `index.hash` v1 → mismatch → force re-fetch loop. Mitigation: Netlify deploy atomic theo snapshot; S3 upload `.hash` trước rồi mới upload `.html`.

**R-B: manifest.json mất → full rebuild 4.5h**
`build/` bị xóa hoặc clone máy mới → manifest mất → 330K files × 50ms = 4.5h rebuild. Mitigation: backup manifest.json lên CDN sau mỗi build thành công. Process lock file chống concurrent builds.

**R-C: index.json tăng đến 66MB**
Phase 2: 330K articles × 200 bytes = 66MB. Browser download 6–8s, Node.js 200MB RAM peak. **Phải fix trước khi vượt 10K articles.**

```text
Thay: build/index.json (toàn bộ)
Bằng: build/index/{locale}/{category}/page-N.json (20 articles/page = 4KB)
```

**R-D: routes.json per-article injection → 50MB**
1M routes × 50 bytes = 50MB. Router.js parse 2–3s → SPA navigation sluggish. **Fix ngay, không phải Phase 2.**

```json
// Thay per-article entries bằng pattern-based:
{ "pattern": "/{date}/{cat1}/{cat2}/{slug}/{locale}/", "component": "cms-page" }
```

routes.json size stays constant dù 330K articles.

**R-E: Stale browser cache sau deploy**
DB.js validate bằng hash nhưng browser phải biết hash đã đổi. Fix đơn giản: `Cache-Control: max-age=300` cho `index.json` → auto-refetch sau 5 phút.

---

## III. Workflow Gaps vs Industry Standard

Tier 1 (7/7 ✅) và Tier 2 (phần build pipeline) solid. Focus vào phần thiếu.

### Akao workflow hiện tại: binary

```text
staged/ folder → build reads, outputs to CDN
draft/  folder → excluded from build
```

### 5 Workflow Gaps

**Gap W1: Không có Scheduled Publishing**
AI generate 50 bài nhưng muốn publish 5/ngày × 10 ngày. AI không có persistent memory → operator flip draft thủ công mỗi ngày. Hoặc flood 50 bài cùng lúc → FB spam signal.

Fix (~20 lines, ROI cao nhất per line):

```yaml
publish_at: 2026-06-05T09:00:00+07:00  # optional
```

```js
if (meta.publish_at && new Date(meta.publish_at) > new Date()) continue
```

**Gap W2: Không có Content State Machine** — **quan trọng nhất**
Cần: `draft → scheduled → staged → flagged → archived`

Thiếu `flagged`: quality gate skip file nhưng không có marker → operator không biết file nào bị skip vì sao.

Thiếu `archived`: AI xóa file → URL chết → 404 → Facebook tracking 404s → giảm reach.

Fix:

Move file to appropriate folder: `draft/` → `staged/` → `archived/` (structural, not a field).

`archived/` folder → write redirect stub thay vì xóa file.

**Gap W3: Revision History chưa operational**
Git trên `content/` = 80% giải pháp nhưng AI không được instructed commit. Hệ quả: không audit được khi Google flag duplicate.

Fix: 1 dòng trong AI workflow instruction:

```bash
git add content/posts/slug.md && git commit -m "content: add slug"
```

**Gap W4: Không có Republish / Update Flow**
Bài published không bao giờ update. Mechanically works (hash change → rebuild) nhưng thiếu `dateModified` trong JSON-LD → Google không detect freshness. Facebook OG cache không tự invalidate.

Fix:

```yaml
updated_at: 2026-07-15  # optional
```

```js
"dateModified": meta.updated_at || meta.date
```

Sau update: invalidate Facebook OG cache qua Graph API.

**Gap W5: Không có Deploy-to-Live Verification**
Build success ≠ live success. CDN propagation 30–120s. routes.json có thể chưa update.

Fix (1 HTTP check sau deploy):

```js
const r = await fetch(`${config.site.url}/${locale}/${category}/${slug}/`)
if (r.status !== 200) { console.error("DEPLOY VERIFY FAILED"); process.exit(1) }
```

---

## IV. Risk Registry (15 risks, sorted by impact × probability)

| #   | Risk                                              | P            | Impact   | Mitigation                                            | Effort  |
| --- | ------------------------------------------------- | ------------ | -------- | ----------------------------------------------------- | ------- |
| R1  | Quality gate absent → AdSense flag domain         | High         | Critical | Word count + duplicate check                          | Low     |
| R2  | Deploy manual → content không live                | High         | High     | netlify deploy trong build script                     | Low     |
| R3  | index.json → 66MB → browser freeze                | Certain (P2) | High     | Paginate trước 10K articles                           | Medium  |
| R4  | routes.json per-article → 50MB                    | Certain (P2) | High     | Pattern routing ngay bây giờ                          | Medium  |
| R5  | Batch flood → FB spam signal                      | High         | Medium   | `publish_at` + date check                             | Low     |
| R6  | og:image blank → CTR loss                         | High         | Medium   | Default OG image trong config                         | Low     |
| R7  | No content state → flagged invisible              | Medium       | Medium   | `status` field                                        | Low     |
| R8  | No revision history → không audit được            | Medium       | Medium   | Git commit instruction cho AI                         | Low     |
| R9  | manifest.json lost → 4.5h rebuild                 | Low          | High     | Backup manifest lên CDN                               | Low     |
| R10 | DB.js hash mismatch partial deploy                | Low          | Low      | Atomic deploy / upload .hash trước                    | Low     |
| R11 | No `dateModified` → Google không detect freshness | Medium       | Medium   | `updated_at` + JSON-LD                                | Low     |
| R12 | No deploy verification → silent fail              | Medium       | Medium   | HTTP check sau deploy                                 | Low     |
| R13 | CloudFront per-file invalidation → $130+/tháng    | Certain (P2) | Medium   | Batch `/*` invalidation                               | Low     |
| R14 | No GA4 → không có traffic data per article        | Certain      | Low      | 2 dòng HTML trong `<head>` — post-MVP, không block gì | Trivial |
| R15 | URL 404 sau archive → FB link rots                | Medium       | Low      | `archived` → redirect stub                            | Medium  |

**10/15 risks có effort Low. Không risk nào đòi thay đổi kiến trúc cốt lõi.**

---

## V. Action Plan

**Ngay hôm nay:** R2 (deploy auto) · R1 (quality gate) · R6 (default OG) · R5 (publish_at)

**Trước khi scale:** R4 (pattern routing — phải làm trước khi implement route injection) · R7 (status field) · R11 (updated_at) · R12 (deploy verify) · R8 (git commit doc)

**Post-MVP:** R14 (GA4 snippet — trivial, 2 dòng HTML, không block MVP)

**Trước Phase 2 (>10K articles):** R3 (paginated index) · R9 (manifest backup) · R13 (S3 + batch invalidation) · R15 (archive redirects)
