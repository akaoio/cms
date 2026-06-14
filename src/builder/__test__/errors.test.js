// Fixture-first test for src/builder/errors.js — see TEST_PLAN.md C3
// Contract: appendError(data) → Promise<void> — newline-delimited JSON in build/errors.log, never throws
import { test } from "node:test"
import assert from "node:assert"
import os from "node:os"
import fs from "node:fs"
import path from "node:path"
import { appendError } from "../errors.js"

test("errors — logger", async (t) => {
    const originalRoot = globalThis._root
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-errors-"))
    globalThis._root = tmpDir

    try {
        await t.test("appendError — creates build/errors.log with a JSON entry including ts and given fields", async () => {
            await appendError({ code: "THIN_CONTENT", wordCount: 42, dir: "content/posts/staged/2026/06/01/00/01", locale: "en" })

            const logPath = path.join(tmpDir, "build", "errors.log")
            const raw = fs.readFileSync(logPath, "utf-8")
            const lines = raw.trim().split("\n")
            assert.strictEqual(lines.length, 1)

            const entry = JSON.parse(lines[0])
            assert.ok(typeof entry.ts === "string")
            assert.ok(!Number.isNaN(Date.parse(entry.ts)))
            assert.strictEqual(entry.code, "THIN_CONTENT")
            assert.strictEqual(entry.wordCount, 42)
            assert.strictEqual(entry.dir, "content/posts/staged/2026/06/01/00/01")
            assert.strictEqual(entry.locale, "en")
        })

        await t.test("appendError — appends subsequent entries on new lines without overwriting", async () => {
            await appendError({ code: "DUPLICATE_SLUG", slug: "20260601-foo" })

            const logPath = path.join(tmpDir, "build", "errors.log")
            const raw = fs.readFileSync(logPath, "utf-8")
            const lines = raw.trim().split("\n")
            assert.strictEqual(lines.length, 2)

            const first = JSON.parse(lines[0])
            const second = JSON.parse(lines[1])
            assert.strictEqual(first.code, "THIN_CONTENT")
            assert.strictEqual(second.code, "DUPLICATE_SLUG")
            assert.strictEqual(second.slug, "20260601-foo")
        })

        await t.test("appendError — never throws even when given no extra fields", async () => {
            await assert.doesNotReject(() => appendError({}))
        })
    } finally {
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})
