// Smoke test: Router.js, Threads.js, Stores.js — one happy-path per module,
// "calling correctly does not crash" (see TEST_PLAN.md A4).
//
// Note: HMR.js was removed from the codebase — nothing imports it, it only ran
// in browser dev-mode (DEV), and its el.shadowRoot logic directly conflicts with
// constraint #1 (no attachShadow on cms-page/cms-list). It is out of scope for
// the 20 MVP stories and identified as a leftover from the source codebase port.
import { test } from "node:test"
import assert from "node:assert"
import { Router } from "../Router.js"
import { Threads } from "../Threads.js"
import { Indexes, Statics } from "../Stores.js"

test("Router", async (t) => {
    const routes = ["/[category]/[slug]", "/tag/[tag]"]
    const locales = [{ code: "en" }, { code: "vi" }]
    const site = { locale: "en" }

    await t.test("process() — resolves locale from path prefix and matches route params", () => {
        const result = Router.process({ path: "/vi/the-thao/bai-viet-abc", routes, locales, site })
        assert.strictEqual(result.locale.code, "vi")
        assert.deepStrictEqual(result.params, { category: "the-thao", slug: "bai-viet-abc" })
        assert.strictEqual(result.route, "/[category]/[slug]")
        assert.strictEqual(result.path, "/vi/the-thao/bai-viet-abc/")
    })

    await t.test("process() — falls back to \"home\" route and default locale for \"/\"", () => {
        const home = Router.process({ path: "/", routes, locales, site })
        assert.strictEqual(home.route, "home")
        assert.strictEqual(home.locale.code, "en")
    })

    await t.test("match() — extracts named params or returns null when no pattern matches", () => {
        assert.deepStrictEqual(Router.match(["tag", "football"], "/tag/[tag]"), { tag: "football" })
        assert.strictEqual(Router.match(["about"], "/[category]/[slug]"), null)
    })
})

test("Threads", async (t) => {
    const threads = new Threads()

    await t.test("starts with an empty thread registry", () => {
        assert.deepStrictEqual(threads.threads, {})
    })

    await t.test("post()/queue()/call() against an unregistered thread fail gracefully, not throw", () => {
        assert.strictEqual(threads.post("missing", { hello: true }), false)
        assert.strictEqual(threads.queue({ thread: "missing", method: "noop" }), undefined)
        assert.strictEqual(threads.call({ thread: "missing", method: "noop" }), undefined)
    })
})

test("Stores", async (t) => {
    await t.test("Indexes.Hashes / Indexes.Statics — named IDB instances that become ready", async () => {
        assert.strictEqual(Indexes.Hashes.name, "Hashes")
        assert.strictEqual(Indexes.Statics.name, "Statics")
        await Indexes.Hashes.ready
        await Indexes.Statics.ready
    })

    await t.test("Statics — is the shared globalThis.Statics runtime config store", () => {
        assert.strictEqual(Statics, globalThis.Statics)
        assert.strictEqual(typeof Statics, "object")
    })
})
