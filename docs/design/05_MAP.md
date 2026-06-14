# Pipeline Map — Internet → CMS HTML

---

## Graph 1 — Toàn cảnh pipeline (bird's eye)

```mermaid
flowchart LR
    INTERNET(["🌐 Internet"]):::source
    REPORTER["🕷️ Reporter<br/>— crawl + classify<br/>+ local LLM generate"]:::reporter
    ADAPTER(["⇄ Adapter"]):::adapter
    CMS_PUB[("📁 staged/")]:::cms
    BUILD["🔨 Build Pipeline"]:::build
    BUILD_OUT[("📦 build/")]:::buildout
    DEPLOY["CDN deploy step"]:::deploy
    CDN(["☁️ CDN"]):::cdn

    INTERNET --> REPORTER
    REPORTER --> ADAPTER
    ADAPTER --> CMS_PUB
    CMS_PUB --> BUILD
    BUILD --> BUILD_OUT
    BUILD_OUT --> DEPLOY --> CDN

    classDef source   fill:#1a1a2e,stroke:#e94560,color:#e94560,font-weight:bold,font-size:15px
    classDef reporter fill:#16213e,stroke:#0f3460,color:#a8dadc,font-weight:bold,font-size:14px
    classDef adapter  fill:#0f3460,stroke:#a8dadc,color:#a8dadc,font-style:italic,font-size:13px
    classDef cms      fill:#16213e,stroke:#e94560,color:#f1faee,font-weight:bold,font-size:14px
    classDef build    fill:#1b4332,stroke:#52b788,color:#b7e4c7,font-weight:bold,font-size:14px
    classDef buildout fill:#1a3a4a,stroke:#a8dadc,color:#a8dadc,font-weight:bold,font-size:13px
    classDef deploy   fill:#2d2d00,stroke:#ffd166,color:#ffd166,font-size:13px
    classDef cdn      fill:#1a1a2e,stroke:#ffd166,color:#ffd166,font-weight:bold,font-size:15px

    linkStyle 0 stroke:#e94560,stroke-width:2px
    linkStyle 1 stroke:#0f3460,stroke-width:2px
    linkStyle 2 stroke:#a8dadc,stroke-width:2px
    linkStyle 3 stroke:#e94560,stroke-width:2px
    linkStyle 4 stroke:#52b788,stroke-width:2px
    linkStyle 5 stroke:#a8dadc,stroke-width:2px
    linkStyle 6 stroke:#ffd166,stroke-width:2px
```

---

## Graph 2 — Reporter layer

```mermaid
flowchart TD
    IN(["🌐 Platform seed URLs<br/>— từ plugin.js mỗi platform"]):::source
    R1["Navigate tab<br/>— innerText + Debugger API screenshot"]:::step
    R2{"Chrome Prompt API<br/>— isArticle?"}:::gate
    R3["Extract text + download media<br/>— images → WebP · videos as-is"]:::step
    R4["Local LLM (OpenAI-compatible)<br/>— sinh 1 bài/locale"]:::llm
    OUT["Output: output/hash/<br/>en.md · de.md · ...<br/>· meta.json<br/>· images/ · videos/"]:::output
    CONT["follow links, tiếp tục crawl"]:::step
    NOTE["Không biết:<br/>category · subcategory · slug<br/>· fb_caption · CMS tồn tại<br/>· draft/staged/archived<br/><br/>Không có:<br/>policy/quality gate (GOALS #3)"]:::note

    IN --> R1 --> R2
    R2 -- "false" --> CONT --> R1
    R2 -- "true" --> R3 --> R4 --> OUT
    OUT -.-> NOTE

    classDef source  fill:#1a1a2e,stroke:#e94560,color:#e94560,font-weight:bold,font-size:14px
    classDef step    fill:#16213e,stroke:#0f3460,color:#a8dadc,font-size:13px
    classDef gate    fill:#3d1a00,stroke:#ff9f1c,color:#ffbf69,font-weight:bold,font-size:13px
    classDef llm     fill:#2d1b69,stroke:#c77dff,color:#e0aaff,font-weight:bold,font-size:13px
    classDef output  fill:#0f3460,stroke:#a8dadc,color:#f1faee,font-weight:bold,font-size:13px
    classDef note    fill:#2d2d2d,stroke:#555,color:#888,font-style:italic,font-size:11px

    linkStyle 0 stroke:#e94560,stroke-width:2px
    linkStyle 1 stroke:#0f3460,stroke-width:2px
    linkStyle 2 stroke:#ff9f1c,stroke-width:2px
    linkStyle 3 stroke:#ff9f1c,stroke-width:2px
    linkStyle 4 stroke:#ff9f1c,stroke-width:2px
    linkStyle 5 stroke:#c77dff,stroke-width:2px
    linkStyle 6 stroke:#a8dadc,stroke-width:2px
    linkStyle 7 stroke:#888,stroke-width:1.5px,stroke-dasharray:4 3
```

---

## Graph 3 — Adapter layer (Reporter → CMS, chưa có code)

```mermaid
flowchart TD
    IN["Input: output/hash/<br/>— en.md · de.md · ...<br/>· meta.json<br/>· images/ · videos/"]:::input
    A1["meta.json → meta.yaml<br/>— ADR-007"]:::step
    A2["Derive date · category · subcategory · slug<br/>· XX/YY chunked-ID (ADR-005)"]:::step
    A3["Synthesize fb_caption<br/>— GOALS #7, Reporter không sinh field này"]:::step
    A4["images[]/videos[] → chọn hero image<br/>cho meta.yaml: image"]:::step
    OUT["content/posts/draft/YYYY/MM/DD/XX/YY/<br/>— en.md · vi.md<br/>· meta.yaml"]:::output
    NOTE["Luôn vào draft/, không bao giờ staged/<br/>— Reporter chưa có policy/category gate,<br/>cần review trước khi git mv → staged/"]:::note

    IN --> A1 --> A2 --> A3 --> A4 --> OUT
    OUT -.-> NOTE

    classDef input   fill:#0f3460,stroke:#a8dadc,color:#f1faee,font-weight:bold,font-size:13px
    classDef step    fill:#1a1a2e,stroke:#533483,color:#c77dff,font-size:13px
    classDef output  fill:#1b4332,stroke:#52b788,color:#b7e4c7,font-weight:bold,font-size:13px
    classDef note    fill:#2d2d2d,stroke:#555,color:#888,font-style:italic,font-size:11px

    linkStyle 0 stroke:#a8dadc,stroke-width:2px
    linkStyle 1 stroke:#533483,stroke-width:2px
    linkStyle 2 stroke:#533483,stroke-width:2px
    linkStyle 3 stroke:#533483,stroke-width:2px
    linkStyle 4 stroke:#52b788,stroke-width:2px
    linkStyle 5 stroke:#888,stroke-width:1.5px,stroke-dasharray:4 3
```

---

## Graph 4 — Publisher layer (ai đặt file vào staged/)

```mermaid
flowchart TD
    AD["Adapter output<br/>— content/posts/draft/YYYY/MM/DD/XX/YY/"]:::adapter
    AG["AI Agent<br/>— sinh content trực tiếp"]:::agent
    DR[("content/posts/draft/<br/>— invisible với build pipeline")]:::draft
    REVIEW(["Review<br/>— category + policy check<br/>(GOALS #3)"]):::review
    MV(["git mv<br/>— chuyển draft → staged"]):::mv
    PUB[("📁 content/posts/staged/<br/>YYYY/MM/DD/XX/YY/<br/>en.md<br/>· vi.md<br/>· meta.yaml")]:::pub
    NOTE["CMS không biết<br/>ai đặt file vào đây.<br/>Chỉ đọc staged/<br/>— staged = ready for build,<br/>chưa phải live trên CDN"]:::note

    AD --> DR
    AG --> DR
    DR --> REVIEW --> MV --> PUB
    PUB -.-> NOTE

    classDef adapter fill:#0f3460,stroke:#a8dadc,color:#a8dadc,font-style:italic,font-size:13px
    classDef agent   fill:#1a1a2e,stroke:#ffd166,color:#ffd166,font-weight:bold,font-size:13px
    classDef draft   fill:#2d2d2d,stroke:#555,color:#888,font-size:12px
    classDef review  fill:#3d1a00,stroke:#ff9f1c,color:#ffbf69,font-weight:bold,font-size:12px
    classDef mv      fill:#2d2d2d,stroke:#a8dadc,color:#a8dadc,font-style:italic,font-size:12px
    classDef pub     fill:#16213e,stroke:#e94560,color:#f1faee,font-weight:bold,font-size:14px
    classDef note    fill:#2d2d2d,stroke:#555,color:#888,font-style:italic,font-size:11px

    linkStyle 0 stroke:#a8dadc,stroke-width:2px
    linkStyle 1 stroke:#ffd166,stroke-width:2px
    linkStyle 2 stroke:#888,stroke-width:2px
    linkStyle 3 stroke:#ff9f1c,stroke-width:2px
    linkStyle 4 stroke:#e94560,stroke-width:2px
    linkStyle 5 stroke:#888,stroke-width:1.5px,stroke-dasharray:4 3
```

---

## Graph 5 — CMS Build Pipeline

```mermaid
flowchart TD
    IN[("📁 content/posts/staged/**")]:::input

    B1["ingest.js<br/>— recurse staged/** only,<br/>draft/<br/>và archived/<br/>không chạm"]:::ingest
    B2["meta.js<br/>— đọc meta.yaml<br/>· merge locale frontmatter"]:::kernel
    B3["markdown.js<br/>— Markdown → HTML<br/>· strip frontmatter nếu có"]:::kernel
    B4["seo.js<br/>— OG tags<br/>· JSON-LD<br/>· canonical<br/>· GA4 block"]:::kernel
    B5["render.js<br/>— assemble<br/>full static HTML page"]:::builder
    GATE{"script tag audit<br/>— có script tag<br/>nào thiếu<br/>defer/async/module?"}:::gate
    B6["index.js<br/>— hash diff<br/>· ghi manifest<br/>· incremental build"]:::builder
    B7["feed.js<br/>— sinh sitemap.xml<br/>· rss.xml<br/>· robots.txt"]:::builder

    O1["build/YYYYMMDD/cat1/cat2/slug/locale/<br/>index.html<br/>· index.hash"]:::html
    O2["build/manifest.json<br/>— incremental build index<br/>build/index.json<br/>— article listing cho UI"]:::json
    O3["build/sitemap.xml<br/>· rss.xml<br/>· robots.txt"]:::feed
    ERR["build/errors.log<br/>— { ts, file, code, detail }<br/>mỗi lỗi một dòng"]:::err

    BUILD_OUT[("📦 build/<br/>— CMS server local disk<br/>toàn bộ output<br/>tập kết tại đây")]:::buildout
    DEPLOY["CDN deploy step<br/>— rsync<br/>· S3 sync<br/>· Cloudflare Pages push<br/>Chỉ push file<br/>có index.hash thay đổi"]:::deploy
    CDN(["☁️ CDN"]):::cdn

    IN --> B1 --> B2 --> B3 --> B4 --> B5 --> GATE
    GATE -- "pass" --> B6
    GATE -- "fail: script thiếu defer" --> ERR
    B5 -- "lỗi per-file" --> ERR
    B6 --> B7
    B6 --> O1
    B6 --> O2
    B7 --> O3
    O1 & O2 & O3 --> BUILD_OUT
    BUILD_OUT --> DEPLOY --> CDN

    classDef input    fill:#16213e,stroke:#e94560,color:#f1faee,font-weight:bold,font-size:14px
    classDef ingest   fill:#1b4332,stroke:#52b788,color:#b7e4c7,font-size:13px
    classDef kernel   fill:#1a1a2e,stroke:#533483,color:#c77dff,font-size:13px
    classDef builder  fill:#1b4332,stroke:#52b788,color:#b7e4c7,font-size:13px
    classDef gate     fill:#3d1a00,stroke:#ff9f1c,color:#ffbf69,font-weight:bold,font-size:13px
    classDef err      fill:#3d0000,stroke:#e63946,color:#ff6b6b,font-size:12px
    classDef html     fill:#0f3460,stroke:#a8dadc,color:#f1faee,font-size:12px
    classDef json     fill:#16213e,stroke:#555,color:#aaa,font-size:12px
    classDef feed     fill:#1b4332,stroke:#52b788,color:#b7e4c7,font-size:12px
    classDef buildout fill:#1a3a4a,stroke:#a8dadc,color:#a8dadc,font-weight:bold,font-size:14px
    classDef deploy   fill:#2d2d00,stroke:#ffd166,color:#ffd166,font-size:13px
    classDef cdn      fill:#1a1a2e,stroke:#ffd166,color:#ffd166,font-weight:bold,font-size:15px

    linkStyle 0 stroke:#e94560,stroke-width:2px
    linkStyle 1 stroke:#52b788,stroke-width:2px
    linkStyle 2 stroke:#533483,stroke-width:2px
    linkStyle 3 stroke:#533483,stroke-width:2px
    linkStyle 4 stroke:#533483,stroke-width:2px
    linkStyle 5 stroke:#52b788,stroke-width:2px
    linkStyle 6 stroke:#52b788,stroke-width:2px
    linkStyle 7 stroke:#e63946,stroke-width:2px
    linkStyle 8 stroke:#e63946,stroke-width:2px
    linkStyle 9 stroke:#52b788,stroke-width:2px
    linkStyle 10 stroke:#a8dadc,stroke-width:2px
    linkStyle 11 stroke:#aaa,stroke-width:2px
    linkStyle 12 stroke:#52b788,stroke-width:2px
    linkStyle 13 stroke:#a8dadc,stroke-width:2px
    linkStyle 14 stroke:#aaa,stroke-width:2px
    linkStyle 15 stroke:#52b788,stroke-width:2px
    linkStyle 16 stroke:#a8dadc,stroke-width:2px
    linkStyle 17 stroke:#ffd166,stroke-width:2px
```

---

## Ranh giới trách nhiệm

| Layer        | Biết gì                                   | Không biết gì                                            |
| ------------ | ----------------------------------------- | -------------------------------------------------------- |
| **Reporter** | URL nguồn, raw content, đa locale         | category · subcategory · slug · fb_caption · CMS tồn tại |
| **Adapter**  | Reporter output format + CMS input format | category/policy judgment (cần review riêng)              |
| **CMS**      | `content/posts/staged/`                   | Reporter · Adapter · content đến từ đâu                  |

> `GOALS #3`, `GOALS #7` (xuất hiện trong Graph 2–4 ở trên) — xem [00_GOALS.md](00_GOALS.md), numbering #1–16.
