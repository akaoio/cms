// Smoke test: src/core/IDB.js — happy-path CRUD cycle only (see TEST_PLAN.md A2)
import { test } from "node:test"
import assert from "node:assert"
import IDB from "../IDB.js"
import { FS } from "../FS.js"

const NAME = "__idb_smoke__"

test("IDB", async (t) => {
    const idb = new IDB({ name: NAME })
    await idb.ready

    await t.test("get(key).put(value) — stores and overwrites a value", async () => {
        await idb.get("greeting").put("hello world")
        assert.strictEqual(await idb.get("greeting").once(), "hello world")

        await idb.get("greeting").put("updated")
        assert.strictEqual(await idb.get("greeting").once(), "updated")
    })

    await t.test("del() — removes the value (subsequent once() resolves undefined)", async () => {
        await idb.get("greeting").del()
        assert.strictEqual(await idb.get("greeting").once(), undefined)
    })

    await t.test("keys() — Node backend returns an empty array (no IDB-backed enumeration)", async () => {
        assert.deepStrictEqual(await idb.keys(), [])
    })

    // Cleanup the on-disk store created by Node's IDB persistence (IDB/disk.js)
    await FS.remove(["indexed", `${NAME}.json`])
})
