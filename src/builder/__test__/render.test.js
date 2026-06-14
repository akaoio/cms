// Fixture-first test for src/builder/render.js — see TEST_PLAN.md C7
// Contract: renderPage(meta, bodyHtml, seoHtml, config, siblingLocales?) → full HTML string
import { test } from "node:test"
import assert from "node:assert"
import { renderPage } from "../render.js"

const META = {
    title: "How Static Site Generators Work",
    lang: "vi",
    date: "2026-06-01T00:00:00.000Z",
    category: "technology",
    subcategory: "general",
    slug: "20260601-how-ssg-work",
}

// Simulates parseMarkdown() output — body with a section split point
const BODY_HTML = [
    "<h1>How Static Site Generators Work</h1>",
    "<h2>First Section</h2>",
    "<p>Content of the first section.</p>",
    "<h2>Second Section</h2>",
    "<p>Content of the second section.</p>",
].join("\n")

// Simulates generateSEO() output
const SEO_HTML = '<meta property="og:title" content="How Static Site Generators Work">\n<meta property="og:type" content="article">'

const CONFIG = {
    site: { url: "https://example.com", title: "Example Publication", default_og_image: "" },
    analytics: { ga4_measurement_id: "G-EXAMPLE123" },
    adsense: { publisher_id: "ca-pub-1234567890", slots: { top: "1111111111", mid: "2222222222", bottom: "3333333333" } },
    quality_gate: { min_word_count: 600 },
}

// URL format: /{YYYYMMDD}/{cat1}/{cat2}/{slug}/{locale}/ (confirmed 2026-06-08)
const SIBLINGS = [
    { locale: "en", url: "https://example.com/20260601/technology/general/20260601-how-ssg-work/en/" },
    { locale: "vi", url: "https://example.com/20260601/technology/general/20260601-how-ssg-work/vi/" },
]

test("render — page assembler", async (t) => {
    await t.test("renderPage — starts with DOCTYPE and html element with lang attribute", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)

        assert.match(html, /^<!DOCTYPE html>/i)
        assert.match(html, /<html[^>]+lang="vi"/)
    })

    await t.test("renderPage — title combines meta.title and config.site.title", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)

        assert.match(html, /<title>How Static Site Generators Work \| Example Publication<\/title>/)
    })

    await t.test("renderPage — seoHtml is injected inside head", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        const headEnd = html.indexOf("</head>")
        const seoPos = html.indexOf('og:title')

        assert.ok(seoPos !== -1, "og:title not found in output")
        assert.ok(seoPos < headEnd, "SEO block must be inside <head>")
    })

    await t.test("renderPage — hreflang links appear for all sibling locales", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)

        assert.match(html, /hreflang="en"/)
        assert.match(html, /hreflang="vi"/)
        assert.match(html, /https:\/\/example\.com\/20260601\/technology\/general\/20260601-how-ssg-work\/en\//)
    })

    await t.test("renderPage — x-default hreflang points to en locale", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)

        assert.match(html, /hreflang="x-default"/)
    })

    await t.test("renderPage — AdSense loader script uses async in head", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        const headEnd = html.indexOf("</head>")
        const headBlock = html.slice(0, headEnd)

        assert.match(headBlock, /pagead2\.googlesyndication\.com/)
        assert.match(headBlock, /<script[^>]+async[^>]*>/)
        assert.match(headBlock, /ca-pub-1234567890/)
    })

    await t.test("renderPage — external scripts with src all use defer, async, or type=module", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        // Find all <script src=...> tags — none should be bare (blocking)
        const bareScript = /<script\s+src=/i
        const deferredScript = /<script[^>]+(defer|async|type=["']module["'])[^>]*src=/i
        const matches = html.match(/<script[^>]+src=[^>]*>/gi) || []

        for (const tag of matches) {
            const isAllowed = /\bdefer\b/.test(tag) || /\basync\b/.test(tag) || /\btype=["']module["']/.test(tag)
            assert.ok(isAllowed, `Blocking external script found: ${tag}`)
        }
    })

    await t.test("renderPage — has 3 AdSense ins slots: ad-top, ad-mid, ad-bottom", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)

        assert.match(html, /id="ad-top"/)
        assert.match(html, /id="ad-mid"/)
        assert.match(html, /id="ad-bottom"/)
        assert.match(html, /class="adsbygoogle"/)
    })

    await t.test("renderPage — all 3 ins slots carry publisher_id from config", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        const matches = html.match(/data-ad-client="ca-pub-1234567890"/g) || []

        assert.strictEqual(matches.length, 3)
    })

    await t.test("renderPage — body content is inside article element", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        const articleStart = html.indexOf("<article")
        const articleEnd = html.indexOf("</article>")

        assert.ok(articleStart !== -1, "<article> not found")
        assert.ok(articleEnd > articleStart, "</article> not found after <article>")
        const article = html.slice(articleStart, articleEnd)
        assert.match(article, /First Section/)
    })

    await t.test("renderPage — ad-mid is inside article element", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        const articleStart = html.indexOf("<article")
        const articleEnd = html.indexOf("</article>")
        const article = html.slice(articleStart, articleEnd)

        assert.match(article, /id="ad-mid"/)
    })

    await t.test("renderPage — ad-top and ad-bottom are outside article element", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, SIBLINGS)
        const articleStart = html.indexOf("<article")
        const articleEnd = html.indexOf("</article>")

        const beforeArticle = html.slice(0, articleStart)
        const afterArticle = html.slice(articleEnd)

        assert.match(beforeArticle, /id="ad-top"/)
        assert.match(afterArticle, /id="ad-bottom"/)
    })

    await t.test("renderPage — works with no sibling locales (no hreflang)", () => {
        const html = renderPage(META, BODY_HTML, SEO_HTML, CONFIG, [])

        assert.ok(typeof html === "string")
        assert.doesNotMatch(html, /hreflang/)
    })

    await t.test("renderPage — body without h2 puts all content before ad-mid", () => {
        const noH2Body = "<h1>Title</h1>\n<p>Single paragraph only.</p>"
        const html = renderPage(META, noH2Body, SEO_HTML, CONFIG, [])

        assert.match(html, /Single paragraph only/)
        assert.match(html, /id="ad-mid"/)
    })
})
