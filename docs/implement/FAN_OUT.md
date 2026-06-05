# FAN_OUT — MVP Implementation Guide

> **Entry point.** Đây là file đầu tiên bạn đọc khi bắt đầu implement. Mọi quyết định kỹ thuật, thứ tự module, fixture discipline, và definition of done đều nằm ở đây.

**Chiến thuật:** Test-Driven Development (TDD)
**Nguyên tắc:** Fixtures commit trước, code sau. Không có exception.

---

## Chiến thuật TDD

Mọi module trong MVP đều theo thứ tự cứng:

```text
1. Viết fixture (input + expected output)
2. Commit fixture
3. Viết test assert fixture đó
4. Chạy test → RED
5. Viết code tối thiểu để test pass → GREEN
6. Refactor nếu cần → vẫn GREEN
7. Commit code
```

**Không được viết code trước fixture.** Lý do: project này zero test framework, zero linter, zero type system — fixture là contract duy nhất ngăn regression khi AI agent tự viết code.

### Fixture là gì

Một fixture = một cặp **(input, expected output)** được commit thành file — không phải comment, không phải mental model, không phải doc.

```text
input:  file hoặc data mà module sẽ nhận
output: kết quả chính xác mà module phải trả về hoặc hành vi phải xảy ra
```

Fixture phải cover đủ 3 loại case:

| Loại           | Mô tả                                       | Ví dụ với meta.js                                           |
| -------------- | ------------------------------------------- | ----------------------------------------------------------- |
| **Happy path** | Input hợp lệ → output đúng                  | meta.json đủ fields → object trả về đúng                    |
| **Error path** | Input sai → error đúng loại, đúng message   | thiếu `title` → `{ code: "MISSING_FIELD", field: "title" }` |
| **Edge case**  | Input hợp lệ nhưng bất thường → không crash | title có dấu `:`, Unicode, publish_at là future date        |

**Số lượng fixture cho một module:**

- **Tối thiểu:** 1 happy path + 1 error path + 1 edge case = **3 fixtures**
- **Thực tế cho MVP:** 4–7 fixtures mỗi module là đủ
- **Dấu hiệu cần thêm fixture:** tìm thấy bug trong production mà không có fixture nào cover → thêm fixture *trước* khi fix bug
- **Dấu hiệu fixture thừa:** hai fixtures chỉ khác nhau ở data không ảnh hưởng logic (ví dụ: slug "foo" vs slug "bar") → merge lại

Fixture không cần cover mọi thứ — cần cover mọi **nhánh logic** trong module. Nếu module có 3 `if`, phải có ít nhất 3 fixtures đi qua 3 nhánh đó.

**Target coverage: 85%.** Không cần 100% — 15% còn lại thường là defensive code, unreachable branch, hoặc integration behavior thuộc về test khác. Đuổi theo 100% tốn thời gian viết fixture cho những case không bao giờ xảy ra trong production. 85% đủ để catch regression mà không bloat test suite.

### Test runner

Entry point duy nhất: `node cms/test/run.js`

- Import và chạy tuần tự tất cả `*.test.js` trong `cms/test/`
- Dùng `assert.deepStrictEqual` — native Node.js, zero deps
- Exit code 0 nếu tất cả pass, non-zero nếu có fail
- Output: `✓ meta.test.js (7 cases)` hoặc `✗ meta.test.js — AssertionError: ...`

`run.js` được viết ở **Story 1.0**, trước mọi module khác.

---

## Modules cần phát triển — theo thứ tự

### Kernel (`cms/src/`) — isomorphic, zero I/O

| #   | Module                    | File                  | Test file                   | Story |
| --- | ------------------------- | --------------------- | --------------------------- | ----- |
| 1   | Config loader             | `cms/src/config.js`   | `cms/test/config.test.js`   | 1.0   |
| 2   | Meta reader + validator   | `cms/src/meta.js`     | `cms/test/meta.test.js`     | 1.1   |
| 3   | Markdown → HTML converter | `cms/src/markdown.js` | `cms/test/markdown.test.js` | 1.2   |
| 4   | SEO tag generator         | `cms/src/seo.js`      | `cms/test/seo.test.js`      | 1.8   |
| 5   | Content index builder     | `cms/src/index.js`    | `cms/test/index.test.js`    | 1.6   |
| 6   | Feed generator            | `cms/src/feed.js`     | `cms/test/feed.test.js`     | 1.9   |

### Build orchestration (`builder/cms/`) — Node.js only

| #   | Module                | File                           | Story |
| --- | --------------------- | ------------------------------ | ----- |
| 7   | CLI entry point       | `builder/cms.js`               | 1.4   |
| 8   | Ingest scanner        | `builder/cms/ingest.js`        | 1.4   |
| 9   | Pipeline orchestrator | `builder/cms/pipeline.js`      | 1.4   |
| 10  | HTML renderer         | `builder/cms/render.js`        | 1.4   |
| 11  | Error logger          | `builder/cms/errors.js`        | 1.4   |
| 12  | Hash + manifest       | `builder/cms/pipeline.js`      | 1.5   |
| 13  | Route injector        | `builder/cms/routes-inject.js` | 1.7   |

### Web Components (`src/UI/components/`) — browser, light DOM

| #   | Component        | File                | Story |
| --- | ---------------- | ------------------- | ----- |
| 14  | Article listing  | `cms-list/index.js` | 2.2   |
| 15  | Article renderer | `cms-page/index.js` | 2.3   |

### Verification (`cms/test/`)

| #   | Script              | File                           | Story |
| --- | ------------------- | ------------------------------ | ----- |
| 16  | Test runner         | `cms/test/run.js`              | 1.0   |
| 17  | Integration test    | `cms/test/integration.js`      | 3.1   |
| 18  | Compliance verifier | `akao-skill/scripts/verify.js` | 3.2   |

---

## Fixture-First Discipline

Fixtures sống tại `cms/test/fixtures/` và mirror cấu trúc production:

```text
cms/test/fixtures/
├── published/2026/06/01/00/01/   ← valid, ≥ 600 words
│   ├── en.md
│   └── meta.json
├── draft/2026/06/01/00/02/       ← valid nhưng trong draft/ → không được build
│   ├── en.md
│   └── meta.json
├── published/2026/06/01/00/03/   ← thiếu field "title" → MISSING_FIELD error
│   └── meta.json
├── published/2026/06/01/00/04/   ← title có dấu hai chấm "Barça: el partido"
│   └── meta.json
├── published/2026/06/01/00/05/   ← category có Unicode
│   └── meta.json
├── published/2026/06/01/00/06/   ← < 600 words → THIN_CONTENT error
│   └── en.md
└── published/2026/06/01/00/07/   ← publish_at = 2099-01-01 → SKIP silently
    └── meta.json
```

**Mỗi module mới phải thêm fixture của nó trước khi code được viết.** Fixture commit phải đến trước code commit trong git history.

---

## Architectural Constraints

Những ràng buộc này không phải feature — vi phạm là silent failure, không có error message, không có test báo đỏ. Phải nhớ trong suốt quá trình implement.

### 1. No `attachShadow` trên `cms-page` và `cms-list`

AdSense crawler không đọc được Shadow DOM. Render vào light DOM (`this`), không phải `this.shadowRoot`. Story 3.2 verify bằng grep — nhưng đừng đợi đến Story 3.2 mới để ý.

### 2. Mọi `<script>` trong output HTML phải có `defer` hoặc `type="module"`

`builder/cms/render.js` phải check bằng regex trước khi write file (FR-2.8). Script blocking = AdSense không load = revenue = 0. Không phải convention — là hard gate trong build pipeline.

### 3. Slug là immutable sau khi publish

Một khi `build/{locale}/{category}/{slug}/index.html` đã được tạo, slug đó không thể thay đổi. Nếu AI thay đổi slug trong `meta.json` → URL cũ thành 404 → mọi Facebook link đã post trở thành dead link → traffic mất không phục hồi được.

**Rule:** Build pipeline phát hiện slug thay đổi so với manifest.json → log WARNING rõ ràng, không tự đổi URL.

### 4. `routes.json` chỉ có 4 pattern entries — không inject per-article

Per-article = 50MB ở 330K bài → SPA parse time 2–3s → TBT fail. Pattern-based = constant size mãi mãi.

### 5. Kernel (`cms/src/`) không được import env-specific API

Không có `import fs from 'fs'`, không có `document.querySelector`, không có `fetch()` trực tiếp. Dùng `FS.js` abstraction. Enforce bằng code review — không có linter, phải tự nhớ.

---

## Recommended — Những gì docs chưa nói rõ

### `og:image` là AI's responsibility, không phải CMS

CMS chỉ emit `og:image` từ `meta.image || config.site.default_og_image`. CMS không resize, không validate URL, không check reachability. **AI agent phải cung cấp ảnh đúng spec: 1200×630px, publicly accessible từ Facebook crawler IP.** Ghi vào AI prompt, không phải code.

### `fb_caption` cần được enforce ở AI level

CMS emit `fb_caption` nếu có, fallback về `description[:160]`. Nhưng nếu AI không cung cấp `fb_caption` thì Facebook post sẽ dùng SEO description — flat, không emotion-driven, CTR thấp. **AI agent nên treat `fb_caption` là required**, dù CMS không reject khi thiếu.

### errors.log phải đủ để AI tự retry không cần human

Mỗi error entry cần: `{ ts, dir, code, detail }` — trong đó `detail` phải đủ cụ thể để AI biết sửa gì. Ví dụ không đủ: `"error": "validation failed"`. Đủ: `"error": "THIN_CONTENT: 342 words, minimum 600"`.

---

## Definition of Done — MVP

```text
✅ node cms/test/run.js → tất cả tests pass
✅ npm run build:cms → build/ output match contract
✅ Bài < 600 từ → errors.log, không có trong build/
✅ Bài trong draft/ → không có trong build/
✅ Slug đã publish → WARNING nếu bị thay đổi trong meta.json
✅ Không có <script> thiếu defer/type="module" trong bất kỳ index.html nào
✅ Không có attachShadow trong cms-page.js hoặc cms-list.js
✅ OG tags đủ → Facebook Sharing Debugger hiển thị ảnh + title
✅ AdSense script có trong initial HTML
✅ Incremental build: 1 bài thay đổi → 1 file rebuild
✅ routes.json có đúng 4 pattern entries, không tăng theo số bài
✅ 1 bài lỗi không crash build — errors.log có đủ detail để AI retry
```
