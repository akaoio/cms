// Fixture-first test for src/cms/meta.js — see TEST_PLAN.md B3 / STORIES.md Story 1.1
import { test } from "node:test"
import assert from "node:assert"
import { readMeta } from "../meta.js"

const FIXTURES = ["src", "cms", "__test__", "fixtures"]
const dir = (...parts) => [...FIXTURES, ...parts]

test("meta", async (t) => {
    await t.test("readMeta — returns parsed meta.yaml with all required fields present", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.title, "Inside the Newsrooms Where AI Agents File the First Draft")
        assert.strictEqual(meta.date, "2026-06-01T00:00:00.000Z")
        assert.strictEqual(meta.category, "technology")
        assert.strictEqual(meta.subcategory, "general")
    })

    await t.test("readMeta — passes optional fields through untouched", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.slug, "20260601-ai-agents-in-the-newsroom")
        assert.deepStrictEqual(meta.tags, ["artificial-intelligence", "journalism", "automation"])
        assert.strictEqual(meta.description, "A look inside newsrooms that now let AI agents draft, fact-check, and format stories before a human editor ever opens the file.")
        assert.strictEqual(meta.image, "https://example.com/images/ai-newsroom-cover.jpg")
        assert.strictEqual(meta.lang, "en")
        assert.strictEqual(meta.fb_caption, "AI agents are writing the first draft of the news now — and editors say it's the best thing to happen to their inbox in years.")
        assert.strictEqual(meta.publish_at, "2026-06-01T00:00:00.000Z")
        assert.strictEqual(meta.updated_at, "2026-06-02T00:00:00.000Z")
    })

    await t.test("readMeta — never carries draft or status fields", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir)

        assert.strictEqual("draft" in meta, false)
        assert.strictEqual("status" in meta, false)
    })

    await t.test("readMeta — throws MISSING_FIELD when title is absent", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "03")

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
        const articleDir = dir("staged", "2026", "06", "01", "00", "04")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.title, "Final Whistle: How a Last-Minute Penalty Decided the Derby")
    })

    await t.test("readMeta — accepts categories with Unicode characters", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "05")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.category, "văn-hóa")
        assert.strictEqual(meta.title, "Phở, bún chả và hành trình của ẩm thực đường phố Việt Nam ra thế giới")
    })

    await t.test("readMeta — reads meta.yaml for a future-dated publish_at without special handling", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "07")
        const meta = await readMeta(articleDir)

        assert.strictEqual(meta.publish_at, "2099-01-01T00:00:00.000Z")
        assert.strictEqual(meta.title, "Embargoed — Startup to Announce Fusion Pilot Plant Results")
    })

    await t.test("readMeta — with locale merges frontmatter title over meta.yaml", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir, "vi")

        assert.strictEqual(meta.title, "Bên trong các tòa soạn nơi AI viết bản thảo đầu tiên")
        assert.strictEqual(meta.lang, "vi")
    })

    await t.test("readMeta — with locale, non-overridden fields still come from meta.yaml", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir, "vi")

        assert.strictEqual(meta.category, "technology")
        assert.strictEqual(meta.slug, "20260601-ai-agents-in-the-newsroom")
        assert.deepStrictEqual(meta.tags, ["artificial-intelligence", "journalism", "automation"])
    })

    await t.test("readMeta — with locale that has no frontmatter returns meta.yaml fields unchanged", async () => {
        const articleDir = dir("staged", "2026", "06", "01", "00", "01")
        const meta = await readMeta(articleDir, "en")

        assert.strictEqual(meta.title, "Inside the Newsrooms Where AI Agents File the First Draft")
        assert.strictEqual(meta.lang, "en")
    })
})
