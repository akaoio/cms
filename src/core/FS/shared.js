import { NODE, BROWSER, WIN } from "../Utils/environment.js"
import { createDriver } from "./driver.js"
import { YAML } from "../YAML.js"

let fs = null
if (NODE) fs = await import("fs")

// File extensions treated as UTF-8 text — everything else is binary
export const TEXT_EXTS = ["json", "yaml", "yml", "csv", "tsv", "txt", "md", "html", "js", "css", "hash"]

export function isBinary(filePath) {
    const ext =
        (Array.isArray(filePath) ? filePath.at(-1) : filePath)
            .match(/\.\w+$/)?.[0]
            ?.slice(1)
            .toLowerCase() || ""
    return !!ext && !TEXT_EXTS.includes(ext)
}

// Builds a Node.js absolute file path from a path array.
// Cannot import join.js here (join.js imports shared.js → circular), so inline the logic.
function _nodePath(path) {
    const sep = WIN ? "\\" : "/"
    const joined = path.filter(Boolean).join(sep)
    // Guard: if already absolute (abs path or drive letter), return as-is
    if (joined.startsWith("/") || /^[A-Za-z]:/.test(joined)) return joined
    const base = globalThis._root || process.cwd()
    return base + sep + joined
}

// Unified I/O driver — env resolved ONCE at module load, never branches at call time.
// Browser: CMS uses DB.js + IndexedDB for caching; FS is HTTP-only, no local storage needed.
export const driver = createDriver(
    BROWSER
        ? {
              readBytes: async () => null,
              writeBytes: async () => ({ success: false, path: "" }),
              remove: async () => {},
              list: async () => [],
              entries: async () => [],
              exists: async () => false,
              isDir: async () => false,
              mkdir: async () => {},
              move: async () => {},
              copyFile: async () => {}
          }
        : {
              readBytes: (path) => {
                  const p = _nodePath(path)
                  if (!fs.existsSync(p)) return null
                  return new Uint8Array(fs.readFileSync(p))
              },
              writeBytes: (path, bytes) => {
                  const p = _nodePath(path)
                  const sep = WIN ? "\\" : "/"
                  const dir = p.slice(0, p.lastIndexOf(sep))
                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
                  fs.writeFileSync(p, bytes)
                  return { success: true, path: p }
              },
              remove: (path) => {
                  const p = _nodePath(path)
                  if (!fs.existsSync(p)) return
                  if (fs.statSync(p).isDirectory()) fs.rmSync(p, { recursive: true, force: true })
                  else fs.unlinkSync(p)
              },
              list: (path) => {
                  const p = _nodePath(path)
                  return fs.existsSync(p) ? fs.readdirSync(p) : []
              },
              entries: (path) => {
                  const p = _nodePath(path)
                  if (!fs.existsSync(p)) return []
                  return fs.readdirSync(p, { withFileTypes: true }).map((e) => ({ name: e.name, isDir: e.isDirectory() }))
              },
              exists: (path) => fs.existsSync(_nodePath(path)),
              isDir: (path) => {
                  const p = _nodePath(path)
                  return fs.existsSync(p) && fs.statSync(p).isDirectory()
              },
              mkdir: (path) => {
                  const p = _nodePath(path)
                  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
              },
              move: (src, dst) => {
                  fs.renameSync(_nodePath(src), _nodePath(dst))
              },
              copyFile: (src, dst) => {
                  const srcP = _nodePath(src)
                  const dstP = _nodePath(dst)
                  const sep = WIN ? "\\" : "/"
                  const dir = dstP.slice(0, dstP.lastIndexOf(sep))
                  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
                  fs.copyFileSync(srcP, dstP)
              }
          }
)

export { fs, YAML, NODE, BROWSER, WIN }
