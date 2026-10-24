// node readme-compare.mjs <page> [<page> ...]
//
// For each README page (a path inside a repo of the kit checkout), lists the FACTS the old version of the page has
// that the working copy lacks:  relative link targets, inline code spans, numbers, the first line of each
// fenced command block, and headings.  Used while REWRITING a page:  every item it lists as missing is either
// still there under another form (reword it back), moved to another page, or an intentional cut that the
// rewriter names in its report.  It is a net, not a verdict:  prose can change freely.
//
// The OLD version is, by default, the repo-split worktree's copy of the page:  the old-voice page already moved to
// the finished layout (one `src/` per repo, imports by package name), so paths and commands count as kept.
// `--head` compares with this checkout's git HEAD instead (the layout before repo-split P14).
//
// Example:  node docs/drafts/tools/readme-compare.mjs README-server.md spell-parser/README.md
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const KIT = resolve(import.meta.dirname, "../../..")
const SPLIT = "/Users/owen/www/spell.worktrees/repo-split"
const args = process.argv.slice(2)
const useHead = args.includes("--head") || !existsSync(SPLIT)

function repoOf(file) {
  // the git repo a page belongs to:  a child repo's folder, else the kit
  let dir = dirname(file)
  while (dir.startsWith(KIT)) {
    if (existsSync(join(dir, ".git"))) return dir
    dir = dirname(dir)
  }
  return KIT
}

function committed(file) {
  if (!useHead) {
    const other = join(SPLIT, file.slice(KIT.length + 1))
    return existsSync(other) ? readFileSync(other, "utf8") : undefined
  }
  const repo = repoOf(file)
  const path = file.slice(repo.length + 1)
  try {
    return execFileSync("git", ["-C", repo, "show", `HEAD:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
  } catch {
    return undefined
  }
}

/** the facts of a page, each a Set of strings */
function facts(text) {
  const noMermaid = text.replace(/```mermaid[\s\S]*?```/g, "")
  const links = new Set([...noMermaid.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1].replace(/^<|>$/g, "")).filter((l) => !/^https?:/.test(l)))
  const code = new Set([...noMermaid.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()).filter((c) => c.length > 1))
  const numbers = new Set([...noMermaid.replace(/`[^`\n]*`/g, "").matchAll(/\b\d[\d,.]*\d\b/g)].map((m) => m[0]))
  const commands = new Set()
  for (const block of noMermaid.matchAll(/```(?:sh|bash|shell)\n([\s\S]*?)```/g)) {
    for (const line of block[1].split("\n")) {
      const t = line.trim()
      if (t && !t.startsWith("#")) commands.add(t.replace(/\s+#.*$/, ""))
    }
  }
  const headings = new Set([...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].trim()))
  return { links, code, numbers, commands, headings }
}

const pages = args.filter((arg) => !arg.startsWith("--"))
if (!pages.length) {
  console.error("usage: node readme-compare.mjs [--head] <page> [<page> ...]")
  process.exit(2)
}

for (const arg of pages) {
  const file = resolve(process.cwd(), arg)
  if (!existsSync(file)) {
    console.log(`\n=== ${arg}:  not on disk`)
    continue
  }
  const old = committed(file)
  if (old === undefined) {
    console.log(`\n=== ${arg}:  no old version (new page):  nothing to compare`)
    continue
  }
  const before = facts(old)
  const after = facts(readFileSync(file, "utf8"))
  console.log(`\n=== ${arg}`)
  for (const kind of ["links", "code", "numbers", "commands"]) {
    const missing = [...before[kind]].filter((x) => !after[kind].has(x))
    console.log(`${kind}:  ${missing.length} of ${before[kind].size} from the old page are missing`)
    for (const item of missing) console.log(`  - ${item}`)
  }
  const gone = [...before.headings].filter((h) => !after.headings.has(h))
  const added = [...after.headings].filter((h) => !before.headings.has(h))
  console.log(`headings:  ${gone.length} gone, ${added.length} new`)
  for (const h of gone) console.log(`  - gone:  ${h}`)
  for (const h of added) console.log(`  + new:   ${h}`)
}
