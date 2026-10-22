// node docs/drafts/tools/helptree.mjs -- walks `spell --help` recursively and writes every command's help to docs/drafts/reference/cli-help-tree.txt (the ground truth the CLI pages are written from)
import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const CLI = new URL("../../../cli/bin/spell.mjs", import.meta.url).pathname
const out = []

function help(path) {
  const r = spawnSync("node", [CLI, ...path, "--help"], { encoding: "utf8", cwd: new URL("../../..", import.meta.url).pathname })
  return (r.stdout || "") + (r.stderr || "")
}

function subcommands(text) {
  const names = []
  let inCommands = false
  for (const line of text.split("\n")) {
    if (/^Commands:/.test(line)) { inCommands = true; continue }
    if (inCommands && /^\S/.test(line)) inCommands = false
    if (inCommands) {
      const m = line.match(/^  ([a-z][\w-]*)\b/)
      if (m && m[1] !== "help") names.push(m[1])
    }
  }
  return names
}

function topLevel(text) {
  // root help lists commands under "<repo>:" headings
  const names = []
  for (const line of text.split("\n")) {
    const m = line.match(/^  ([a-z][\w-]*)\b/)
    if (m && m[1] !== "help") names.push(m[1])
  }
  return names
}

const root = help([])
out.push("##### spell --help\n" + root)
const seen = new Set()
function walk(path) {
  const key = path.join(" ")
  if (seen.has(key)) return
  seen.add(key)
  const text = help(path)
  out.push(`##### spell ${key} --help\n` + text)
  for (const sub of subcommands(text)) walk([...path, sub])
}
for (const name of topLevel(root)) walk([name])

const epic = spawnSync(new URL("../../../spell-epic/bin/epic", import.meta.url).pathname, ["--help"], { encoding: "utf8" })
out.push("##### epic --help\n" + (epic.stdout || "") + (epic.stderr || ""))

writeFileSync(new URL("../reference/cli-help-tree.txt", import.meta.url).pathname, out.join("\n\n"))
console.log("wrote", out.length, "help pages")
