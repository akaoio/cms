// Fixture-first test for src/cms/config.js — see TEST_PLAN.md B6 / STORIES.md Story 1.0 & 1.6
import { test } from "node:test"
import assert from "node:assert"
import { loadConfig } from "../config.js"

const FIXTURES = ["src", "cms", "__test__", "fixtures", "config"]
const fixture = (name) => [...FIXTURES, name]

test("config", async (t) => {
    await t.test("loadConfig — loads cms/config.yaml and exposes required keys", async () => {
        const config = await loadConfig(fixture("valid.yaml"))

        assert.strictEqual(config.site.default_og_image, "https://example.com/images/default-og.jpg")
        assert.strictEqual(config.quality_gate.min_word_count, 600)
    })

    await t.test("loadConfig — returns a frozen object", async () => {
        const config = await loadConfig(fixture("valid.yaml"))

        assert.strictEqual(Object.isFrozen(config), true)
        assert.throws(() => { config.site = {} }, TypeError)
    })

    await t.test("loadConfig — passes through optional analytics key when present", async () => {
        const config = await loadConfig(fixture("valid.yaml"))

        assert.strictEqual(config.analytics.ga4_measurement_id, "G-EXAMPLE123")
    })

    await t.test("loadConfig — does not throw when optional ga4_measurement_id is absent", async () => {
        const config = await loadConfig(fixture("no-analytics.yaml"))

        assert.strictEqual(config.analytics?.ga4_measurement_id, undefined)
    })

    await t.test("loadConfig — throws when site.default_og_image is missing", async () => {
        await assert.rejects(() => loadConfig(fixture("missing-og-image.yaml")))
    })

    await t.test("loadConfig — throws when quality_gate.min_word_count is missing", async () => {
        await assert.rejects(() => loadConfig(fixture("missing-min-word-count.yaml")))
    })
})
