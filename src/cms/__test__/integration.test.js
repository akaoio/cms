// End-to-end integration test — see TEST_PLAN.md E3 / STORIES.md Story 3.1
// Write meta.yaml + en.md to staged/ → runPipeline() → HTML exists, OG tags present,
// hash exists, sitemap has URL, errors.log empty for valid content.
import { test } from "node:test"
import assert from "node:assert"
import os from "node:os"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { runPipeline } from "../../builder/pipeline.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_SRC = path.join(__dirname, "fixtures", "integration")

test("integration — end-to-end build (E3)", async (t) => {
    const originalRoot = globalThis._root
    const originalLog = console.log
    console.log = () => {} // silence pipeline's progress logging during tests
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-integration-"))
    fs.cpSync(FIXTURE_SRC, tmpDir, { recursive: true })
    globalThis._root = tmpDir

    try {
        await runPipeline()

        const outDir = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-last-lighthouse-keeper", "en")

        await t.test("runPipeline — produces index.html for the article", async () => {
            assert.ok(fs.existsSync(path.join(outDir, "index.html")))
        })

        await t.test("runPipeline — emitted HTML contains the required OG tags", async () => {
            const html = fs.readFileSync(path.join(outDir, "index.html"), "utf-8")

            assert.match(html, /property="og:title"/)
            assert.match(html, /property="og:description"/)
            assert.match(html, /property="og:image"/)
            assert.match(html, /property="og:type"/)
            assert.match(html, /property="og:url"/)
            assert.match(html, /https:\/\/example\.com\/images\/lighthouse-cover\.jpg/)
        })

        await t.test("runPipeline — writes an index.hash sidecar containing a sha256 digest", async () => {
            const hashPath = path.join(outDir, "index.hash")
            assert.ok(fs.existsSync(hashPath))

            const hash = fs.readFileSync(hashPath, "utf-8")
            assert.match(hash, /^[0-9a-f]{64}$/)
        })

        await t.test("runPipeline — sitemap.xml contains the article's URL", async () => {
            const sitemap = fs.readFileSync(path.join(tmpDir, "build", "sitemap.xml"), "utf-8")

            assert.match(sitemap, /<loc>http:\/\/localhost:3000\/20260601\/technology\/general\/20260601-last-lighthouse-keeper\/en\/<\/loc>/)
        })

        await t.test("runPipeline — build/errors.log is empty for valid content", async () => {
            const errors = fs.readFileSync(path.join(tmpDir, "build", "errors.log"), "utf-8").trim()

            assert.strictEqual(errors, "")
        })
    } finally {
        console.log = originalLog
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})
