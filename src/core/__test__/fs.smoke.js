// Smoke test: src/core/FS.js — happy-path round trip only (see TEST_PLAN.md A1)
import { test } from "node:test"
import assert from "node:assert"
import { FS } from "../FS.js"

const DIR = ["__fs_smoke__"]
const FILE = [...DIR, "hello.txt"]
const JSON_FILE = [...DIR, "data.json"]

test("FS", async (t) => {
    // Clean slate in case a previous run crashed mid-way
    await FS.remove(DIR)

    await t.test("ensure + exist — creates a directory and reports its presence", async () => {
        assert.strictEqual(await FS.ensure(DIR), true)
        assert.strictEqual(await FS.exist(DIR), true)
    })

    await t.test("write + load — round-trips plain text", async () => {
        const written = await FS.write(FILE, "hello world")
        assert.strictEqual(written.success, true)
        assert.strictEqual(await FS.exist(FILE), true)
        assert.strictEqual(await FS.load(FILE), "hello world")
    })

    await t.test("write + load — round-trips JSON (serialized then parsed back)", async () => {
        await FS.write(JSON_FILE, { a: 1, b: "two" })
        assert.deepStrictEqual(await FS.load(JSON_FILE), { a: 1, b: "two" })
    })

    await t.test("find — resolves the first existing path among candidates", async () => {
        const found = await FS.find([["__fs_smoke__", "missing.txt"], FILE])
        assert.deepStrictEqual(found, FILE)
    })

    await t.test("remove — deletes the directory and everything inside it", async () => {
        assert.strictEqual(await FS.remove(DIR), true)
        assert.strictEqual(await FS.exist(DIR), false)
        assert.strictEqual(await FS.exist(FILE), false)
    })
})
