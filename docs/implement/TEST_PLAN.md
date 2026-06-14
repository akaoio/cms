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
  Đã tạo 7 fixtures đúng layout STORIES.md/FAN_OUT.md: `staged/.../00/01` (happy path, ~750 từ, đủ mọi optional field + mọi markdown element type cho B5 tái dùng), `draft/.../00/02` (loại trừ), `staged/.../00/03` (thiếu `title` → MISSING_FIELD), `staged/.../00/04` (title `"Final Whistle: How a Last-Minute Penalty Decided the Derby"`), `staged/.../00/05` (category Unicode `văn-hóa`), `staged/.../00/06` (thin content ~98 từ, không kèm `meta.yaml` theo đúng diagram), `staged/.../00/07` (`publish_at: 2099-01-01` → skip)

- [x] **B2b — Fixtures đa dạng category cho build thật (manual eyeball-check)**
  Story: 1.0 · Vị trí: `src/cms/__test__/fixtures/staged/2026/06/01/`
  Bổ sung 5 bài happy-path đầy đủ field (như `00/01`), mỗi bài ≥600 từ cho cả `en.md` và `vi.md` (qua quality gate ở cả hai locale — khác với `00/01/vi.md` chỉ là excerpt ngắn với frontmatter override). Mục đích: khi build pipeline (Phần C) hoàn thiện, mỗi bài sinh ra 2 HTML (en + vi) để kiểm tra bằng mắt — đa dạng category/subcategory ngoài `technology/general` đã có ở `00/01`:
  - `01/01` — `sports/esports` (~683 từ) — "Inside the Arena Where a 16-Year-Old Became a World Champion"
  - `02/01` — `sports/olympics` (~603 từ) — "The Swimmer Who Trains at 4 A.M. and Why It Might Be Worth It"
  - `03/01` — `entertainment/film` (~606 từ) — "The Quiet Indie Film That Outsold Three Blockbusters Last Weekend"
  - `04/01` — `entertainment/music` (~691 từ) — "The Band That Wrote an Entire Album in a Decommissioned Subway Station"
  - `05/01` — `technology/ai` (~747 từ) — "The Translation App That Learned a Dying Language From Forty Hours of Tape"

  Quy ước path: dùng `XX` (giờ) khác nhau cho mỗi bài mới (`01`-`05`) để phân biệt trực quan với nhóm `00/*` (special-purpose cases của B2), `YY = 01`. Category/subcategory chỉ dùng 3 category khai báo trong `config.yaml` (`sports`, `entertainment`, `technology`) với subcategory khác nhau.

  > **Build thật đã chạy (eyeball-check):** copy 5 bài (`01/01`–`05/01`) sang `content/posts/staged/2026/06/01/{01..05}/01/` ở repo root (vì `ingest()` hardcode đọc từ đó, không phải từ `__test__/fixtures/`), chạy `npm run build:cms` → 10 HTML (5 bài × en/vi), mỗi bài có `index.hash`, `sitemap.xml`/`rss.xml`/`robots.txt`/`index.json`/`manifest.json`/`routes.json` đều sinh đúng. Mắt kiểm tra: DOCTYPE/lang, 5 OG tags, JSON-LD, GA4, AdSense loader + 3 ad slot, `<article>` wrapper — đều đúng. Phát hiện thêm bug hreflang khi build thật (xem note ở C2).

- [x] **B3 — Meta reader test**
  Story: 1.1 · File: `src/cms/__test__/meta.test.js`
  Đã viết 10 case test `readMeta()` theo tinh thần fixture-first/test-first (viết trước khi `src/cms/meta.js` tồn tại, sau đó implement và nay đã pass): required fields, optional fields pass-through, không có `draft`/`status`, lỗi `MISSING_FIELD { code, field, dir }`, title có dấu `:`, category Unicode, đọc được `publish_at` tương lai (việc skip thuộc về pipeline, không phải meta reader), cộng 3 case `readMeta(dir, locale)`: frontmatter override `title` thắng `meta.yaml`, field không override vẫn lấy từ `meta.yaml`, locale không có frontmatter trả về `meta.yaml` nguyên vẹn

- [x] **B4 — Markdown body loader test**
  Story: 1.2 · File: `src/cms/__test__/markdown.test.js` (`test("markdown — body loader")`)
  Đã viết test load `en.md` qua `FS.load` — xác nhận không có frontmatter fence (`startsWith("---") === false`), ký tự đầu là nội dung bài viết (`#`)

- [x] **B4b — Frontmatter extractor test** *(không có trong kế hoạch ban đầu — bổ sung cùng B4/B5)*
  Story: 1.2 · File: `src/cms/__test__/markdown.test.js` (`test("markdown — frontmatter")`)
  Đã viết 5 case test `extractFrontmatter()`: không có fence → `meta: null` + body nguyên vẹn, có fence → parse YAML block + body không còn `---`, block array (`tags`) trong frontmatter, fence mở nhưng không đóng → `meta: null` + trả nguyên text, `parseMarkdown()` strip frontmatter trước khi convert body

- [x] **B5 — Markdown converter test**
  Story: 1.3 · File: `src/cms/__test__/markdown.test.js` (`test("markdown — converter")`)
  Đã viết 11 case test `parseMarkdown()` theo tinh thần fixture-first/test-first (viết trước khi `src/cms/markdown.js` tồn tại, sau đó implement và nay đã pass): h1–h6, bold, italic, inline code, code block, link, image, unordered/ordered list, blockquote, `---`, cộng 1 case convert toàn bộ fixture body 01 không throw

- [x] **B6 — Config loader test**
  Story: 1.6 · File: `src/cms/__test__/config.test.js`
  Đã tạo 4 fixture YAML trong `src/cms/__test__/fixtures/config/` (`valid.yaml`, `missing-og-image.yaml`, `missing-min-word-count.yaml`, `no-analytics.yaml`), viết theo đúng cấu trúc nested của `src/cms/config.yaml` (`site:`, `analytics:`, `quality_gate:`, ...), và viết 6 case test `loadConfig()`: load đúng required keys, trả về frozen object, optional `ga4_measurement_id` pass-through và không bắt buộc, throw khi thiếu `site.default_og_image`/`quality_gate.min_word_count`
  > **Lưu ý lịch sử**: fixtures ban đầu được tạo dạng `.json` (nested, giữ nguyên qua `JSON.parse`), trong khi `src/cms/config.js` đọc theo flat keys rồi tự dựng lại cấu trúc nested — shape này chỉ đúng khi input là `.yaml` (do `YAML.parse` flatten nested object). 5/6 case fail vì sai format fixture, không phải lỗi `config.js`. Đã sửa bằng cách chuyển fixtures sang `.yaml`; `config.js` không cần sửa.

---

## Phần C — Test cho Build orchestration (`src/builder/`)

> **Lưu ý nguồn gốc:** code trong `src/builder/**` (trừ `render.js`, xem C7) đến từ một nguồn khác — KHÔNG được viết test-first theo TEST_PLAN gốc. Các mục dưới đây được viết lại để khớp với **contract thực tế** của code hiện có (đọc trực tiếp từ source), theo đúng tinh thần "contract rõ ràng" của C7. Coi như C1-C6 "chưa có test" — fixtures + test cases sẽ viết mới hoàn toàn theo các contract này.

- [x] **C1 — Ingest scanner test**
  Story: 1.4 · File: `src/builder/__test__/ingest.test.js` · Module: `src/builder/ingest.js`
  Interface: `ingest() → Promise<string[][]>` — mỗi phần tử là path array tới 1 article folder
  Contract thực tế:
  - Recurse từ `['content', 'posts', 'staged']` (hardcode, không tham số hoá)
  - Một folder được coi là "article folder" nếu chứa file `meta.yaml` — khi gặp, push path và **không** recurse sâu hơn (không tìm `meta.yaml` lồng nhau bên trong)
  - Nếu `content/posts/staged` không tồn tại → trả về `[]` (không throw)
  - `draft/` và `archived/` nằm ngoài root `staged` nên **không bao giờ** được liệt kê — test phải có fixture đặt `draft/`/`archived/` cạnh `staged/` để xác nhận
  Cách isolate: set `globalThis._root` tới 1 temp dir chứa `content/posts/{staged,draft,archived}/...` (vì path hardcode), restore lại sau test.
  Đã viết 5 case (5/5 GREEN), fixtures tại `src/builder/__test__/fixtures/ingest/content/posts/{staged,draft,archived}/...`: 2 article staged được liệt kê, draft/archived không bao giờ xuất hiện, không recurse quá `meta.yaml`, trả `[]` khi `staged/` không tồn tại.

- [x] **C2 — Quality gate test (THIN_CONTENT + publish_at)**
  Story: 1.4 · File: `src/builder/__test__/pipeline.test.js` · Module: `src/builder/pipeline.js` (`runPipeline()`)
  Phạm vi: chỉ 2 case đã có code thật trong `runPipeline()` hiện tại — phần `DUPLICATE_SLUG` và `archived/` redirect stub tách sang **C2b** (chưa có code).
  Contract thực tế (đọc từ `pipeline.js`):
  - `publish_at > now` (so với `baseMeta.publish_at` đọc qua `readMeta(dir)`, không theo locale) → `skipped++`, bỏ qua TOÀN BỘ article (mọi locale), không ghi error, không ghi output
  - Với mỗi locale active: nếu thiếu `<locale>.md` → `continue` âm thầm (không phải lỗi)
  - `word_count = mdText.split(/\s+/).length < config.quality_gate.min_word_count` → `appendError({ code: 'THIN_CONTENT', wordCount, dir, locale })`, `errors++`, bỏ qua locale đó (không bỏ qua các locale khác hoặc article khác)
  - Quality gate word-count chạy SAU bước incremental hash-check — nếu hash khớp manifest cũ thì content cũ được giữ nguyên dù hiện tại < min_word_count (không re-check)
  Cách isolate: set `globalThis._root` tới temp dir có `src/cms/config.yaml`-shape config, `content/posts/staged/...`, chạy `runPipeline()`, assert `build/errors.log` + side-effects (không assert qua giá trị return vì `runPipeline()` không return gì — chỉ log ra console).
  Đã viết 6 case (6/6 GREEN), fixtures tại `src/builder/__test__/fixtures/pipeline/` (config.yaml + 3 article: happy-path ~650w 2 locale, thin ~50w, scheduled `publish_at: 2099`). Thêm 1 `test()` riêng cho incremental rebuild (2 case GREEN) — build 2 lần, lần 2 `index.html` giữ `mtime` không đổi. Thêm 1 case hreflang (xem note dưới).
  > **Bug phát hiện & sửa khi viết test:**
  > 1. `src/core/FS/write.js` — `.json` write luôn `JSON.stringify(content, null, 4)` kể cả khi `content` đã là string JSON (caller tự stringify) → double-encode. Ảnh hưởng `routes-inject.js` (C6), `index.js::saveIndex` (C5), `index.js::saveManifest` (C4). Sửa: nếu `content` đã là string thì dùng trực tiếp, không stringify lại.
  > 2. `src/cms/index.js::loadManifest` — gọi `JSON.parse(raw)` trên kết quả `FS.load()` đã được parse sẵn (vì ext `.json`) → luôn throw → catch → trả `null`. Hậu quả: incremental build (`unchanged` skip) KHÔNG BAO GIỜ hoạt động trước fix này — mọi build là full rebuild. Sửa: bỏ `JSON.parse` thừa, dùng trực tiếp kết quả `FS.load()`.
  > 3. **(phát hiện khi build B2b thật)** `pipeline.js` gọi `renderPage(meta, bodyHtml, seoHtml, config)` — thiếu tham số `siblingLocales` mà `render.js` (C7) đã hỗ trợ đầy đủ → output HTML thật không có hreflang link dù bài có cả en+vi. Sửa: trước inner loop, tính `siblingLocales` từ `baseMeta` (date/category/subcategory/slug — không đổi theo locale) bằng cách check `<locale>.md` tồn tại cho mỗi locale active, rồi truyền vào `renderPage()`. Thêm case test hreflang ở trên.

- [x] **C2b — Quality gate test (DUPLICATE_SLUG + archived redirect stub)** *(mới — implement thêm code)*
  Story: 1.4 · File: `src/builder/__test__/pipeline.test.js` (cùng file C2, `test()` riêng) · Module: `src/builder/pipeline.js` + `src/builder/ingest.js`
  **Trạng thái trước khi làm: CHƯA có code** — gap so với DoD Story 1.4 (xem `docs/plan/STORIES.md` dòng 149, 151). Đã viết test trước (RED) rồi implement (GREEN).
  Đã implement:
  - `DUPLICATE_SLUG`: `runPipeline()` track `seenSlugs` (Set) qua `baseMeta.slug`; article thứ 2 trùng slug → `appendError({ code: 'DUPLICATE_SLUG', slug, dir })`, `errors++`, skip toàn bộ article đó (mọi locale)
  - `archived/`: thêm `ingestArchived()` trong `ingest.js` (tái dùng logic scan của `ingest()`, root = `['content','posts','archived']`). `runPipeline()` sau main loop: với mỗi archived article + mỗi locale active, ghi `build/{date}/{cat1}/{cat2}/{slug}/{locale}/index.html` — stub HTML với `<meta http-equiv="refresh" content="0; url=/{cat1}/{cat2}/">` + `<link rel="canonical">`, redirect về category listing (URL gần nhất còn hợp lệ)
  Đã viết 4 case (4/4 GREEN), fixtures: 2 article cùng `slug: 20260601-duplicate-slug` (staged 01/01 và 02/01), 1 article trong `content/posts/archived/2026/05/01/00/01`.

- [x] **C3 — Error logger test**
  Story: 1.4 · File: `src/builder/__test__/errors.test.js` · Module: `src/builder/errors.js`
  Interface: `appendError(data) → Promise<void>` — never throws
  Contract thực tế:
  - Append 1 dòng JSON (`{ ts: ISO string, ...data }`) vào `build/errors.log`, mỗi entry kết thúc bằng `\n` (newline-delimited JSON)
  - Nếu `build/errors.log` chưa tồn tại → tạo mới
  - Nếu file đã có nội dung → append nối tiếp (không overwrite)
  - Lỗi I/O nội bộ (vd. `FS.write` throw) → catch, `console.error`, không re-throw (không bao giờ làm build crash)
  Cách isolate: set `globalThis._root` tới temp dir, gọi `appendError()` nhiều lần, đọc lại `build/errors.log`, parse từng dòng bằng `JSON.parse`.
  Đã viết 3 case (3/3 GREEN): entry đầu tiên có `ts` + field truyền vào, entry thứ 2 append đúng dòng mới không overwrite, `appendError({})` không throw.

- [x] **C4 — Hash & manifest test**
  Story: 1.5 · File: `src/cms/__test__/index.test.js` · Module: `src/cms/index.js` (`sha256`, `loadManifest`, `saveManifest`)
  Interface:
  - `sha256(message: string) → Promise<string>` (hex SHA-256)
  - `loadManifest() → Promise<{v, built, entries} | null>` — đọc `build/manifest.json`
  - `saveManifest(entries) → Promise<void>` — ghi `build/manifest.tmp.json` rồi `move` → `build/manifest.json` (atomic)
  Contract thực tế:
  - `saveManifest(entries)` tạo object `{ v: 1, built: <ISO now>, entries }`, ghi tmp rồi rename — sau khi xong, `manifest.tmp.json` không còn tồn tại, `manifest.json` chứa đúng schema
  - `loadManifest()`: nếu `build/manifest.tmp.json` tồn tại → trả `null` ngay (coi là crash trước đó, force full rebuild), KHÔNG đọc `manifest.json`
  - `loadManifest()`: nếu `build/manifest.json` không tồn tại → trả `null`
  - `loadManifest()`: JSON parse lỗi → catch, `console.error`, trả `null`
  - Incremental skip: đây là logic trong `pipeline.js` (`oldManifest?.entries?.[articleId]?.hash === contentHash` → giữ entry cũ, `unchanged++`, `continue`) — test ở mức `pipeline.test.js` (C2) bằng cách build 2 lần, lần 2 không ghi lại HTML nếu nội dung không đổi
  - `.hash` sidecar: `pipeline.js` ghi `index.hash` (không phải `.hash`) cạnh `index.html`, chứa `sha256(html)` — test field name đúng là `index.hash`
  Cách isolate: set `globalThis._root` tới temp dir, gọi trực tiếp `sha256`/`loadManifest`/`saveManifest`.
  Đã viết 7 case (7/7 GREEN): `sha256` trả hex 64-char deterministic, `loadManifest` trả `null` khi chưa có file, `saveManifest` ghi đúng schema `{v, built, entries}` và không để lại `manifest.tmp.json`, `loadManifest` đọc lại đúng entries, crash-recovery (`manifest.tmp.json` tồn tại → `null`). Bug `loadManifest` luôn `null` (xem note ở C2) được phát hiện và sửa tại đây.

- [x] **C5 — Index builder test**
  Story: 1.6 · File: `src/cms/__test__/index.test.js` (cùng file C4) · Module: `src/cms/index.js` (`saveIndex`)
  Interface: `saveIndex(entries) → Promise<void>` — ghi `build/index.json`
  Contract thực tế:
  - Input `entries` = manifest entries map (giống `newEntries` trong `pipeline.js`, mỗi entry có `slug, title, date_iso, category, subcategory, tags, description, locale, url`)
  - Output: array record `{ slug, title, date, category, subcategory, tags, description, locale, url }` — `date` lấy từ `entry.date_iso` (không phải `entry.date` là `YYYYMMDD`)
  - `tags` fallback `[]`, `description` fallback `''` nếu thiếu
  - Sort theo `date` (= `date_iso`) giảm dần (mới nhất trước)
  - Multi-locale: mỗi `articleId` dạng `${slug}:${locale}` là 1 entry riêng trong `entries` → mỗi locale active sinh 1 record riêng trong `index.json` (không gộp theo slug)
  Cách isolate: set `globalThis._root` tới temp dir, gọi `saveIndex(entries)` với fixture entries map, đọc lại `build/index.json`.
  Đã viết 5 case (5/5 GREEN): đủ field, `date` = `date_iso` (ISO string), multi-locale ra 2 record riêng cho cùng `slug`, sort giảm dần theo date, fallback `tags: []` / `description: ''`.

- [x] **C6 — Route injector test**
  Story: 1.7 · File: `src/builder/__test__/routes-inject.test.js` · Module: `src/builder/routes-inject.js`
  Interface: `injectRoutes() → Promise<void>` — ghi `build/routes.json`
  Contract thực tế (code hiện tại có **5** pattern, không phải 4 như spec gốc — ghi nhận sai khác):
  1. `/{date}/{cat1}/{cat2}/{slug}/{locale}/` → `cms-page`
  2. `/{cat1}/{cat2}/` → `cms-list`
  3. `/{cat1}/` → `cms-list`
  4. `/tag/{tag}/` → `cms-list`
  5. `/{page}/` → `cms-page`
  Việc cần làm: test `routes.json` là array đúng 5 entries, mỗi entry có `{ pattern, component }`, gọi `injectRoutes()` 2 lần liên tiếp → nội dung byte-for-byte giống nhau (idempotent), không entry nào chứa path cụ thể của 1 article (không có slug/category thật, chỉ placeholder `{...}`)
  Cách isolate: set `globalThis._root` tới temp dir, gọi `injectRoutes()`, đọc `build/routes.json`.
  Đã viết 4 case (4/4 GREEN): 5 entries đúng `{pattern, component}`, đủ 5 pattern kỳ vọng, không pattern nào chứa path cụ thể, output idempotent qua 2 lần gọi. Bug double-encode `.json` (xem note ở C2) được phát hiện và sửa tại đây.

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

- [x] **D2 — Feed generator test**
  Story: 1.9 · File: `src/cms/__test__/feed.test.js`
  Đã viết 6 case (6/6 GREEN) test `generateSitemap`/`generateRSS`/`generateRobots`: `sitemap.xml` có `<url>` cho mọi entry với `<loc>`/`<lastmod>` đúng (lastmod = phần date của `date_iso`), `rss.xml` có `<item>` cho mọi entry và cap ở 20 bài mới nhất (sort theo `date_iso` giảm dần), `robots.txt` có `Allow: /` và `Sitemap: <site.url>/sitemap.xml`.

---

## Phần E — Test cho Web Components & Integration

- [ ] **E1 — cms-list compliance check** *(blocked — target chưa tồn tại)*
  Story: 2.2 · Target: `src/UI/components/cms-list/index.js`
  `src/UI/` chưa được port/viết trong repo này (Story 2.x chưa làm). Không thể viết test cho code không tồn tại — để lại cho khi Story 2.2 implement xong.
  Việc cần làm (khi đó): assert KHÔNG chứa `attachShadow`, render vào light DOM (`this`), `disconnectedCallback` dọn Context subscriptions

- [ ] **E2 — cms-page compliance check** *(blocked — target chưa tồn tại)*
  Story: 2.3 · Target: `src/UI/components/cms-page/index.js`
  `src/UI/` chưa được port/viết trong repo này (Story 2.x chưa làm). Không thể viết test cho code không tồn tại — để lại cho khi Story 2.3 implement xong.
  Việc cần làm (khi đó): assert KHÔNG chứa `attachShadow`, có đủ 3 ad slot (`ad-top`, `ad-mid`, `ad-bottom`), `disconnectedCallback` huỷ subscriptions + pending fetches

- [x] **E3 — Integration test**
  Story: 3.1 · File: `src/cms/__test__/integration.test.js`
  Fixtures tại `src/cms/__test__/fixtures/integration/` (config.yaml + 1 article happy-path ~1600 từ). Đã viết 5 case (5/5 GREEN) test end-to-end qua `runPipeline()`: `index.html` được sinh ra, HTML chứa đủ 5 OG tags (`og:title/description/image/type/url`, `og:image` đúng `meta.image`), `index.hash` chứa sha256 64-hex, `sitemap.xml` chứa `<loc>` của bài viết, `build/errors.log` rỗng với content hợp lệ.
  > Phạm vi Lighthouse/LCP/CLS/TBT trong DoD Story 3.1 không thuộc phạm vi unit test (cần browser) — không làm ở đây.

- [ ] **E4 — Compliance verifier update** *(blocked — target chưa tồn tại)*
  Story: 3.2 · File: `akao-skill/scripts/verify.js`
  `akao-skill/` chưa tồn tại trong repo này. Không thể viết test cho code không tồn tại — để lại cho khi Story 3.2 implement xong.
  Việc cần làm (khi đó): thêm assertion không có `attachShadow` trong `cms-page`/`cms-list`, grep HTML output để bắt `<script>` thiếu `defer`/`async`/`type="module"`, exit non-zero khi fail

---

## Tổng kết

| Phần | Số chunk | Phạm vi                              |
| ---- | -------- | ------------------------------------ |
| A    | 4        | Smoke test hạ tầng (`src/core/`)     |
| B    | 6        | Kernel modules (`src/cms/`)          |
| C    | 7        | Build orchestration (`src/builder/`) |
| D    | 2        | SEO/Feed modules                     |
| E    | 4        | Web Components & Integration         |

***Tổng: 23 chunks***
