# Test Plan — Size-bite Chunks

> Kế hoạch chia nhỏ việc viết test thành các chunk gọn, mỗi chunk làm xong trong một phiên. Thứ tự: hạ tầng trước (smoke test, theo exception trong [FAN_OUT.md](FAN_OUT.md)), CMS modules sau (fixture-first đầy đủ, theo [STORIES.md](../plan/STORIES.md)).

**Quy ước trạng thái:** `[ ]` chưa làm · `[~]` đang làm · `[x]` xong

---

## Phần A — Smoke test cho hạ tầng (`src/core/`)

> Happy-path only, KHÔNG cần fixture đầy đủ — xem mục "Exception: hạ tầng port sẵn" trong FAN_OUT.md.

- [x] **A1 — FS smoke test**
  Module: `src/core/FS.js` + `FS/`
  Test file: `src/core/__test__/fs.smoke.js`
  Cấu trúc: 1 `test("FS")` cha chứa 5 `t.test()` subtest — mỗi subtest 1 hành vi:
  - `ensure + exist` — tạo thư mục và xác nhận sự tồn tại
  - `write + load — round-trips plain text` — ghi/đọc text khớp nội dung
  - `write + load — round-trips JSON` — ghi/đọc JSON (serialize → parse khớp object gốc)
  - `find` — trả về path đầu tiên tồn tại trong danh sách candidate
  - `remove` — xoá thư mục và toàn bộ nội dung bên trong

- [x] **A2 — IDB smoke test**
  Module: `src/core/IDB.js` + `IDB/`
  Test file: `src/core/__test__/idb.smoke.js`
  Cấu trúc: 1 `test("IDB")` cha chứa 3 `t.test()` subtest qua Chain API (`get(key).put/once/del`):
  - `get(key).put(value)` — lưu và ghi đè giá trị, đọc lại khớp qua `once()`
  - `del()` — xoá giá trị, `once()` sau đó trả về `undefined`
  - `keys()` — Node backend trả về mảng rỗng (không có IDB-backed enumeration)
  Lưu ý: cleanup file `indexed/<name>.json` do Node IDB persistence tạo ra sau khi test xong.

- [x] **A3 — States smoke test**
  Module: `src/core/States.js` + `States/`
  Test file: `src/core/__test__/states.smoke.js`
  Cấu trúc: 1 `test("States")` cha chứa 5 `t.test()` subtest:
  - `set/get` — round-trip giá trị
  - `has()` — phản ánh đúng sự tồn tại của key
  - `on(callback)` — global subscriber nhận thông báo mọi thay đổi, và `off()` ngừng nhận sau khi unsubscribe
  - `on(key, callback)` — path-specific subscriber chỉ nhận thông báo cho đúng key của nó (im lặng với key khác), và `off()` ngừng nhận sau khi unsubscribe
  - `del()` — xoá key khiến `has()`/`get()` phản ánh đúng việc đã xoá
  Lưu ý: mỗi subtest tự `off()` subscriber của mình ngay sau khi assert — tránh side-effect dồn lên các subtest sau (bug đã gặp và sửa: đếm sai notification count do subscriber sống xuyên subtest).

- [x] **A4 — Router/Threads/Stores smoke test (gộp)**
  Module: `Router.js`, `Threads.js`, `Stores.js`
  Test file: `src/core/__test__/runtime.smoke.js`
  Cấu trúc: 3 `test()` cha riêng biệt, mỗi cha chứa các `t.test()` subtest:
  - `test("Router")`: `process()` — gắn locale từ path prefix + match route param; `process()` — fallback về route `"home"` và locale mặc định cho `"/"`; `match()` — trích params hoặc trả `null` khi không khớp pattern
  - `test("Threads")`: khởi tạo với registry rỗng; `post()/queue()/call()` với thread chưa đăng ký trả về thất bại nhẹ nhàng (`false`/`undefined`), không throw
  - `test("Stores")`: `Indexes.Hashes`/`Indexes.Statics` là IDB instance có tên đúng và `ready` resolve; `Statics` chính là `globalThis.Statics`
  Lưu ý: **`HMR.js` đã bị xoá khỏi codebase** — không ai import nó, chỉ chạy trong browser dev-mode (`DEV`), logic dựa trên `el.shadowRoot` mâu thuẫn trực tiếp với constraint #1 (no `attachShadow` trên `cms-page`/`cms-list`), và không thuộc phạm vi 20 stories MVP. Xác định là tàn dư từ codebase nguồn khi port.

---

## Phần B — Test cho Kernel modules (`src/cms/`)

> Fixture-first đầy đủ (3–7 fixtures/module), không exception.

- [x] **B1 — Test runner bootstrap**
  Story: 1.0 · Quyết định: dùng `node --test "src/cms/__test__/**/*.js"` qua script `test:cms` trong `package.json` (nhất quán với `test:core` của Phần A) — KHÔNG viết `src/cms/__test__/run.js` riêng vì built-in runner đã làm đúng việc cần (chạy mọi `*.test.js`, `assert`/`assert.rejects` native, exit code phản ánh pass/fail)

- [x] **B2 — Fixtures cơ bản**
  Story: 1.0 · Vị trí: `src/cms/__test__/fixtures/`
  Đã tạo 7 fixtures đúng layout STORIES.md/FAN_OUT.md: `published/.../01` (happy path, ~690 từ, đủ mọi optional field + mọi markdown element type cho B5 tái dùng), `draft/.../02` (loại trừ), `published/.../03` (thiếu `title` → MISSING_FIELD), `published/.../04` (title `"Barça: el partido"`), `published/.../05` (category Unicode `công-nghệ`), `published/.../06` (thin content ~98 từ, không kèm `meta.yaml` theo đúng diagram), `published/.../07` (`publish_at: 2099-01-01` → skip)

- [x] **B3 — Meta reader test**
  Story: 1.1 · File: `src/cms/__test__/meta.test.js`
  Đã viết 7 case test `readMeta()` (import từ `src/cms/meta.js` — chưa tồn tại, đúng tinh thần fixture-first/test-first, hiện đang đỏ): required fields, optional fields pass-through, không có `draft`/`status`, lỗi `MISSING_FIELD { code, field, dir }`, title có dấu `:`, category Unicode, đọc được `publish_at` tương lai (việc skip thuộc về pipeline, không phải meta reader)

- [x] **B4 — Markdown body loader test**
  Story: 1.2 · File: `src/cms/__test__/markdown.test.js` (`test("markdown — body loader")`)
  Đã viết test load `en.md` qua `FS.load` — xác nhận không có frontmatter fence (`startsWith("---") === false`), ký tự đầu là nội dung bài viết (`#`)

- [x] **B5 — Markdown converter test**
  Story: 1.3 · File: `src/cms/__test__/markdown.test.js` (`test("markdown — converter")`)
  Đã viết 11 case test `parseMarkdown()` (import từ `src/cms/markdown.js` — chưa tồn tại, hiện đang đỏ): h1–h6, bold, italic, inline code, code block, link, image, unordered/ordered list, blockquote, `---`, cộng 1 case convert toàn bộ fixture body 01 không throw

- [x] **B6 — Config loader test**
  Story: 1.6 · File: `src/cms/__test__/config.test.js`
  Đã tạo 4 fixture YAML trong `src/cms/__test__/fixtures/config/` (valid, thiếu `default_og_image`, thiếu `min_word_count`, thiếu `analytics` optional) và viết 6 case test `loadConfig()` (import từ `src/cms/config.js` — chưa tồn tại, hiện đang đỏ): load đúng required keys, trả về frozen object, optional `ga4_measurement_id` pass-through và không bắt buộc, throw khi thiếu `site.default_og_image`/`quality_gate.min_word_count`

> **Lưu ý:** B3/B5/B6 hiện fail với `ERR_MODULE_NOT_FOUND` vì `src/cms/{meta,markdown,config}.js` chưa được viết — đây là trạng thái "đỏ" mong đợi của fixture-first discipline (fixture + test commit trước code). Chạy `npm run test:cms` để xác nhận.

---

## Phần C — Test cho Build orchestration (`src/builder/`)

- [ ] **C1 — Ingest scanner test**
  Story: 1.4 · Module: `ingest.js`
  Việc cần làm: test recurse `content/posts/published/**` — đảm bảo `draft/` và `archived/` không bị chạm tới

- [ ] **C2 — Quality gate test**
  Story: 1.4 · Module: `pipeline.js` (gate logic)
  Việc cần làm: test `THIN_CONTENT` (word_count < 600), `DUPLICATE_SLUG`, `publish_at > now` → skip lặng lẽ, `archived/` → redirect stub

- [ ] **C3 — Error logger test**
  Story: 1.4 · Module: `errors.js`
  Việc cần làm: test format entry `{ ts, dir, code, detail }`, build tiếp tục chạy khi gặp 1 article lỗi (không crash)

- [ ] **C4 — Hash & manifest test**
  Story: 1.5 · Module: hash logic trong `pipeline.js`
  Việc cần làm: test sinh `.hash` (SHA-256) cho mỗi HTML output, schema `manifest.json` (`{ v, built, entries }`), file không đổi → bị skip ở lần build sau, `manifest.tmp.json` tồn tại → force full rebuild

- [ ] **C5 — Index builder test**
  Story: 1.6 · Module: `index.js`
  Việc cần làm: test `index.json` chứa đúng field (`slug, title, date, category, tags, description, locale, url`), multi-locale output đúng theo `active` trong config

- [ ] **C6 — Route injector test**
  Story: 1.7 · Module: `routes-inject.js`
  Việc cần làm: test `routes.json` luôn đúng 4 pattern entries, kích thước không đổi qua nhiều lần build (idempotent), không bao giờ inject per-article path

- [x] **C7 — Page renderer test** *(missing từ đầu — thêm sau khi nhận ra thiếu contract)*
  Story: 2.6 · File: `src/builder/__test__/render.test.js`
  Module: `src/builder/render.js`
  Interface: `renderPage(meta, bodyHtml, seoHtml, config, siblingLocales?) → string`
  - `meta` — output của `readMeta(dir, locale)` (merged meta.yaml + locale frontmatter)
  - `bodyHtml` — output của `parseMarkdown()` (rendered article body)
  - `seoHtml` — output của `generateSEO()` (OG + JSON-LD + GA4 block, goes in `<head>`)
  - `siblingLocales` — `[{ locale, url }]` for hreflang links (en → x-default)
  Đã viết 14 case test (15/15 GREEN):
  - DOCTYPE + `<html lang="{meta.lang}">` attribute
  - `<title>` = `{meta.title} | {config.site.title}`
  - `seoHtml` injected inside `<head>` (position check: before `</head>`)
  - hreflang links cho từng sibling locale
  - `hreflang="x-default"` trỏ vào locale `"en"`
  - AdSense loader `<script async>` trong `<head>` với `ca-pub-...`
  - External scripts (có `src`) đều dùng `defer`/`async`/`type="module"` (không blocking)
  - 3 `<ins class="adsbygoogle">` slots: `#ad-top`, `#ad-mid`, `#ad-bottom`
  - Cả 3 slot mang `data-ad-client="ca-pub-..."` (3 occurrences)
  - `<article>` bao bọc body content
  - `#ad-mid` nằm BÊN TRONG `<article>` (split tại `</h2>`)
  - `#ad-top` TRƯỚC `<article>`, `#ad-bottom` SAU `</article>`
  - Không có `siblingLocales` → không emit hreflang (graceful)
  - Body không có `<h2>` → vẫn hoạt động bình thường
  **Contract ranh giới rõ:**
  - `seo.js` (kernel) → tạo SEO block (OG + JSON-LD + GA4) → string
  - `render.js` (builder) → nhận SEO block từ ngoài, ghép vào `<head>` → full HTML page
  - KHÔNG overlap: render.js KHÔNG tự tạo OG tags; seo.js KHÔNG quan tâm HTML structure

---

## Phần D — Test cho SEO/Feed modules

- [x] **D1 — SEO tag test**
  Story: 1.8 · File: `src/cms/__test__/seo.test.js`
  10 case test `generateSEO()`: đủ 5 OG tags, fallback chain `og:image`, fallback `fb_caption || description[:160]`, JSON-LD Article schema, `dateModified = updated_at || date`, GA4 script injection present/absent

- [ ] **D2 — Feed generator test**
  Story: 1.9 · File: `src/cms/__test__/feed.test.js`
  Việc cần làm: test `sitemap.xml` có `<url>` cho mọi bài đã publish theo từng locale, `rss.xml` có entries (≤20 bài/category/locale), `robots.txt` có `Allow: /` và `Sitemap:`

---

## Phần E — Test cho Web Components & Integration

- [ ] **E1 — cms-list compliance check**
  Story: 2.2 · Target: `src/UI/components/cms-list/index.js`
  Việc cần làm: assert KHÔNG chứa `attachShadow`, render vào light DOM (`this`), `disconnectedCallback` dọn Context subscriptions

- [ ] **E2 — cms-page compliance check**
  Story: 2.3 · Target: `src/UI/components/cms-page/index.js`
  Việc cần làm: assert KHÔNG chứa `attachShadow`, có đủ 3 ad slot (`ad-top`, `ad-mid`, `ad-bottom`), `disconnectedCallback` huỷ subscriptions + pending fetches

- [ ] **E3 — Integration test**
  Story: 3.1 · File: `src/cms/__test__/integration.js`
  Việc cần làm: test end-to-end — ghi `meta.yaml + en.md` vào `published/` → chạy `build:cms` → assert HTML tồn tại, OG tags đúng, hash tồn tại, sitemap có URL, `errors.log` rỗng với content hợp lệ

- [ ] **E4 — Compliance verifier update**
  Story: 3.2 · File: `akao-skill/scripts/verify.js`
  Việc cần làm: thêm assertion không có `attachShadow` trong `cms-page`/`cms-list`, grep HTML output để bắt `<script>` thiếu `defer`/`async`/`type="module"`, exit non-zero khi fail

---

## Tổng kết

| Phần | Số chunk | Phạm vi                              |
| ---- | -------- | ------------------------------------ |
| A    | 4        | Smoke test hạ tầng (`src/core/`)     |
| B    | 6        | Kernel modules (`src/cms/`)          |
| C    | 6        | Build orchestration (`src/builder/`) |
| D    | 2        | SEO/Feed modules                     |
| E    | 4        | Web Components & Integration         |

***Tổng: 22 chunks***
