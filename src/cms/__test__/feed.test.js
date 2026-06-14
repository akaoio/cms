// Fixture-first test for src/cms/feed.js — see TEST_PLAN.md D2 / STORIES.md Story 1.9
import { test } from "node:test"
import assert from "node:assert"
import os from "node:os"
import fs from "node:fs"
import path from "node:path"
import { generateSitemap, generateRSS, generateRobots } from "../feed.js"

const CONFIG = {
    site: {
        url: "https://example.com",
        title: "Example Publication",
        description: "News from the example publication.",
    },
}

const ENTRIES = {
    "20260601-foo:en": {
        date_iso: "2026-06-01T00:00:00.000Z", slug: "20260601-foo",
        title: "Foo Article", description: "About foo", category: "technology",
        url: "/20260601/technology/general/20260601-foo/en/"
    },
    "20260601-foo:vi": {
        date_iso: "2026-06-01T00:00:00.000Z", slug: "20260601-foo",
        title: "Bai Foo", description: "Ve foo", category: "technology",
        url: "/20260601/technology/general/20260601-foo/vi/"
    },
    "20260602-bar:en": {
        date_iso: "2026-06-02T00:00:00.000Z", slug: "20260602-bar",
        title: "Bar Article", category: "sports",
        url: "/20260602/sports/esports/20260602-bar/en/"
    },
}

test("feed", async (t) => {
    const originalRoot = globalThis._root
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-feed-"))
    globalThis._root = tmpDir

    try {
        await t.test("generateSitemap — writes a <url> entry for every entry", async () => {
            await generateSitemap(ENTRIES, CONFIG)

            const xml = fs.readFileSync(path.join(tmpDir, "build", "sitemap.xml"), "utf-8")

            assert.match(xml, /<\?xml version="1\.0" encoding="UTF-8"\?>/)
            assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/)

            const urlCount = (xml.match(/<url>/g) || []).length
            assert.strictEqual(urlCount, Object.keys(ENTRIES).length)

            assert.match(xml, /<loc>https:\/\/example\.com\/20260601\/technology\/general\/20260601-foo\/en\/<\/loc>/)
            assert.match(xml, /<loc>https:\/\/example\.com\/20260601\/technology\/general\/20260601-foo\/vi\/<\/loc>/)
            assert.match(xml, /<loc>https:\/\/example\.com\/20260602\/sports\/esports\/20260602-bar\/en\/<\/loc>/)
        })

        await t.test("generateSitemap — lastmod uses the date portion of date_iso", async () => {
            await generateSitemap(ENTRIES, CONFIG)

            const xml = fs.readFileSync(path.join(tmpDir, "build", "sitemap.xml"), "utf-8")

            assert.match(xml, /<lastmod>2026-06-01<\/lastmod>/)
            assert.match(xml, /<lastmod>2026-06-02<\/lastmod>/)
        })

        await t.test("generateRSS — writes an <item> for every entry", async () => {
            await generateRSS(ENTRIES, CONFIG)

            const xml = fs.readFileSync(path.join(tmpDir, "build", "rss.xml"), "utf-8")

            assert.match(xml, /<rss version="2\.0">/)
            assert.match(xml, /<title>Example Publication<\/title>/)

            const itemCount = (xml.match(/<item>/g) || []).length
            assert.strictEqual(itemCount, Object.keys(ENTRIES).length)

            assert.match(xml, /<title>Foo Article<\/title>/)
            assert.match(xml, /<link>https:\/\/example\.com\/20260602\/sports\/esports\/20260602-bar\/en\/<\/link>/)
        })

        await t.test("generateRSS — caps at 20 items, newest first", async () => {
            const manyEntries = {}
            for (let i = 1; i <= 25; i++) {
                const day = String(i).padStart(2, "0")
                manyEntries[`202601${day}-post:en`] = {
                    date_iso: `2026-01-${day}T00:00:00.000Z`,
                    slug: `202601${day}-post`,
                    title: `Post ${i}`,
                    category: "technology",
                    url: `/202601${day}/technology/general/202601${day}-post/en/`,
                }
            }

            await generateRSS(manyEntries, CONFIG)

            const xml = fs.readFileSync(path.join(tmpDir, "build", "rss.xml"), "utf-8")
            const itemCount = (xml.match(/<item>/g) || []).length

            assert.strictEqual(itemCount, 20)
            assert.match(xml, /<title>Post 25<\/title>/)
            assert.doesNotMatch(xml, /<title>Post 1<\/title>/)
        })

        await t.test("generateRobots — writes robots.txt with Allow and Sitemap directives", async () => {
            await generateRobots(CONFIG)

            const txt = fs.readFileSync(path.join(tmpDir, "build", "robots.txt"), "utf-8")

            assert.match(txt, /Allow: \//)
            assert.match(txt, /Sitemap: https:\/\/example\.com\/sitemap\.xml/)
        })
    } finally {
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})
