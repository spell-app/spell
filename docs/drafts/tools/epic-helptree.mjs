// node docs/drafts/tools/epic-helptree.mjs [<epic binary>]
// Walks `epic --help` (every verb, and the verbs of a verb) and writes docs/drafts/reference/epic-help-tree.txt.
// The binary is, by default, the repo-split worktree's (read-only:  it only runs --help), because that session
// renamed the epic verbs (epic create / lint / update ... underway|done|noted, inbox watch|ignore ...) and they
// aren't on main yet.
import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"

const KIT = resolve(import.meta.dirname, "../../..")
const EPIC = process.argv[2] ?? "/Users/owen/www/spell.worktrees/repo-split/spell-epic/bin/epic"
const OUT = resolve(KIT, "docs/drafts/reference/epic-help-tree.txt")

function help(path) {
  const r = spawnSync(EPIC, [...path, "--help"], { encoding: "utf8" })
  return ((r.stdout || "") + (r.stderr || "")).split("\n").filter((line) => !line.includes("EPIC_CHECKOUT")).join("\n")
}

/** verbs named in a help text:  an indented word followed by two spaces and a description */
function verbs(text, depth) {
  const names = []
  let inCommands = depth > 0 ? false : true
  for (const line of text.split("\n")) {
    if (/^Commands:/.test(line)) { inCommands = true; continue }
    if (depth > 0 && inCommands && /^\S/.test(line)) inCommands = false
    if (!inCommands) continue
    const m = line.match(/^ {2}([a-z][\w-]*)\s{2,}\S/)
    if (m && m[1] !== "help") names.push(m[1])
  }
  return names
}

const out = []
const root = help([])
out.push("##### epic --help\n" + root)
for (const verb of verbs(root, 0)) {
  const text = help([verb])
  out.push(`##### epic ${verb} --help\n` + text)
  for (const sub of verbs(text, 1)) out.push(`##### epic ${verb} ${sub} --help\n` + help([verb, sub]))
}
writeFileSync(OUT, out.join("\n\n"))
console.log("wrote", out.length, "help pages to", OUT)
