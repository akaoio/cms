// Fixture-first test for src/builder/routes-inject.js — see TEST_PLAN.md C6
// Contract: injectRoutes() → Promise<void> — writes build/routes.json (5 pattern entries)
import { test } from "node:test"
import assert from "node:assert"
import os from "node:os"
import fs from "node:fs"
import path from "node:path"
import { injectRoutes } from "../routes-inject.js"

test("routes-inject — injector", async (t) => {
    const originalRoot = globalThis._root
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cms-routes-"))
    globalThis._root = tmpDir

    try {
        await t.test("injectRoutes — writes build/routes.json with 5 pattern entries", async () => {
            await injectRoutes()

            const raw = fs.readFileSync(path.join(tmpDir, "build", "routes.json"), "utf-8")
            const routes = JSON.parse(raw)

            assert.ok(Array.isArray(routes))
            assert.strictEqual(routes.length, 5)
            for (const route of routes) {
                assert.ok(typeof route.pattern === "string")
                assert.ok(typeof route.component === "string")
            }
        })

        await t.test("injectRoutes — entries cover article, category, sub-category, tag, and static page patterns", async () => {
            await injectRoutes()

            const raw = fs.readFileSync(path.join(tmpDir, "build", "routes.json"), "utf-8")
            const patterns = JSON.parse(raw).map(r => r.pattern)

            assert.ok(patterns.includes("/{date}/{cat1}/{cat2}/{slug}/{locale}/"))
            assert.ok(patterns.includes("/{cat1}/{cat2}/"))
            assert.ok(patterns.includes("/{cat1}/"))
            assert.ok(patterns.includes("/tag/{tag}/"))
            assert.ok(patterns.includes("/{page}/"))
        })

        await t.test("injectRoutes — never contains a concrete per-article path", async () => {
            await injectRoutes()

            const raw = fs.readFileSync(path.join(tmpDir, "build", "routes.json"), "utf-8")
            const patterns = JSON.parse(raw).map(r => r.pattern)

            for (const pattern of patterns) {
                // Patterns are templates only — no resolved slugs/dates/categories
                assert.doesNotMatch(pattern, /\/\d{8}\//)
                assert.match(pattern, /\{/)
            }
        })

        await t.test("injectRoutes — output is idempotent across repeated calls", async () => {
            await injectRoutes()
            const first = fs.readFileSync(path.join(tmpDir, "build", "routes.json"), "utf-8")

            await injectRoutes()
            const second = fs.readFileSync(path.join(tmpDir, "build", "routes.json"), "utf-8")

            assert.strictEqual(first, second)
        })
    } finally {
        globalThis._root = originalRoot
        fs.rmSync(tmpDir, { recursive: true, force: true })
    }
})
