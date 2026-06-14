# Pipeline Boundaries — Reporter · CMS

Hai package độc lập, hai repo riêng. Không package nào biết package kia tồn tại. Giao tiếp duy nhất là filesystem (qua một adapter step thủ công/scripted).

---

## Full pipeline

```text
[reporter]                          [adapter]                    [cms]
  output/                                                          content/posts/
  <hash>/                                                            draft/YYYY/MM/DD/XX/YY/
    en.md  ─┐                                                          en.md
    de.md   │── meta.json → meta.yaml ──► draft/ ── review ──► staged/YYYY/MM/DD/XX/YY/
    meta.json│   derive date/category/slug         git mv          en.md
    images/  │   synthesize fb_caption                             vi.md
    videos/ ─┘                                                      meta.yaml
```

Path format theo ADR-005: `YYYY/MM/DD/XX/YY` = ngày publish + chunked-ID (`XX/YY`, không phải category). Category/subcategory chỉ xuất hiện ở build output URL (`build/YYYYMMDD/{cat1}/{cat2}/{slug}/{locale}/`), không phải storage path.

---

## Ranh giới trách nhiệm

### Reporter

Crawler tự động (Chrome extension + local server). Một pass duy nhất: browse → classify (Chrome Prompt API) → extract + download media → generate đa locale (local LLM) → write to disk. Không có khái niệm spider/writer riêng biệt — generation diễn ra ngay tại crawl time.

**Output:**

```text
output/<hash>/
  en.md         ← bài hoàn chỉnh do local LLM viết, một file/locale
  de.md
  meta.json     ← { url, timestamp, platform, images: [...], videos: [...] }
  images/
    00.webp
    01.webp
  videos/
    00.mp4
```

`<hash>` = SHA-256 của normalised source URL — crawl lại cùng URL là no-op.

**Không biết:** category, subcategory, slug, ngày publish dự kiến, `fb_caption`, CMS tồn tại, `draft/staged/archived`.

**Không có:** quality/policy gate cho nội dung crawl (không check thin/adult/violence theo GOALS #3) — content có thể từ bất kỳ platform nào (Reddit, HN, ...), rủi ro AdSense policy nếu auto-publish.

---

### Adapter (Reporter → CMS)

Bước translate bắt buộc — chưa có code, cần implement. Nhận `output/<hash>/` từ Reporter, sinh ra `content/posts/draft/YYYY/MM/DD/XX/YY/`:

- `meta.json` → `meta.yaml` (ADR-007 — YAML là format chính thức của CMS)
- Derive `date` (từ `meta.json.timestamp`), `category`/`subcategory` (cần mapping rule hoặc human gán — Reporter không gán)
- Derive `slug` (từ `<hash>` hoặc từ title)
- Derive `XX/YY` chunked-ID path (ADR-005) từ `<hash>` hoặc từ index tăng dần
- Synthesize `fb_caption` (Reporter không sinh field này — GOALS #7 yêu cầu bắt buộc cho Facebook traffic)
- `images[]`/`videos[]` → chọn 1 ảnh làm `meta.yaml: image` (hero), còn lại là inline assets nếu CMS hỗ trợ

**Output luôn vào `draft/`, không bao giờ trực tiếp vào `staged/`** — vì Reporter chưa có policy/category gate, nội dung crawl cần review (người hoặc AI agent có judgment về category + policy) trước khi `git mv` sang `staged/`.

---

### CMS

**Input:** `content/posts/staged/` — chỉ folder này. `draft/` và `archived/` invisible với build pipeline.

**Không biết:** Reporter tồn tại, content đến từ đâu, adapter tồn tại.

**Trạng thái bài** (`draft/staged/archived`) là structural — folder position, không phải field. `staged/` = approved for build, chưa phải live trên CDN. Mọi content (từ Adapter hay AI agent viết trực tiếp) đều vào `draft/` trước, qua review, rồi `git mv` sang `staged/` (ADR-006). `archived/` dùng cho operator khi gỡ bài — build emit redirect stub, URL không 404.

CMS có quality gate riêng (word count ≥ 600, required fields) — đây là lưới an toàn cuối, lỗi log vào `errors.log`, build tiếp tục. Reporter không có gate tương đương; gate chính cho content từ Reporter nằm ở bước review trước `git mv draft/ → staged/`.

---

## Open issues

- **Adapter chưa có code** — `output/<hash>/` (Reporter) và `content/posts/draft/YYYY/MM/DD/XX/YY/` (CMS) không cùng cấu trúc folder, cùng format meta, hay cùng field set. Cần một script/agent translate.
- **Category/subcategory/slug** — Reporter không sinh các field này; CMS coi `category`+`subcategory` là required ([meta.js](../../src/cms/meta.js), Story 1.1). Cần quy tắc mapping hoặc bước gán thủ công.
- **fb_caption** — GOALS #7 (P0) yêu cầu field này cho mọi bài; Reporter không sinh. Adapter hoặc review step phải bổ sung.
- **Policy gate** — GOALS #3 (content pass AdSense policy) chưa có cơ chế nào cho content từ Reporter. Đề xuất: mọi output Reporter qua adapter đều vào `draft/`, review trước khi `staged/`.

> `GOALS #3`, `GOALS #7` — xem [00_GOALS.md](00_GOALS.md) (numbering #1–16, Layer 1 và Layer 2) và bảng "Trạng thái triển khai" cho tình trạng hiện tại của từng item.
