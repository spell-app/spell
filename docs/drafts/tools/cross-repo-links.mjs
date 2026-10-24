// node docs/drafts/tools/cross-repo-links.mjs [--write]
//
// Every README page of the kit and its child repos:  a relative link that lands in ANOTHER repo works in a checkout
// (the child repos sit inside the kit) but 404s on GitHub, where each repo stands alone.  This rewrites each such link
// as a full GitHub URL:  `blob/main/<path>` for a file, `tree/main/<path>` for a folder, `raw/main/<path>` for a
// picture (`![...](...)` or `<img src>`).  Links inside a page's own repo stay relative.  Fenced code is left alone.
// Without --write it only lists what it would change.
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"

const KIT = resolve(import.meta.dirname, "../../..")
const CHILDREN = ["spell-parser", "spell-ui", "spell-epic", "spell-app"]
const write = process.argv.includes("--write")

/** the repo a path belongs to:  [GitHub name, its folder] */
function repoOf(path) {
  const rel = relative(KIT, path)
  const first = rel.split(sep)[0]
  return CHILDREN.includes(first) ? [first, join(KIT, first)] : ["spell", KIT]
}

const pages = []
for (const folder of [KIT, ...CHILDREN.map((child) => join(KIT, child))])
  for (const name of readdirNames(folder)) if (/^README(-[\w-]+)?\.md$/.test(name)) pages.push(join(folder, name))

function readdirNames(folder) {
  return existsSync(folder) ? Array.from(new Set(require_readdir(folder))) : []
}
function require_readdir(folder) {
  return readdirSyncLocal(folder)
}
import { readdirSync as readdirSyncLocal } from "node:fs"

let total = 0
for (const page of pages) {
  const [pageRepo] = repoOf(page)
  const lines = readFileSync(page, "utf8").split("\n")
  let fence
  let changed = 0
  const out = lines.map((line) => {
    const trimmed = line.trim()
    if (fence) {
      if (trimmed.startsWith(fence) && trimmed.replace(/[`~]/g, "") === "") fence = undefined
      return line
    }
    const opening = /^\s*(`{3,}|~{3,})/.exec(line)
    if (opening) {
      fence = opening[1]
      return line
    }
    const fix = (target, isImage) => {
      if (/^[a-z][\w+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("//")) return target
      const hash = target.indexOf("#")
      const file = hash < 0 ? target : target.slice(0, hash)
      const anchor = hash < 0 ? "" : target.slice(hash)
      if (!file) return target
      const resolved = resolve(dirname(page), decodeURIComponent(file))
      const [targetRepo, repoRoot] = repoOf(resolved)
      if (targetRepo === pageRepo) return target
      const inRepo = relative(repoRoot, resolved).split(sep).join("/")
      const kind = isImage ? "raw" : existsSync(resolved) && statSync(resolved).isDirectory() ? "tree" : "blob"
      changed++
      return `https://github.com/spell-app/${targetRepo}/${kind}/main/${inRepo}${anchor}`
    }
    return line
      .replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, bang, text, target) => `${bang}[${text}](${fix(target, bang === "!")})`)
      .replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/g, (_m, a, target, c) => `${a}${fix(target, true)}${c}`)
      .replace(/(<a\b[^>]*\bhref=")([^"]+)(")/g, (_m, a, target, c) => `${a}${fix(target, false)}${c}`)
  })
  if (changed) {
    total += changed
    console.log(`${relative(KIT, page)}:  ${changed} cross-repo links`)
    if (write) writeFileSync(page, out.join("\n"))
  }
}
console.log(`${total} links in ${pages.length} pages${write ? ", rewritten" : " (dry run;  --write to rewrite)"}`)
