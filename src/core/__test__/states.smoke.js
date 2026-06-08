// Smoke test: src/core/States.js — happy-path subscribe/notify only (see TEST_PLAN.md A3)
import { test } from "node:test"
import assert from "node:assert"
import States from "../States.js"

test("States", async (t) => {
    const states = new States({ count: 0 })

    await t.test("set/get — round-trips values", () => {
        states.set({ count: 1, name: "alice" })
        assert.strictEqual(states.get("count"), 1)
        assert.strictEqual(states.get("name"), "alice")
    })

    await t.test("has() — reflects key presence", () => {
        assert.strictEqual(states.has("count"), true)
        assert.strictEqual(states.has("missing"), false)
    })

    const seen = []
    const counts = []

    await t.test("on(callback) — global subscriber fires on any change", () => {
        const off = states.on((data) => seen.push(data))
        states.set({ count: 2 })
        assert.strictEqual(seen.length, 1)
        assert.strictEqual(seen[0].key, "count")
        assert.strictEqual(seen[0].value, 2)
        assert.strictEqual(seen[0].last, 1)
        off()

        // off() — unsubscribed global callback stops receiving notifications
        states.set({ count: 3 })
        assert.strictEqual(seen.length, 1)
    })

    await t.test("on(key, callback) — path-specific subscriber fires only for its own key", () => {
        const off = states.on("count", (data) => counts.push(data.value))
        states.set({ count: 4 })
        states.set({ name: "bob" }) // unrelated key — should not notify "count" subscriber
        assert.deepStrictEqual(counts, [4])
        off()

        // off() — unsubscribed path-specific callback stops receiving notifications
        states.set({ count: 5 })
        assert.deepStrictEqual(counts, [4])
    })

    await t.test("del() — removes a key so has()/get() reflect the deletion", () => {
        states.del("name")
        assert.strictEqual(states.has("name"), false)
        assert.strictEqual(states.get("name"), undefined)
    })
})
