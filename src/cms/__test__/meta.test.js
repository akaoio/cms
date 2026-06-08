// Fixture-first test for src/cms/meta.js — see TEST_PLAN.md B3 / STORIES.md Story 1.1
import { test } from "node:test"
import assert from "node:assert"
import { readMeta } from "../meta.js"

const FIXTURES = ["src", "cms", "__test__", "fixtures"]
const dir = (...parts) => [...FIXTURES, ...parts]

test("meta", async (t) => {
    await t.test("readMeta — returns parsed meta.json with all required fields present", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.title, "How Static Site Generators Are Reshaping Modern Publishing")
        assert.strictEqual(meta.date, "2026-06-01T00:00:00.000Z")
        assert.strictEqual(meta.category, "technology")
    })

    await t.test("readMeta — passes optional fields through untouched", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.slug, "static-site-generators-modern-publishing")
        assert.deepStrictEqual(meta.tags, ["ssg", "publishing", "performance"])
        assert.strictEqual(meta.description, "A look at why static site generators are winning back the web from heavyweight CMS platforms.")
        assert.strictEqual(meta.image, "https://example.com/images/ssg-cover.jpg")
        assert.strictEqual(meta.lang, "en")
        assert.strictEqual(meta.fb_caption, "Static sites are fast, cheap, and nearly unbreakable. Here's why publishers are switching back.")
        assert.strictEqual(meta.publish_at, "2026-06-01T00:00:00.000Z")
        assert.strictEqual(meta.updated_at, "2026-06-02T00:00:00.000Z")
    })

    await t.test("readMeta — never carries draft or status fields", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir)

        assert.strictEqual("draft" in meta, false)
        assert.strictEqual("status" in meta, false)
    })

    await t.test("readMeta — throws MISSING_FIELD when title is absent", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "03")

        await assert.rejects(
            () => readMeta(articleDir),
            (error) => {
                assert.strictEqual(error.code, "MISSING_FIELD")
                assert.strictEqual(error.field, "title")
                assert.deepStrictEqual(error.dir, articleDir)
                return true
            }
        )
    })

    await t.test("readMeta — accepts titles containing a colon", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "04")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.title, "Barça: el partido")
    })

    await t.test("readMeta — accepts categories with Unicode characters", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "05")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.category, "công-nghệ")
        assert.strictEqual(meta.title, "Tin tức công nghệ tuần này")
    })

    await t.test("readMeta — reads meta.json for a future-dated publish_at without special handling", async () => {
        const articleDir = dir("published", "2026", "06", "01", "00", "07")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.publish_at, "2099-01-01T00:00:00.000Z")
        assert.strictEqual(meta.title, "Scheduled for the Future")
    })
})
