// Fixture-first test for src/builder/pipeline.js — see TEST_PLAN.md C2 (and C2b for DUPLICATE_SLUG / archived redirect stub)
// Contract: runPipeline() → Promise<void> — orchestrates ingest → quality gate → render → manifest/index/routes/feeds
import { test } from "node:test"
import assert from "node:assert"
import os from "node:os"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { runPipeline } from "../pipeline.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_SRC = path.join(__dirname, "fixtures", "pipeline")

function setupTmpRoot() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-pipeline-"))
    fs.cpSync(FIXTURE_SRC, tmpDir, { recursive: true })
    return tmpDir
}

test("pipeline — quality gate (C2: THIN_CONTENT + publish_at)", async (t) => {
    const originalRoot = globalThis._root
    const originalLog = console.log
    console.log = () => {} // silence pipeline's progress logging during tests
    const tmpDir = setupTmpRoot()
    globalThis._root = tmpDir

    try {
        await runPipeline()

        await t.test("runPipeline — builds the happy-path article for all active locales", async () => {
            const enHtml = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-happy-path-article", "en", "index.html")
            const viHtml = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-happy-path-article", "vi", "index.html")

            assert.ok(fs.existsSync(enHtml), "expected en HTML output for happy-path article")
            assert.ok(fs.existsSync(viHtml), "expected vi HTML output for happy-path article")
        })

        await t.test("runPipeline — writes an index.hash sidecar next to each index.html", async () => {
            const enHash = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-happy-path-article", "en", "index.hash")

            assert.ok(fs.existsSync(enHash))
            const hash = fs.readFileSync(enHash, "utf-8")
            assert.match(hash, /^[0-9a-f]{64}$/)
        })

        await t.test("runPipeline — emits hreflang links between sibling locales of the same article", async () => {
            const enHtml = fs.readFileSync(path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-happy-path-article", "en", "index.html"), "utf-8")
            const viHtml = fs.readFileSync(path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-happy-path-article", "vi", "index.html"), "utf-8")

            assert.match(enHtml, /<link rel="alternate" hreflang="en" href="\/20260601\/technology\/general\/20260601-happy-path-article\/en\/">/)
            assert.match(enHtml, /<link rel="alternate" hreflang="vi" href="\/20260601\/technology\/general\/20260601-happy-path-article\/vi\/">/)
            assert.match(enHtml, /<link rel="alternate" hreflang="x-default" href="\/20260601\/technology\/general\/20260601-happy-path-article\/en\/">/)

            assert.match(viHtml, /<link rel="alternate" hreflang="en" href="\/20260601\/technology\/general\/20260601-happy-path-article\/en\/">/)
            assert.match(viHtml, /<link rel="alternate" hreflang="vi" href="\/20260601\/technology\/general\/20260601-happy-path-article\/vi\/">/)
        })

        await t.test("runPipeline — THIN_CONTENT article is not built and is logged to errors.log", async () => {
            const outDir = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-thin-content-article")
            assert.strictEqual(fs.existsSync(outDir), false)

            const errors = fs.readFileSync(path.join(tmpDir, "build", "errors.log"), "utf-8")
                .trim().split("\n").map(l => JSON.parse(l))
            const thinError = errors.find(e => e.code === "THIN_CONTENT")

            assert.ok(thinError, "expected a THIN_CONTENT error entry")
            assert.strictEqual(thinError.locale, "en")
            assert.ok(thinError.wordCount < 600)
        })

        await t.test("runPipeline — article with publish_at in the future is skipped silently (no error, no output)", async () => {
            const outDir = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-scheduled-article")
            assert.strictEqual(fs.existsSync(outDir), false)

            const errors = fs.readFileSync(path.join(tmpDir, "build", "errors.log"), "utf-8")
                .trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
            const scheduledError = errors.find(e => e.dir && e.dir.includes("20260601/00/03"))

            assert.strictEqual(scheduledError, undefined, "scheduled article must not appear in errors.log")
        })

        await t.test("runPipeline — writes build/manifest.json, build/index.json, build/routes.json", async () => {
            assert.ok(fs.existsSync(path.join(tmpDir, "build", "manifest.json")))
            assert.ok(fs.existsSync(path.join(tmpDir, "build", "index.json")))
            assert.ok(fs.existsSync(path.join(tmpDir, "build", "routes.json")))
        })

        await t.test("runPipeline — manifest entries only include the built (happy-path) article", async () => {
            const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, "build", "manifest.json"), "utf-8"))
            const ids = Object.keys(manifest.entries)

            assert.ok(ids.includes("20260601-happy-path-article:en"))
            assert.ok(ids.includes("20260601-happy-path-article:vi"))
            assert.ok(!ids.some(id => id.startsWith("20260601-thin-content-article")))
            assert.ok(!ids.some(id => id.startsWith("20260601-scheduled-article")))
        })
    } finally {
        console.log = originalLog
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})

test("pipeline — incremental rebuild (C4: unchanged content is skipped)", async (t) => {
    const originalRoot = globalThis._root
    const originalLog = console.log
    console.log = () => {}
    const tmpDir = setupTmpRoot()
    globalThis._root = tmpDir

    try {
        await runPipeline()

        const enHtml = path.join(tmpDir, "build", "20260601", "technology", "general", "20260601-happy-path-article", "en", "index.html")
        const firstMtime = fs.statSync(enHtml).mtimeMs

        // Second run with unchanged source content
        await runPipeline()
        const secondMtime = fs.statSync(enHtml).mtimeMs

        await t.test("runPipeline — does not rewrite index.html for unchanged articles on second run", async () => {
            assert.strictEqual(secondMtime, firstMtime)
        })

        await t.test("runPipeline — preserves the unchanged manifest entry across builds", async () => {
            const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, "build", "manifest.json"), "utf-8"))
            assert.ok(manifest.entries["20260601-happy-path-article:en"])
        })
    } finally {
        console.log = originalLog
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})

test("pipeline — quality gate (C2b: DUPLICATE_SLUG + archived redirect stub)", async (t) => {
    const originalRoot = globalThis._root
    const originalLog = console.log
    console.log = () => {}
    const tmpDir = setupTmpRoot()
    globalThis._root = tmpDir

    try {
        await runPipeline()

        await t.test("runPipeline — second article reusing an existing slug is skipped and logged as DUPLICATE_SLUG", async () => {
            const errors = fs.readFileSync(path.join(tmpDir, "build", "errors.log"), "utf-8")
                .trim().split("\n").filter(Boolean).map(l => JSON.parse(l))
            const dupError = errors.find(e => e.code === "DUPLICATE_SLUG")

            assert.ok(dupError, "expected a DUPLICATE_SLUG error entry")
            assert.strictEqual(dupError.slug, "20260601-duplicate-slug")
            assert.ok(dupError.dir.includes("02/01"), "second occurrence (later in ingest order) should be the one skipped")
        })

        await t.test("runPipeline — only the first article with a given slug is built", async () => {
            const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, "build", "manifest.json"), "utf-8"))
            const ids = Object.keys(manifest.entries).filter(id => id.startsWith("20260601-duplicate-slug"))

            assert.strictEqual(ids.length, 1)
        })

        await t.test("runPipeline — archived article gets a redirect stub at its former URL", async () => {
            const stubPath = path.join(tmpDir, "build", "20260501", "technology", "general", "20260501-archived-article", "en", "index.html")

            assert.ok(fs.existsSync(stubPath), "expected redirect stub HTML for archived article")
            const html = fs.readFileSync(stubPath, "utf-8")
            assert.match(html, /<meta http-equiv="refresh"/)
            assert.match(html, /\/technology\/general\//)
        })

        await t.test("runPipeline — archived article is not present in manifest entries", async () => {
            const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, "build", "manifest.json"), "utf-8"))
            const ids = Object.keys(manifest.entries)

            assert.ok(!ids.some(id => id.startsWith("20260501-archived-article")))
        })
    } finally {
        console.log = originalLog
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})
