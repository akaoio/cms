// Fixture-first test for src/cms/seo.js — see TEST_PLAN.md D1 / STORIES.md Story 1.8
import { test } from "node:test"
import assert from "node:assert"
import { generateSEO } from "../seo.js"

const META = {
    title: "How Static Site Generators Are Reshaping Modern Publishing",
    date: "2026-06-01T00:00:00.000Z",
    category: "technology",
    subcategory: "general",
    slug: "20260601-static-site-generators-modern-publishing",
    description: "A look at why static site generators are winning back the web from heavyweight CMS platforms.",
    image: "https://example.com/images/ssg-cover.jpg",
    fb_caption: "Static sites are fast, cheap, and nearly unbreakable. Here's why publishers are switching back.",
    updated_at: "2026-06-02T00:00:00.000Z",
}

const CONFIG = {
    site: {
        url: "https://example.com",
        title: "Example Publication",
        default_og_image: "https://example.com/images/default-og.jpg",
    },
    analytics: { ga4_measurement_id: "G-EXAMPLE123" },
    quality_gate: { min_word_count: 600 },
}

const URL = "https://example.com/en/technology/static-site-generators-modern-publishing/"

test("seo", async (t) => {
    await t.test("generateSEO — outputs all 5 required OG tags", () => {
        const html = generateSEO(META, CONFIG, URL)

        assert.match(html, /og:title/)
        assert.match(html, /og:description/)
        assert.match(html, /og:image/)
        assert.match(html, /og:type/)
        assert.match(html, /og:url/)
    })

    await t.test("generateSEO — og:image uses meta.image when present", () => {
        const html = generateSEO(META, CONFIG, URL)

        assert.match(html, /https:\/\/example\.com\/images\/ssg-cover\.jpg/)
    })

    await t.test("generateSEO — og:image falls back to config.site.default_og_image when meta.image absent", () => {
        const { image, ...metaNoImage } = META
        const html = generateSEO(metaNoImage, CONFIG, URL)

        assert.match(html, /https:\/\/example\.com\/images\/default-og\.jpg/)
        assert.doesNotMatch(html, /ssg-cover\.jpg/)
    })

    await t.test("generateSEO — fb:description uses fb_caption when present", () => {
        const html = generateSEO(META, CONFIG, URL)

        assert.match(html, /Static sites are fast, cheap, and nearly unbreakable/)
    })

    await t.test("generateSEO — fb:description falls back to description[:160] when fb_caption absent", () => {
        const { fb_caption, ...metaNoCaption } = META
        const html = generateSEO(metaNoCaption, CONFIG, URL)

        assert.match(html, /A look at why static site generators/)
    })

    await t.test("generateSEO — JSON-LD contains Article schema with required fields", () => {
        const html = generateSEO(META, CONFIG, URL)

        assert.match(html, /application\/ld\+json/)
        assert.match(html, /"@type":"Article"/)
        assert.match(html, /"headline"/)
        assert.match(html, /"datePublished"/)
    })

    await t.test("generateSEO — dateModified uses updated_at when present", () => {
        const html = generateSEO(META, CONFIG, URL)

        assert.match(html, /"dateModified":"2026-06-02T00:00:00\.000Z"/)
    })

    await t.test("generateSEO — dateModified falls back to date when updated_at absent", () => {
        const { updated_at, ...metaNoUpdate } = META
        const html = generateSEO(metaNoUpdate, CONFIG, URL)

        assert.match(html, /"dateModified":"2026-06-01T00:00:00\.000Z"/)
    })

    await t.test("generateSEO — injects GA4 script when ga4_measurement_id is present", () => {
        const html = generateSEO(META, CONFIG, URL)

        assert.match(html, /googletagmanager\.com/)
        assert.match(html, /G-EXAMPLE123/)
    })

    await t.test("generateSEO — no GA4 script when ga4_measurement_id is absent", () => {
        const configNoGA4 = { ...CONFIG, analytics: {} }
        const html = generateSEO(META, configNoGA4, URL)

        assert.doesNotMatch(html, /googletagmanager\.com/)
        assert.doesNotMatch(html, /G-EXAMPLE123/)
    })
})
