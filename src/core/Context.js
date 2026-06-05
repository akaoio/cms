import States from "./States.js"

export const Context = new States({
    locale: getLocale(),
    theme: getTheme()
})

globalThis.Context = Context

export function getLocale() {
    const memory = globalThis.localStorage?.getItem("locale")
    const browser = globalThis.navigator?.language?.slice(0, 2)
    return memory || browser || "en"
}

export function setLocale(locale) {
    if (!locale) return
    if (globalThis.localStorage?.getItem("locale") !== locale) globalThis.localStorage?.setItem("locale", locale)
    if (Context.get("locale") === locale) return
    Context.set({ locale })
}

export function getTheme() {
    const memory = globalThis.localStorage?.getItem("theme")
    const system = globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light"
    const theme = memory || system || "light"
    if (theme !== memory) globalThis.localStorage?.setItem("theme", theme)
    if (globalThis.document) globalThis.document.documentElement.dataset.theme = theme
    return theme
}

export function setTheme(theme) {
    if (!theme) return
    if (globalThis.localStorage?.getItem("theme") !== theme) globalThis.localStorage?.setItem("theme", theme)
    if (globalThis.document) globalThis.document.documentElement.dataset.theme = theme
    if (Context.get("theme") === theme) return
    Context.set({ theme })
}
