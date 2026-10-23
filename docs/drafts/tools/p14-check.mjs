// node docs/drafts/tools/p14-check.mjs <page> [<page> ...]      (pages are paths from the kit's root:  README.md, spell-parser/README.md ...)
//
// Runs the README check (`tools/readme-check.ts`, this checkout's) on pages written for the FINISHED repo-split (epic
// repo-split P14:  every repo's code under one `src/`, every import a package name plus its path under `src/`), which
// this checkout doesn't have yet.
// - It builds an OVERLAY tree in the scratchpad:  the repo-split worktree's tree (symlinks, read-only), the kit's
//   `docs/` from THIS checkout (the pictures), and every README page of both trees:
//   - a page THIS checkout has rewritten since the voice work began (newer than `workflow-scripts/kit-wave.js`), and
//     every page named on the command line, comes from this checkout
//   - any other page comes from the repo-split worktree, whose old-voice pages are already at the finished layout's paths
//   So links to a REWRITTEN page's headings are checked against its new headings, and a link to a file under `src/`
//   against the tree where it'll be true.
// - Then it runs the checker over the named pages, in the overlay.
// Nothing is written outside the scratchpad;  the repo-split worktree is only read.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, symlinkSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const MINE = resolve(import.meta.dirname, "../../..")
const SPLIT = "/Users/owen/www/spell.worktrees/repo-split"
// one overlay per run (several writers check at once), removed when the check is done
const OVERLAY = `/private/tmp/claude-501/-Users-owen-www-spell/d5a307a4-0de5-4c43-817b-d113b0c12ede/scratchpad/p14-overlay-${process.pid}`
const CHILD_REPOS = ["spell-parser", "spell-ui", "spell-epic", "spell-app"]
const SKIP = new Set([".git", "node_modules", "spell.epics", "spell-brand", "dist-types"])
const PAGE = /^README(-[\w-]+)?\.md$/
const MARK = join(MINE, "docs/drafts/workflow-scripts/kit-wave.js")

const pages = process.argv.slice(2)
if (!pages.length) {
  console.error("usage: node docs/drafts/tools/p14-check.mjs <page> [<page> ...]   (paths from the kit's root)")
  process.exit(2)
}
if (!existsSync(SPLIT)) {
  console.error(`the repo-split worktree isn't at ${SPLIT}`)
  process.exit(2)
}
for (const page of pages) {
  if (!existsSync(resolve(MINE, page))) {
    console.error(`no such page in this checkout:  ${page}`)
    process.exit(2)
  }
}

const markTime = existsSync(MARK) ? statSync(MARK).mtimeMs : 0

/** where the overlay takes the page `rel` (from the kit's root) from:  this checkout's when rewritten or named */
function pageSource(rel) {
  const mine = join(MINE, rel)
  const split = join(SPLIT, rel)
  const haveMine = existsSync(mine)
  const haveSplit = existsSync(split)
  if (haveMine && (pages.includes(rel) || statSync(mine).mtimeMs > markTime || !haveSplit)) return mine
  return haveSplit ? split : undefined
}

/** the names of the README pages in `folder` of either tree */
function pageNames(rel) {
  const names = new Set()
  for (const base of [MINE, SPLIT]) {
    const folder = join(base, rel)
    if (existsSync(folder)) for (const name of readdirSync(folder)) if (PAGE.test(name)) names.add(name)
  }
  return [...names]
}

rmSync(OVERLAY, { recursive: true, force: true })
mkdirSync(OVERLAY, { recursive: true })

// the kit's root:  everything of the repo-split tree by link, but the pictures (ours), the checker (ours, a copy:
// it finds its root from where it lives) and the pages (copies)
for (const name of readdirSync(SPLIT)) {
  if (SKIP.has(name) || PAGE.test(name)) continue
  const from = join(SPLIT, name)
  const to = join(OVERLAY, name)
  if (name === "tools") {
    // the repo-split worktree's tools by link (pages link tools/repos.ts ...), but the checker is ours, a copy
    mkdirSync(to)
    for (const tool of readdirSync(from)) if (tool !== "readme-check.ts") symlinkSync(join(from, tool), join(to, tool))
    copyFileSync(join(MINE, "tools/readme-check.ts"), join(to, "readme-check.ts"))
  } else if (name === "docs") symlinkSync(join(MINE, "docs"), to)
  else if (CHILD_REPOS.includes(name)) {
    mkdirSync(to)
    for (const inner of readdirSync(from)) {
      if (SKIP.has(inner) || PAGE.test(inner)) continue
      // a repo's pictures:  this checkout's `docs/` when it has one (new screenshots), else the worktree's
      const mineInner = join(MINE, name, inner)
      symlinkSync(inner === "docs" && existsSync(mineInner) ? mineInner : join(from, inner), join(to, inner))
    }
  } else symlinkSync(from, to)
}

// every page of both trees, from the right one
for (const rel of ["", ...CHILD_REPOS]) {
  for (const name of pageNames(rel)) {
    const page = rel ? `${rel}/${name}` : name
    const source = pageSource(page)
    if (!source) continue
    mkdirSync(dirname(join(OVERLAY, page)), { recursive: true })
    copyFileSync(source, join(OVERLAY, page))
  }
}

const result = spawnSync("node", [join(OVERLAY, "tools/readme-check.ts"), ...pages], { cwd: OVERLAY, stdio: "inherit" })
rmSync(OVERLAY, { recursive: true, force: true })
process.exit(result.status ?? 1)
