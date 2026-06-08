import IDB from "./IDB.js"
export const Indexes = {
    Hashes: new IDB({ name: "Hashes" }),
    Statics: new IDB({ name: "Statics" })
}

globalThis.Statics = globalThis.Statics || {}
export const Statics = globalThis.Statics
