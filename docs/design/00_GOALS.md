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
5. Full OG tags (`og:title/description/image/url`) trong `<head>`
6. `og:image` tồn tại, đúng size 1200×630, load được từ FB crawler IP
7. `fb_caption` per article — hook ngắn, emotion-driven, khác với SEO description
8. Canonical URL ổn định — URL thay đổi sau publish = link chết = traffic mất

### Layer 3 — Pipeline vận hành không cần human
9. AI trigger build không cần manual — 900 bài/ngày = manual là fatal bottleneck
10. Fault isolation — một file lỗi không kill toàn batch
11. `errors.log` machine-readable — AI tự retry
12. Draft state — `draft: true` → excluded hoàn toàn khỏi output

### Layer 4 — Bảo vệ tài sản không phục hồi
13. Quality gate: word count ≥ 600 + no duplicate slug/content hash
14. No invalid traffic / no click fraud — operational rule, không phải code

### Layer 5 — Feedback loop
15. Traffic data per article (GSC + GA4)
16. Revenue data per article (AdSense per-page RPM)

---

## Akao Coverage

| Status      | Count | Items                                                    |
| ----------- | ----- | -------------------------------------------------------- |
| ✅ Đầy đủ    | 8/16  | #1,2,4,5,8,10,11,12                                      |
| ⚠️ Partial   | 3/16  | #3,6,13 — thiếu gate/validation/fallback                 |
| ❌ Chưa có   | 4/16  | #7 fb_caption, #9 auto trigger, #15 traffic, #16 revenue |
| Operational | 1/16  | #14 — document trong AI prompt                           |

**Akao: 8/16 — đủ để không broken, chưa đủ để operate.**

---

## Priority

| P   | Item                 | Effort | Lý do                               |
| --- | -------------------- | ------ | ----------------------------------- |
| P0  | #7 fb_caption        | Low    | Không có = không post Facebook được |
| P0  | #6 og:image fallback | Low    | Blank preview = CTR ~0              |
| P1  | #13+#3 quality gate  | Medium | AdSense flag = recovery mất tháng   |
| P2  | #15+#16 analytics    | Medium | Không có data = không optimize được |
| P3  | #9 auto trigger      | Medium | Prerequisite cho truly unattended   |
