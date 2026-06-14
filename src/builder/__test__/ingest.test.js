// Fixture-first test for src/builder/ingest.js — see TEST_PLAN.md C1
// Contract: ingest() → Promise<string[][]> — article folders under content/posts/staged/**
import { test } from "node:test"
import assert from "node:assert"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ingest } from "../ingest.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_ROOT = path.join(__dirname, "fixtures", "ingest")

test("ingest — scanner", async (t) => {
    const originalRoot = globalThis._root
    globalThis._root = FIXTURE_ROOT

    try {
        await t.test("ingest — returns article folders found under content/posts/staged/**", async () => {
            const dirs = await ingest()
            const joined = dirs.map(d => d.join("/"))

            assert.ok(joined.includes("content/posts/staged/2026/06/01/00/01"))
            assert.ok(joined.includes("content/posts/staged/2026/06/02/01/01"))
        })

        await t.test("ingest — never returns folders under content/posts/draft/**", async () => {
            const dirs = await ingest()
            const joined = dirs.map(d => d.join("/"))

            assert.ok(!joined.some(p => p.includes("/draft/")))
        })

        await t.test("ingest — never returns folders under content/posts/archived/**", async () => {
            const dirs = await ingest()
            const joined = dirs.map(d => d.join("/"))

            assert.ok(!joined.some(p => p.includes("/archived/")))
        })

        await t.test("ingest — does not recurse into an article folder past meta.yaml", async () => {
            const dirs = await ingest()
            const joined = dirs.map(d => d.join("/"))

            // Each result is the article folder itself, not a deeper path
            for (const p of joined) {
                assert.ok(p.endsWith("/01") || p.endsWith("01"))
            }
            assert.strictEqual(joined.length, 2)
        })

        await t.test("ingest — returns an empty array when content/posts/staged does not exist", async () => {
            globalThis._root = path.join(FIXTURE_ROOT, "does-not-exist")
            const dirs = await ingest()

            assert.deepStrictEqual(dirs, [])
        })
    } finally {
        globalThis._root = originalRoot
    }
})
