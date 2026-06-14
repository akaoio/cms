// Fixture-first test for src/cms/index.js — see TEST_PLAN.md C4 (manifest/hash) and C5 (saveIndex)
import { test } from "node:test"
import assert from "node:assert"
import os from "node:os"
import fs from "node:fs"
import path from "node:path"
import { sha256, loadManifest, saveManifest, saveIndex } from "../index.js"

test("index — hash & manifest (C4)", async (t) => {
    const originalRoot = globalThis._root
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-manifest-"))
    globalThis._root = tmpDir

    try {
        await t.test("sha256 — returns a 64-char hex digest", async () => {
            const digest = await sha256("hello world")

            assert.strictEqual(digest.length, 64)
            assert.match(digest, /^[0-9a-f]{64}$/)
        })

        await t.test("sha256 — is deterministic for the same input", async () => {
            const a = await sha256("same content")
            const b = await sha256("same content")

            assert.strictEqual(a, b)
        })

        await t.test("loadManifest — returns null when manifest.json does not exist", async () => {
            const manifest = await loadManifest()

            assert.strictEqual(manifest, null)
        })

        await t.test("saveManifest — writes build/manifest.json with { v, built, entries } schema", async () => {
            const entries = { "20260601-foo:en": { hash: "abc123", slug: "20260601-foo", locale: "en" } }
            await saveManifest(entries)

            const raw = fs.readFileSync(path.join(tmpDir, "build", "manifest.json"), "utf-8")
            const manifest = JSON.parse(raw)

            assert.strictEqual(manifest.v, 1)
            assert.ok(typeof manifest.built === "string")
            assert.ok(!Number.isNaN(Date.parse(manifest.built)))
            assert.deepStrictEqual(manifest.entries, entries)
        })

        await t.test("saveManifest — does not leave manifest.tmp.json behind", async () => {
            await saveManifest({ "20260601-foo:en": { hash: "abc123" } })

            assert.strictEqual(fs.existsSync(path.join(tmpDir, "build", "manifest.tmp.json")), false)
        })

        await t.test("loadManifest — returns the saved entries on a subsequent load", async () => {
            const entries = { "20260601-foo:en": { hash: "abc123", slug: "20260601-foo", locale: "en" } }
            await saveManifest(entries)

            const manifest = await loadManifest()

            assert.strictEqual(manifest.v, 1)
            assert.deepStrictEqual(manifest.entries, entries)
        })

        await t.test("loadManifest — returns null and forces rebuild when manifest.tmp.json exists (crash recovery)", async () => {
            await saveManifest({ "20260601-foo:en": { hash: "abc123" } })
            fs.writeFileSync(path.join(tmpDir, "build", "manifest.tmp.json"), "{}")

            const manifest = await loadManifest()

            assert.strictEqual(manifest, null)
        })
    } finally {
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})

test("index — index builder (C5)", async (t) => {
    const originalRoot = globalThis._root
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-saveindex-"))
    globalThis._root = tmpDir

    const ENTRIES = {
        "20260601-foo:en": {
            hash: "h1", locale: "en", category: "technology", subcategory: "general",
            date: "20260601", date_iso: "2026-06-01T00:00:00.000Z", slug: "20260601-foo",
            title: "Foo Article", description: "About foo", tags: ["a", "b"],
            url: "/20260601/technology/general/20260601-foo/en/"
        },
        "20260601-foo:vi": {
            hash: "h2", locale: "vi", category: "technology", subcategory: "general",
            date: "20260601", date_iso: "2026-06-01T00:00:00.000Z", slug: "20260601-foo",
            title: "Bai Foo", description: "Ve foo", tags: ["a", "b"],
            url: "/20260601/technology/general/20260601-foo/vi/"
        },
        "20260602-bar:en": {
            hash: "h3", locale: "en", category: "sports", subcategory: "esports",
            date: "20260602", date_iso: "2026-06-02T00:00:00.000Z", slug: "20260602-bar",
            title: "Bar Article", tags: [],
            url: "/20260602/sports/esports/20260602-bar/en/"
        }
    }

    try {
        await t.test("saveIndex — writes build/index.json as an array of records with expected fields", async () => {
            await saveIndex(ENTRIES)

            const raw = fs.readFileSync(path.join(tmpDir, "build", "index.json"), "utf-8")
            const records = JSON.parse(raw)

            assert.ok(Array.isArray(records))
            assert.strictEqual(records.length, 3)

            for (const record of records) {
                assert.ok("slug" in record)
                assert.ok("title" in record)
                assert.ok("date" in record)
                assert.ok("category" in record)
                assert.ok("subcategory" in record)
                assert.ok("tags" in record)
                assert.ok("description" in record)
                assert.ok("locale" in record)
                assert.ok("url" in record)
            }
        })

        await t.test("saveIndex — date field is the ISO date (date_iso), not the YYYYMMDD folder date", async () => {
            await saveIndex(ENTRIES)

            const raw = fs.readFileSync(path.join(tmpDir, "build", "index.json"), "utf-8")
            const records = JSON.parse(raw)

            for (const record of records) {
                assert.match(record.date, /^\d{4}-\d{2}-\d{2}T/)
            }
        })

        await t.test("saveIndex — emits one record per locale (multi-locale article appears twice)", async () => {
            await saveIndex(ENTRIES)

            const raw = fs.readFileSync(path.join(tmpDir, "build", "index.json"), "utf-8")
            const records = JSON.parse(raw)

            const fooRecords = records.filter(r => r.slug === "20260601-foo")
            const locales = fooRecords.map(r => r.locale).sort()

            assert.strictEqual(fooRecords.length, 2)
            assert.deepStrictEqual(locales, ["en", "vi"])
        })

        await t.test("saveIndex — sorts records by date descending (newest first)", async () => {
            await saveIndex(ENTRIES)

            const raw = fs.readFileSync(path.join(tmpDir, "build", "index.json"), "utf-8")
            const records = JSON.parse(raw)

            const dates = records.map(r => new Date(r.date).getTime())
            for (let i = 1; i < dates.length; i++) {
                assert.ok(dates[i - 1] >= dates[i], "records must be sorted newest first")
            }
        })

        await t.test("saveIndex — defaults missing tags to [] and missing description to ''", async () => {
            await saveIndex(ENTRIES)

            const raw = fs.readFileSync(path.join(tmpDir, "build", "index.json"), "utf-8")
            const records = JSON.parse(raw)

            const bar = records.find(r => r.slug === "20260602-bar")
            assert.deepStrictEqual(bar.tags, [])
            assert.strictEqual(bar.description, "")
        })
    } finally {
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})
