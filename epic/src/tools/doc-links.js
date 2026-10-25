/**
 * Link source references in `.html` docs:  one named target per destination, new tab.
 * - see `src/AGENTS.md`, "Links"
 *
 * Usage (from spell-epic's root):
 *   yarn tsx tools/doc-links.js <folder>/<doc>.html ...           -- add links (idempotent)
 *   yarn tsx tools/doc-links.js --check <folder>/<doc>.html ...   -- verify, exit 1 on problems
 *   ... --root <checkout> ...                                     -- links resolve in that checkout, not this one
 * - This file is the command line, on files, of `spell/server`'s `Linker` (epic `epic-components`, P7).
 *   - the rules live there:  what becomes a link, how a link gets its target, what `--check` verifies
 *   - shared with the `epic` tool (`src/tool/`)
 * - `--root`:  for a copy of the pages beside a copy of the code (a dry run of `relocate.js relink`, say)
 *   - version control's ignores are that checkout's, so it should be a git repo with the repo's `.gitignore`
 * - A page in the CONTENT folder links as served under the checkout that serves it (`contentLinker`, epic
 *   `epic-engine` I22):  this one, or spell-app's for spell-epic's own epics
 * - Runs under `tsx`:  `spell/server`'s files import each other without extensions, which plain `node` can't load.
 *   - the tools that run it (`update.js`, `pages.js` `tidy()`, goals' check) go through `pages.js` `docLinksRun()`
 * - A component set's pages link as from their SERVED address,
 *   so their links hold at `/worktrees/<w>/components/epics/` too.
 *   - e.g. `spell-epic/src/docs/`, served at `/components/epics/` (the checkout's `"pageServer"` `"componentSets"`,
 *     `ServedFolders`)
 *   - their links are written and checked from there (`Linker`'s `served`, `servedDir()`)
 * - `--check` also checks short addresses (`href="SAGA:/..."`) and `<epic-link>`s, which `Linker` leaves alone:
 *   the epics tool's `EpicTargets` knows the sagas (epic `epic-workflow` P15).
 * - NOTE:  ported from `doc-links.py` on 2026-10-03;  makes the same edits to every page.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, relative, resolve as resolvePath } from "node:path"
import { pathToFileURL } from "node:url"

import { SRV } from "spell/server"
import { RepoList } from "spell-epic/server/RepoList"
import { EpicTargets } from "spell-epic/tool/EpicTargets"
import { ServedFolders } from "spell-epic/tool/ServedFolders"

import { CONTENT, PACKAGE, ROOT } from "./pages.js"

/**
 * The folders served at another address under checkout `root` (`ServedFolders`):  the component sets'
 * (`{ "components/epics": "spell-epic/src/docs" }`), and the engine's templates, at `templates/`, so a guide's
 * `../templates/durable.html` checks against spell-epic's copy.  The `epic` tool's linker is told the same.
 */
function servedUnder(root) {
  return ServedFolders.under(root, PACKAGE)
}

/**
 * One linker for this checkout (or the command line's `--root`):  its bare-name index is built once per process.
 */
let linker = new SRV.Linker(ROOT, { served: servedUnder(ROOT) })

/**
 * The linker for pages in the CONTENT folder (epic `epic-engine` I22):  `linker`, unless the content is served under
 * another checkout (`RepoList.linkRootOf()`).
 * - spell-epic's own epics:  their pages are spell-app's content, served by spell-app's page server under spell-app's
 *   checkout, so their links are written and checked from there (`../../../spell-epic/src/...`), never as this
 *   checkout's (`../../../src/...`, nothing there when served)
 */
let contentLinker = linkerUnder(new RepoList().linkRootOf(ROOT))

/** A linker under checkout `root`:  `linker` when it's `linker`'s. */
function linkerUnder(root) {
  return resolvePath(root) === linker.root ? linker : new SRV.Linker(root, { served: servedUnder(root) })
}

/** The content folder, real:  a page in it takes `contentLinker`, whichever link it's reached through. */
const REAL_CONTENT = SRV.RealPath.of(CONTENT)

/**
 * The linker for a page in `docDir`, and that folder as it takes it:
 * a content page's (`contentLinker`), its folder real;  else `linker`, the folder as given.
 */
function linkerFor(docDir) {
  if (contentLinker === linker) return { linker, dir: docDir }
  const real = SRV.RealPath.of(resolvePath(docDir))
  if (real === REAL_CONTENT || real.startsWith(`${REAL_CONTENT}/`)) return { linker: contentLinker, dir: real }
  return { linker, dir: docDir }
}

/**
 * What short addresses and `<epic-link>`s find in this checkout, or the `--root` one (epic `epic-workflow` P15):
 * the sagas, pages, ids.
 */
let targets = new EpicTargets(ROOT)

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

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2)
  const at = args.indexOf("--root")
  const root = at >= 0 ? args[at + 1] : undefined
  if (root) {
    linker = new SRV.Linker(resolvePath(root), { served: servedUnder(ROOT) })
    contentLinker = linker
    targets = new EpicTargets(resolvePath(root))
  }
  const files = args.filter((arg, i) => !arg.startsWith("--") && !(at >= 0 && i === at + 1))
  if (!files.length) {
    console.error(
      [
        "usage (from spell-epic's root):",
        "  yarn tsx tools/doc-links.js ../../guides/<folder>/<doc>.html ...      -- add links (idempotent)",
        "  yarn tsx tools/doc-links.js --check ../../guides/<folder>/<doc>.html -- verify, exit 1 on problems",
        "  ... --root <checkout>                                                 -- resolve links in another checkout"
      ].join("\n")
    )
    process.exit(1)
  }
  if (args.includes("--check")) process.exit(files.map(check).every(Boolean) ? 0 : 1)
  for (const file of files) linkify(file)
}
