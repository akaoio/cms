# GOALS — Minimum Viable CMS (AdSense × Facebook)

**Mô hình:** `AI writes → Facebook drives → AdSense pays`

---

## 16 Requirements (ngược từ mục tiêu)

### Layer 1 — AdSense fires (điều kiện cứng)

1. Static HTML tại URL cố định — crawler không exec JS
2. AdSense slots trong initial HTML — không inject sau hydration
3. Content pass AdSense policy — không thin, không adult, không bạo lực
4. Page load < 3s mobile — viewability + Facebook landing page score

### Layer 2 — Facebook traffic

1. Full OG tags (`og:title/description/image/url`) trong `<head>`
2. `og:image` tồn tại, đúng size 1200×630, load được từ FB crawler IP
3. `fb_caption` per article — hook ngắn, emotion-driven, khác với SEO description
4. Canonical URL ổn định — URL thay đổi sau publish = link chết = traffic mất

### Layer 3 — Pipeline vận hành không cần human

1. AI trigger build không cần manual — 900 bài/ngày = manual là fatal bottleneck
2. Fault isolation — một file lỗi không kill toàn batch
3. `errors.log` machine-readable — AI tự retry
4. Draft state — `draft/` → loại hoàn toàn khỏi output (ADR-006: structural, không phải field)

### Layer 4 — Bảo vệ tài sản không phục hồi

1. Quality gate: word count ≥ 600 + no duplicate slug/content hash
2. No invalid traffic / no click fraud — operational rule, không phải code

### Layer 5 — Feedback loop

1. Traffic data per article — basic pageview/session data via Google Analytics (GA4 snippet in `<head>`) + Google Search Console for organic search performance
2. Revenue data per article — AdSense per-page RPM (requires AdSense Reporting API or manual export — separate from GA4)

---

## Akao Coverage

| Status      | Count | Items                                                                                                                                                                                                                                                         |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ Đầy đủ    | 11/16 | #1, #2, #4, #5, #6, #8, #10, #11, #12, #13 (CMS-side gate), #15 (GA4 block emitted by `seo.js`)                                                                                                                                                               |
| ⚠️ Partial   | 2/16  | #3 — gate tồn tại ở CMS (#13) nhưng Reporter/Adapter chưa có policy/category review (xem [04_PIPELINE_BOUNDARIES.md](04_PIPELINE_BOUNDARIES.md)); #7 — field + fallback implemented (`seo.js`), nhưng Reporter không sinh giá trị, cần Adapter/review bổ sung |
| ❌ Chưa có   | 2/16  | #9 auto trigger, #16 revenue (AdSense RPM)                                                                                                                                                                                                                    |
| Operational | 1/16  | #14 — document trong AI prompt                                                                                                                                                                                                                                |

**Akao: 11/16 đầy đủ — pipeline build tự thân không broken; phần thiếu nằm ở biên Reporter/Adapter và automation ngoài build.**

---

## Trạng thái triển khai (tham chiếu code)

| #   | Item                                     | Trạng thái | Nơi triển khai                                                                                                                                                                  |
| --- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #6  | `og:image` fallback                      | ✅ Done     | `src/cms/config.yaml` (`default_og_image`) + `src/cms/seo.js`                                                                                                                   |
| #7  | `fb_caption`                             | ⚠️ Partial  | Field + fallback: `src/cms/seo.js` (`meta.fb_caption \|\| description`); sinh giá trị: chưa có ở Reporter, xem Gap trong [04_PIPELINE_BOUNDARIES.md](04_PIPELINE_BOUNDARIES.md) |
| #12 | Draft exclusion                          | ✅ Done     | ADR-006 — `content/posts/draft/` không bị `ingest.js` quét                                                                                                                      |
| #13 | Quality gate (word count + `publish_at`) | ✅ Done     | `src/builder/pipeline.js` (`THIN_CONTENT`, `min_word_count` từ `config.yaml`)                                                                                                   |
| #15 | GA4 block                                | ✅ Done     | `src/cms/seo.js` — emitted khi config có `ga4_measurement_id`                                                                                                                   |

---

## Priority — Còn lại

| P   | Item                                                      | Effort | Lý do                                                                       |
| --- | --------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| P0  | #7 fb_caption — sinh giá trị ở Reporter/Adapter           | Low    | CMS đã sẵn sàng nhận field; thiếu nguồn sinh → không post Facebook hiệu quả |
| P1  | #3 policy/category review trước `git mv draft/ → staged/` | Medium | AdSense flag domain = recovery mất tháng                                    |
| P3  | #9 auto trigger                                           | Medium | Prerequisite cho truly unattended pipeline                                  |
| P3  | #16 AdSense RPM                                           | Medium | Cần AdSense Reporting API hoặc manual export — post-MVP                     |

---

## Ghi chú

- Các tham chiếu `GOALS #N` trong các tài liệu khác ([02_SYSTEM_FLOW.md](02_SYSTEM_FLOW.md), [04_PIPELINE_BOUNDARIES.md](04_PIPELINE_BOUNDARIES.md), [05_MAP.md](05_MAP.md)) trỏ về numbering #1–16 ở trên — numbering này là cố định, không đổi theo thời gian dù trạng thái triển khai (Done/Partial) có thay đổi.
- File `03_GOALS_vs_ARCHITECTURE.md` (gap analysis chi tiết từng item) đã được gỡ bỏ — phần còn relevant đã merge vào bảng "Trạng thái triển khai" và "Priority" ở trên.
