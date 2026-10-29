/**
 * Link source references in `.html` docs:  one named target per destination, new tab.
 * - see `src/AGENTS.md`, "Links"
 *
 * Usage (from the epic folder, `epic/`):
 *   yarn tsx tools/doc-links.js <folder>/<doc>.html ...           -- add links (idempotent)
 *   yarn tsx tools/doc-links.js --check <folder>/<doc>.html ...   -- verify, exit 1 on problems
 *   ... --root <checkout> ...                                     -- links resolve in that checkout, not this one
 *   yarn tsx tools/doc-links.js --root-links [--dry-run] <file> ...  -- ONLY the relative links as root paths
 * - `--root-links` (epic `epic-engine` P46):  the `root-links` rewrite (`RootLinks.rewrite()`) on any page or Markdown
 *   file, every other byte kept:  for the files `epic migrate` doesn't walk (the repos' own pages, the templates,
 *   scratch copies);  prints each file it changed and every link it couldn't place
 * - This file is the command line, on files, of `spell/server`'s `Linker` (epic `epic-components`, P7).
 *   - the rules live there:  what becomes a link, how a link gets its target, what `--check` verifies
 *   - shared with the `epic` tool (`src/tool/`)
 * - `--root`:  for a copy of the pages beside a copy of the code (a dry run of `relocate.js relink`, say)
 *   - version control's ignores are that checkout's, so it should be a git repo with the repo's `.gitignore`
 * - Every page links as served under the checkout that serves it (epic `epic-engine` I22, P46):  ROOT PATHS from
 *   there (`/spell-ui/x.ts`), the same from any folder
 * - Runs under `tsx`:  `spell/server`'s files import each other without extensions, which plain `node` can't load.
 *   - the tools that run it (`update.js`, `pages.js` `tidy()`, goals' check) go through `pages.js` `docLinksRun()`
 * - A component set's pages link as from their SERVED address,
 *   so their links hold at `/worktrees/<w>/components/epics/` too.
 *   - e.g. `epic/src/docs/`, served at `/components/epics/` (the checkout's `"pageServer"` `"componentSets"`,
 *     `ServedFolders`)
 *   - their links are written and checked from there (`Linker`'s `served`, `servedDir()`)
 * - `--check` also checks short addresses (`href="SAGA:/..."`) and `<epic-link>`s, which `Linker` leaves alone:
 *   the epics tool's `EpicTargets` knows the sagas (epic `epic-workflow` P15).
 * - NOTE:  ported from `doc-links.py` on 2026-10-03;  makes the same edits to every page.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve as resolvePath } from "node:path"

import { SRV } from "spell/server"
import { kitOf } from "spell/server/page/settings"
import { RepoList } from "spell/epic/server/RepoList"
import { EpicTargets } from "spell/epic/tool/EpicTargets"
import { ServedFolders } from "spell/epic/tool/ServedFolders"
import { RootLinks } from "spell/epic/tool/migrations/RootLinks"

import { CONTENT, PACKAGE, ROOT } from "./pages.js"

/**
 * The checkout the links are from:  the kit, when `ROOT` is one of its folders (epic `repo-split` P20, I46);
 * else `ROOT`.
 * - Run as `yarn tsx src/tools/doc-links.js` in `epic/`, `ROOT` is the epic folder:  without this, `/epic/src/x.ts`
 *   was looked for under `epic/epic/`, and every bare file name was found in the content folder instead.
 */
const CHECKOUT = kitOf(ROOT) ?? ROOT

/**
 * The folders served at another address under checkout `root` (`ServedFolders`):  the component sets'
 * (`{ "components/epics": "epic/src/docs" }`), and the engine's templates, at `templates/`, so a guide's
 * `../templates/durable.html` checks against spell-epic's copy.  The `epic` tool's linker is told the same.
 */
function servedUnder(root) {
  return ServedFolders.under(root, PACKAGE)
}

/**
 * ONE linker, under the checkout the page server serves (`RepoList.linkRootOf()`:  the kit, for a folder of it or
 * an older child repo's checkout;  or the command line's `--root`):  its bare-name index is built once per process.
 * - every link is a ROOT PATH from there (epic `epic-engine` P46):  a content page's, and this repo's own pages'
 *   (Epic UI's, the templates), `/epic/src/...` alike
 * - before P46, this repo's own pages linked from this checkout, and only the content folder's from the kit (I22)
 */
let linker = linkerUnder(new RepoList().linkRootOf(CHECKOUT))

/** A linker under checkout `root`, told its served folders:  a new one each call, so callers keep theirs. */
export function linkerUnder(root) {
  return new SRV.Linker(resolvePath(root), { served: servedUnder(root) })
}

/** The content folder, real:  a page in it is taken by its real folder, whichever link it's reached through. */
const REAL_CONTENT = SRV.RealPath.of(CONTENT)

/**
 * The linker for a page in `docDir`, and that folder as it takes it:  a content page's folder real, so it's laid
 * under the checkout as served;  any other as given.
 */
export function linkerFor(docDir) {
  const real = SRV.RealPath.of(resolvePath(docDir))
  if (real === REAL_CONTENT || real.startsWith(`${REAL_CONTENT}/`)) return { linker, dir: real }
  return { linker, dir: docDir }
}

/**
 * What short addresses and `<epic-link>`s find in this checkout, or the `--root` one (epic `epic-workflow` P15):
 * the sagas, pages, ids.
 */
let targets = new EpicTargets(CHECKOUT)

////////////////
// ## Linking
////////////////

/**
 * Link the code spans of the page at `path` and target its links, IN PLACE;  prints a summary line, then each
 * unresolved path-like span on its own line (they may hold `, `).
 * - SIDE EFFECT:  always rewrites the file, changed or not
 */
export function linkify(path) {
  const { text, linked, unresolved } = linkText(readFileSync(path, "utf8"), dirname(resolvePath(path)))
  writeFileSync(path, text)
  console.log(`${basename(path)}:  linked ${linked} code spans, ${unresolved.length} unresolved path-like`)
  for (const span of unresolved) console.log(`    ${span}`)
}

/**
 * `text` (a page in `docDir`) with its code spans linked and every link given a target:  `Linker.link()`.
 * - a component set's page:  from its served address (`servedDir()`)
 */
export function linkText(text, docDir) {
  const { linker, dir } = linkerFor(docDir)
  return linker.link(text, linker.servedDir(dir))
}

/**
 * The `root-links` rewrite of the file at `path`, IN PLACE unless `dryRun`:  its relative links as root paths
 * (`RootLinks.rewrite()`);  prints a line if it changed, then each link it couldn't place.  Returns how many links.
 */
export function rootLinkify(path, { dryRun = false } = {}) {
  const { linker: owner, dir } = linkerFor(dirname(resolvePath(path)))
  const before = readFileSync(path, "utf8")
  const { text, changes } = RootLinks.rewrite(before, join(dir, basename(path)), owner)
  if (!changes.length) return 0
  if (!dryRun && text !== before) writeFileSync(path, text)
  console.log(`${basename(path)}:  ${changes.length} links ${dryRun ? "would be " : ""}root paths`)
  for (const change of changes.filter((each) => each.kind === "broken" || each.kind === "outside"))
    console.log(`    ${change.kind === "broken" ? "BROKEN" : "above the root"}:  ${change.from} -> ${change.to}`)
  return changes.length
}

////////////////
// ## Checking
////////////////

/** Check the page at `path`;  prints a summary line, then each problem.  Returns whether it passed. */
export function check(path) {
  const { destinations, problems } = checkText(readFileSync(path, "utf8"), dirname(resolvePath(path)), path)
  console.log(`${basename(path)}:  ${destinations} destinations, ${problems.length} problems`)
  for (const problem of problems) console.log(`    ${problem}`)
  return !problems.length
}

/**
 * The links of `text` (a page in `docDir`, or served from its address), outside `<pre>`:  `Linker.check()`;
 * then its short addresses and `<epic-link>`s (`EpicTargets.problemsIn()`):  a saga, page or id that isn't there,
 * an epic under a saga it doesn't name.
 * - `file`:  the page's own file, for links into the page itself (`<epic-link item="T3">`)
 */
export function checkText(text, docDir, file) {
  const { linker, dir } = linkerFor(docDir)
  // routes and a test's action links are served, not files:  `problemsIn()` checks the show route's pages
  const checked = linker.check(EpicTargets.withoutServedLinks(text), linker.servedDir(dir))
  const page = file && relative(targets.content, resolvePath(file))
  return { ...checked, problems: [...checked.problems, ...targets.problemsIn(text, page)] }
}

////////////////
// ## Command line
////////////////

if (import.meta.main) {
  const args = process.argv.slice(2)
  const at = args.indexOf("--root")
  const root = at >= 0 ? args[at + 1] : undefined
  if (root) {
    linker = new SRV.Linker(resolvePath(root), { served: servedUnder(CHECKOUT) })
    targets = new EpicTargets(resolvePath(root))
  }
  const files = args.filter((arg, i) => !arg.startsWith("--") && !(at >= 0 && i === at + 1))
  if (!files.length) {
    console.error(
      [
        "usage (from the epic folder, epic/):",
        "  yarn tsx tools/doc-links.js ../../guides/<folder>/<doc>.html ...      -- add links (idempotent)",
        "  yarn tsx tools/doc-links.js --check ../../guides/<folder>/<doc>.html -- verify, exit 1 on problems",
        "  ... --root <checkout>                                                 -- resolve links in another checkout"
      ].join("\n")
    )
    process.exit(1)
  }
  if (args.includes("--check")) process.exit(files.map(check).every(Boolean) ? 0 : 1)
  if (args.includes("--root-links")) {
    const dryRun = args.includes("--dry-run")
    const links = files.reduce((sum, file) => sum + rootLinkify(file, { dryRun }), 0)
    console.log(`root links:  ${links} in ${files.length} files${dryRun ? ", nothing written" : ""}`)
    process.exit(0)
  }
  for (const file of files) linkify(file)
}
