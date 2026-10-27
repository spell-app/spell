/**
 * Where the docs are, how scripts find, tidy and open pages -- shared by `update.js`, `index.js`, `open.js` and
 * the other docs tools (the `epic` tool, `spell/epic/tool`, has its own).
 */
import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { openInChromeTab } from "spell/server/open"
import { RealPath } from "spell/server/RealPath"
import { componentSetAddressOf, componentSetFileOf, pageServerRoot, settingsParts } from "spell/server/page/settings"
import { Window, envCheckout } from "spell/epic/window.mjs"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { ENGINE_ROUTES, EPIC_UI } from "spell/epic/server/server.types.ts"

import { ComponentSetFolders } from "./ComponentSetFolders.ts"
import { firstPackageDir, KIT_PACKAGES } from "./packageDir.ts"

/** `src/tools`:  the docs scripts, `_assets`, the goals tooling. */
export const TOOLS = dirname(fileURLToPath(import.meta.url))

/** spell-epic's root:  the package the docs tools are in (`package.json`, where `yarn` runs their scripts). */
export const PACKAGE = resolve(TOOLS, "..", "..")

/** `src/tools/_assets`:  what every page loads. */
export const ASSETS = join(TOOLS, "_assets")

/**
 * The checkout the docs tools work on:  the repo, or a worktree of it.  Page paths are relative to it.
 * - `EPIC_CHECKOUT` when set:  the `epic` command runs ONE copy of the tools (its own) on the caller's checkout,
 *   and says which (`EpicTools.run()`, epic `epic-eject` P5)
 *   - not one that names no folder:  a stale one, inherited (`envCheckout()`, epic `epic-engine` P9)
 * - else the checkout this file is in
 */
export const ROOT = envCheckout() ?? PACKAGE

/**
 * The repo's content folder (`.epic/config.json5` `contentFolder`:  `../spell-app.epics`), where every page is:  the
 * ONE place the tools read and write epics, guides, pages, sagas, brand and goals (epic `epic-eject` P12).
 * - never a link at the checkout's root:  a checkout may have none
 * - page paths are from here (`epics/seo/seo.plan.html`), as the page servers serve it at `/` (`pagePath()`)
 * - `ROOT` itself when there's no such folder:  a checkout holding its own pages (`EpicConfig.contentOf()`)
 * - before 2026-10-05 the areas were all `packages/docs/content/`, where old-path links stay for older checkouts
 *   (`relocate.js` `reorgShared()`)
 */
export const CONTENT = EpicConfig.contentOf(ROOT)

/** `epics/`:  epic pages, `epics/<name>/<name>.plan.html`, their inboxes and details pages. */
export const EPICS = join(CONTENT, "epics")

/**
 * `templates/`:  one starting point per kind of page -- the ENGINE's, spell-epic's own `templates/` (epic `epic-eject`
 * T11, Q8), whichever checkout the tools work on.
 * - served at `/templates/` by both page servers (an engine route:  `ENGINE_ROUTES.templates`), so a page's
 *   `../templates/index.html` (the top bar's Templates tab) works in every repo
 * - its pages' paths are `templates/...` all the same (`pagePath()`), as they are served
 * - a repo's own extra templates:  `REPO_TEMPLATES`, beside these
 */
export const TEMPLATES = join(PACKAGE, "templates")

/**
 * Epic UI's pages (`src/docs/`):  the ENGINE's own, as the templates are, wherever spell-epic is;  their page paths
 * are `components/epics/...`, as spell-app's page server serves them (`EPIC_UI`, `pagePath()`).
 */
export const EPIC_UI_DOCS = join(PACKAGE, EPIC_UI.dir)

/**
 * Every COMPONENT SET's pages, named by their address:  `components/app/...` for `packages/app/docs/...`
 * (`ComponentSetFolders`:  the sets the checkout's settings name, `componentSets()`);  Epic UI's the engine's
 * `EPIC_UI_DOCS`, the others the checkout's (`ROOT`).
 */
const SETS = new ComponentSetFolders({ root: ROOT, epicUi: EPIC_UI_DOCS })

/**
 * The repo's OWN templates, when it has any:  `repoTemplates` in its `.epic/config.json5`, a folder from the
 * checkout's root;  `undefined` when the key is left out (the default:  the engine's templates are all there are).
 * - listed on the Templates page beside the engine's, and found by name before them (`templateFile()`)
 */
export const REPO_TEMPLATES = repoTemplatesOf(ROOT)

/** `guides/`:  every other docs page, with its `.md`, `.json`, `experiments/` and `examples/` beside it. */
export const GUIDES = join(CONTENT, "guides")

/** `pages/`:  the home page (`HOME`) and the scratch details pages (`DETAILS`). */
export const PAGES = join(CONTENT, "pages")

/** `pages/index.html`:  the home page, a routing page:  a card per area (`index.js`, claude-design P5). */
export const HOME = join(PAGES, "index.html")

/** `pages/details/`:  scratch details pages (`epic ask create`, no `--epic`). */
export const DETAILS = join(PAGES, "details")

/**
 * `brand/`:  the brand pages (the pony ...) and the design system's push record.
 * - NOT in `AREAS`:  its pages come from Claude Design, not the docs' templates, so `docs update` doesn't check
 *   them;  `index.js` lists them on `brand/index.html`
 */
export const BRAND = join(CONTENT, "brand")

/**
 * `goals/`:  the goal sets, `goals/<set>/index.html`:  the first sagas, PARKED (epic `epic-workflow` P6).
 * - their tooling:  `tools/goals/`
 */
export const GOALS = join(CONTENT, "goals")

/**
 * `sagas/`:  the sagas (epic `epic-workflow` P15):  their list in Owen's order, `sagas/sagas.json5`, each saga's page
 * in its folder (`sagas/<id>/<id>.saga.html`), and the Sagas list page (`index.js` writes it from the list).
 * - NOT in `AREAS`:  the Sagas list page lists the sagas from `sagas.json5`, not from the pages found
 */
export const SAGAS = join(CONTENT, "sagas")

/** Every folder `findPages()` walks:  the home first, then the areas (the repo's own templates last, if any). */
export const AREAS = [PAGES, GUIDES, EPICS, TEMPLATES, ...(REPO_TEMPLATES ? [REPO_TEMPLATES] : [])]

/**
 * Each area's list page, `<area>/index.html`, written by `index.js` (claude-design P5).
 * - every epic, guide, template and brand page, and every saga
 * - the repo's own templates' too, when it has any (`REPO_TEMPLATES`)
 * - never listed themselves
 */
export const LIST_PAGES = [EPICS, GUIDES, TEMPLATES, BRAND, SAGAS, ...(REPO_TEMPLATES ? [REPO_TEMPLATES] : [])].map(
  (area) => join(area, "index.html")
)

/** The old content folder (a link in checkouts cut before 2026-10-05, into the old-path links):  never walked. */
export const OLD_CONTENT = join(PACKAGE, "content")

/**
 * The file a page argument means:  absolute, in the content folder when it names a page there through a link
 * (`inContent()`);  else the first that exists of
 * - its page path (`guides/solid/solid-2.html`, `epics/seo/seo.plan.html`:  `pageAt()`), or from the checkout's root
 *   (`packages/brand/...`)
 * - from each area (`solid/solid-2.html` is a guide, `index.html` the home)
 * - an old path (`packages/docs/content/solid/solid-2.html`, `content/...`) moved by the reorg
 * - from `cwd`
 * - none:  its page path's file
 * - a SERVED path, absolute but no file (`/components/ui/x.html`, `/worktrees/<w>/components/ui/x.html`,
 *   `/epics/...`):  the file it serves (`servedFile()`, epic `epic-engine` I136)
 */
export function pageFile(page, cwd = process.env.INIT_CWD ?? process.cwd()) {
  if (isAbsolute(page)) return inContent(existsSync(page) ? page : (servedFile(page) ?? page))
  const old = page.replace(/^(?:packages\/docs\/)?content\//, "")
  const candidates = [
    pageAt(page),
    resolve(ROOT, page),
    ...AREAS.map((area) => resolve(area, page)),
    ...(old !== page ? [pageAt([reorgEntry(old.split("/")[0]), ...old.split("/").slice(1)].join("/"))] : []),
    resolve(cwd, page)
  ]
  return inContent(candidates.find((each) => existsSync(each)) ?? pageAt(page))
}

/**
 * Page (or folder) `file`'s PAGE PATH, as the page servers serve it, at `/`:
 * - in the content folder:  from it (`<CONTENT>/guides/x.html` => `guides/x.html`), named there or through any
 *   checkout's link into it (`<checkout>/guides/x.html`)
 * - the engine's templates:  `templates/...`, wherever spell-epic is
 *   (`TEMPLATES`:  `<spell-epic>/templates/durable.html` => `templates/durable.html`)
 * - a component set's pages:  as served, `components/<set>/...` (`SETS`), never from their folder
 *   - Epic UI's:  `<spell-epic>/src/docs/epic-item.html` => `components/epics/epic-item.html` (`EPIC_UI_DOCS`)
 *   - App UI's, Brand's, Spell UI's:  `<checkout>/packages/app/docs/Chooser.html` => `components/app/Chooser.html`
 * - a COMMAND RUN's folder, or a file in it (`<CONTENT>/pages/runs/<id>/run.json5`):  its page, `runs/<id>/`
 *   (`runPagePath()`), which spell-epic's route module serves (`runRoutes.ts`):  the folder holds no page itself
 * - anything else:  from the checkout's root (`packages/brand/x.html`), which the page server serves at `/` too;
 *   a file outside it keeps its `../` path
 * - `/`-separated
 * - the paths the lists, the checks and the openers use (`index.js`, `update.js`, `serverUrl()`);  `pageAt()` turns
 *   one back into its file
 */
export function pagePath(file) {
  const path = resolve(file)
  const run = runPagePath(path)
  if (run) return run
  const inTemplates = insideOf(TEMPLATES, path) ?? insideOf(TEMPLATES, RealPath.of(path))
  if (inTemplates !== undefined) return ["templates", ...(inTemplates ? inTemplates.split(sep) : [])].join("/")
  const inSet = SETS.pageFor(path) ?? SETS.pageFor(RealPath.of(path), RealPath.of)
  if (inSet !== undefined) return inSet
  const content = insideContent(path)
  return (content ?? relative(ROOT, path)).split(sep).join("/")
}

/**
 * The page path of the COMMAND RUN whose folder `path` is, or is inside:  `runs/<id>/` (epic `epic-engine` P23);
 * `undefined` for anything else.
 * - a run's folder:  `<CONTENT>/pages/runs/<id>/` (the kit's `CommandRun`), served at `/runs/<id>/` by
 *   spell-epic's route module (`runRoutes.ts`), from its template:  so `epic pages open <run folder>`, which the kit's
 *   `CommandRun.show()` runs, opens the page
 */
export function runPagePath(path) {
  const inside = insideContent(resolve(path))
  const id = inside && RUN_FOLDER.exec(inside.split(sep).join("/"))?.[1]
  return id ? `runs/${id}/` : undefined
}

/** A run's folder, or a file in it, from the content folder:  `pages/runs/<id>[/...]`. */
const RUN_FOLDER = /^pages\/runs\/([a-z0-9-]+)(?:\/|$)/

/** Absolute `path` from folder `dir` (`""` for the folder itself);  `undefined` outside it. */
function insideOf(dir, path) {
  const inside = relative(dir, path)
  return inside.startsWith("..") || isAbsolute(inside) ? undefined : inside
}

/**
 * Absolute `path` from the content folder, named there or through a link into it (any checkout's);  `undefined`
 * outside it.
 */
function insideContent(path) {
  return RealPath.from(CONTENT, path)
}

/**
 * The file page path `path` names (`pagePath()` turned round):
 * - `templates/...`:  in the engine's `TEMPLATES`
 * - `components/<set>/...`:  in that component set's folder (`SETS`):  Epic UI's `EPIC_UI_DOCS`, the others the
 *   checkout's
 * - in the content folder, when it's there or its top folder is one of the content folder's (`epics/new/...`)
 * - anything else from the checkout's root (`packages/brand/...`)
 */
export function pageAt(path) {
  const [top, ...rest] = path.split(/[\\/]/)
  if (top === "templates") return join(TEMPLATES, ...rest)
  const inSet = SETS.fileFor(path)
  if (inSet) return inSet
  const content = resolve(CONTENT, path)
  return existsSync(content) || contentTop(top) ? content : resolve(ROOT, path)
}

/**
 * The file a page server's URL path `path` serves, for a page named by its address (`epic pages link
 * /components/ui/x.html`);  `undefined` when it names no file there.
 * - `/worktrees/<w>/...`:  in worktree `<w>` (any folder worktrees are in, `EpicConfig.worktreesFolders`):
 *   a component set's address in that worktree's set (`componentSetFileOf()`), else its file there, else the content
 *   folder's (shared, the same for every checkout)
 * - anything else:  its page path's file (`pageAt()`):  `/components/<set>/...`, `/epics/...`, `/templates/...`
 * - the file must be there
 */
export function servedFile(path) {
  const [, worktree, rest] = /^\/worktrees\/([^/]+)(\/.*)?$/.exec(path) ?? []
  const there = (file) => (file && existsSync(file) ? file : undefined)
  if (!worktree) return there(pageAt(decodeURIComponent(path.slice(1))))
  const inside = decodeURIComponent((rest ?? "/").slice(1))
  for (const folder of EpicConfig.of(ROOT).worktreesFolders) {
    const root = join(folder, decodeURIComponent(worktree))
    if (!existsSync(root)) continue
    return there(componentSetFileOf(root, rest ?? "/")) ?? there(join(root, inside)) ?? there(join(CONTENT, inside))
  }
  return undefined
}

/**
 * Whether `top`, a page path's first folder, is the content folder's (`epics`, `guides` ...):  there, and not a
 * folder of the checkout's own (`packages`, which the content folder has too, for its old-path links).
 */
function contentTop(top) {
  if (!top || !existsSync(join(CONTENT, top))) return false
  return !lstatSync(join(ROOT, top), { throwIfNoEntry: false })?.isDirectory()
}

/**
 * Template `name`'s file:  `durable`, `durable.html`, `goals/index.html`, `epics/plan-doc.md`, or a path from the root
 * (`templates/durable.html`);  `undefined` when there's none.
 * - the repo's own templates first (`REPO_TEMPLATES`), then the engine's (`TEMPLATES`):  a repo may make its own
 *   version of one
 * - a bare name is an `.html` page
 * - `epic pages template <name>` prints it, for the skills;  `epic pages create` copies it
 */
export function templateFile(name) {
  const path = name.replace(/^templates\//, "")
  const file = /\.\w+$/.test(path) ? path : `${path}.html`
  return [REPO_TEMPLATES, TEMPLATES]
    .filter(Boolean)
    .map((dir) => join(dir, file))
    .find((each) => existsSync(each))
}

/**
 * `file` in the content folder, when it names a page there through a link (a checkout that still has its
 * `epics` link ...:  `<checkout>/epics/seo/seo.plan.html` -> `<CONTENT>/epics/seo/seo.plan.html`);  else `file` as
 * is.
 * - Why:  the tools name each page ONE way, by its content folder path, whichever path it was handed by
 *   (epic `epic-eject` P12;  before, the other way round, through this checkout's link:  I1)
 */
export function inContent(file) {
  const inside = insideContent(resolve(file))
  return inside === undefined ? file : join(CONTENT, inside)
}

/**
 * A comment or note on a docs page named as one word, `guides/x.html#C3`, as one on an epic page is (`seo#C3`):
 * `[page, id, ...rest]`, the page and the id as the tools take them (epic `epic-workflow` P19).
 * - the two words, `guides/x.html C3`, read the same:  passed through as they are
 * @param {string[]} words  the verb's words after the verb:  `["guides/x.html#C3", "on"]`
 * @returns {string[]}
 */
export function pageAndId([page, ...rest]) {
  const hash = page?.lastIndexOf("#") ?? -1
  if (hash <= 0) return page === undefined ? rest : [page, ...rest]
  return [page.slice(0, hash), page.slice(hash + 1), ...rest]
}

/**
 * The repo's own templates folder, from checkout `root`:  its `.epic/config.json5`'s `repoTemplates`, from the
 * checkout's root;  `undefined` for none (the key left out, or the config won't read).
 */
function repoTemplatesOf(root) {
  try {
    const folder = EpicConfig.of(root).repoTemplates
    return folder ? resolve(root, folder) : undefined
  } catch {
    return undefined
  }
}

/** Where top-level entry `name` of the old content folder went (`relocate.js` `reorgEntry()`, kept in step). */
function reorgEntry(name) {
  return (
    { epics: "epics", templates: "templates", details: "pages/details", "index.html": "pages/index.html" }[name] ??
    `guides/${name}`
  )
}

/**
 * Folders that hold no pages.
 * - `examples`:  fragments a page includes (`ui-import/examples/part.html`), not pages:  no sections, no contents
 * - `details`:  details pages (`epic ask`), questions for one session
 *   - not in the index, not checked with the docs
 *   - scratch `details/`, and an epic's `epics/<name>/details/`
 *   - NOT the `details` epic's own folder, `epics/details/` (`findPages()`)
 * - `parts`:  a split epic page's bodies (`epics/<name>/parts/<id>.html`, `PlanParts`), fragments its page loads
 *   - told from pages by this folder alone, since they're `.html` (Q12 of `epic-components`;  `.htm` before)
 */
const SKIP_DIRS = new Set(["node_modules", "experiments", "examples", "details", "parts"])

/**
 * Epic `name`'s epic page in folder `dir` (`epics/<name>/`):  `<name>.plan.html`, else `<name>.html`.
 * - `<name>.html` only when that is an epic page:  `<body class="... plan-doc">`, or an `<epic-page>`
 * - `undefined` when there's neither
 * - why both names:  epic pages were renamed `<name>.plan.html` on 2026-10-04 (`review-review` P4), and a worktree
 *   cut before then still has `<name>.html` until it merges `main`
 * - `src/tool/PlanDocFiles.ts` `planDocIn()` is the same:  change both
 */
export function planDocIn(dir, name) {
  const file = join(dir, `${name}.plan.html`)
  if (existsSync(file)) return file
  const old = join(dir, `${name}.html`)
  if (!existsSync(old)) return undefined
  const html = readFileSync(old, "utf8")
  return /<body\b[^>]*\bclass="[^"]*\bplan-doc\b/.test(html) || /<epic-page\b/.test(html) ? old : undefined
}

/**
 * Every `.html` page under `dir`, sorted, skipping tooling folders.
 * - `dir`:  a folder, or several;  default:  every area, `AREAS`
 * - follows a link to a folder (each area is one, into the shared content repo):  the page keeps the link's path
 * - a missing folder has no pages
 */
export function findPages(dir = AREAS) {
  if (Array.isArray(dir)) return dir.flatMap((each) => findPages(each))
  if (!existsSync(dir)) return []
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name)
    if (entry.isDirectory() || (entry.isSymbolicLink() && statSync(path, { throwIfNoEntry: false })?.isDirectory())) {
      // the `details` EPIC's folder (`epics/details/`) holds an epic page:  only details PAGES' folders are skipped
      const epic = entry.name === "details" && basename(dir) === "epics"
      if (!SKIP_DIRS.has(entry.name) || epic) found.push(...findPages(path))
    } else if (entry.name.endsWith(".html")) found.push(path)
  }
  return found
}

/**
 * The file holding the epic page at `file`'s log:  its part, `parts/log.html`, when the doc is split
 * (`PlanParts`), else the doc itself.  For the browser checks, which add a log line and take it out again by hand.
 * - the log's host says `source="parts/log.html"` (`<epic-section kind="log">`)
 */
export function planLogFile(file) {
  const source = /\bsource="(parts\/log\.html)"/.exec(readFileSync(file, "utf8"))?.[1]
  const part = source && join(dirname(file), source)
  return part && existsSync(part) ? part : file
}

/**
 * Tidy `files` (absolute, or page paths:  `pageAt()`) the way a page must be committed:  link targets, then oxfmt
 * (`vp fmt`).
 * - `doc-links.js` first:  it may add attributes oxfmt then wraps
 * - `format`:  the files oxfmt formats (default:  all of them);  the rest get their link targets only
 * - returns whether both succeeded;  their output is echoed
 * - run from `PACKAGE`, never the content folder:  a process started there is in the shared repo, outside this yarn
 *   workspace
 * - every path goes ABSOLUTE:  from `PACKAGE` a page is `../spell-app.epics/guides/...`, and oxfmt refuses `..`
 */
export function tidy(files, { format = files } = {}) {
  const at = (file) => (isAbsolute(file) ? file : pageAt(file))
  const paths = files.map(at)
  const formatted = format.map(at)
  const runs = [
    docLinksRun(paths),
    ...(formatted.length ? [{ command: "yarn", args: ["vp", "fmt", ...formatted] }] : [])
  ]
  for (const { command, args, env } of runs) {
    const run = spawnSync(command, args, { cwd: PACKAGE, encoding: "utf8", env })
    if (run.status !== 0) {
      process.stderr.write(`${run.stdout ?? ""}${run.stderr ?? ""}`)
      return false
    }
  }
  return true
}

/**
 * Which of `files` (absolute, or relative to the checkout's root) oxfmt would leave as they are:  formatted already,
 * as their absolute paths.  One `vp fmt --list-different` run.
 * - for a tool rewriting a page it didn't write (`migrate.js`):  it formats after only a page that was formatted
 *   before, so one that wasn't keeps its text's spacing (oxfmt folds `Bedtime:  epic-workflow` in an h1 to one space:
 *   epic `epic-engine` I7), as `notesOnDisk.ts`' `editNotes()` does
 * - a file oxfmt ignores counts as formatted:  `vp fmt` leaves it alone anyway
 */
export function formattedAlready(files) {
  const paths = files.map((file) => (isAbsolute(file) ? file : pageAt(file)))
  if (!paths.length) return []
  const run = spawnSync("yarn", ["vp", "fmt", "--list-different", ...paths], { cwd: PACKAGE, encoding: "utf8" })
  const different = new Set(
    (run.stdout ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => RealPath.of(resolve(PACKAGE, line)))
  )
  return paths.filter((path) => !different.has(RealPath.of(path)))
}

/**
 * How to run `doc-links.js` with `args` as a child `node`, for `spawnSync(command, args, { env })`.
 * - under `tsx`, with this package's `tsconfig.json`, from whatever folder it runs in:  every repo's files by their
 *   package names (`spell/server`, epic `repo-split` P14)
 * - the one way the tools run it (`tidy()`, `update.js`, goals' check, its own test)
 */
export function docLinksRun(args) {
  return {
    command: process.execPath,
    args: ["--import", "tsx", join(TOOLS, "doc-links.js"), ...args],
    env: { ...process.env, TSX_TSCONFIG_PATH: join(PACKAGE, "tsconfig.json") }
  }
}

/**
 * Opens a doc in VS Code's doc preview, through spell-epic's extension's URI handler.
 * - `vscode/src/DocPreview.ts`, its id `spell-app.spell-epic` (epic `epic-eject` P7)
 */
const VSCODE_PREVIEW = "vscode://spell-app.spell-epic/doc-preview"

/** The kit's page server command line (`spell/server`'s), from the kit's root:  `ensurePageServer()` runs it. */
const PAGE_SERVER_CLI = "src/server/page/cli.ts"

/**
 * This checkout's page server (`spell server`), started in the background if it isn't running.
 * - returns `{ base, port }`, or `undefined` if it can't start (the caller falls back to `file://`)
 * - runs the kit's page server command line (`PAGE_SERVER_CLI`) `start` under `tsx`, with the kit's node settings:  the
 *   kit this checkout's install resolves, by either name (`firstPackageDir()`, epic `epic-engine` P10, `repo-split` P17)
 *   - for the page server's root (`pageServerRoot()`):  in a kit, the kit, from any folder of it (epic `repo-split` P16)
 * - a checkout whose page server settings have no part (`settingsParts()`:  no `"pageServer"` in any installed repo's
 *   `package.json`, as in a repo `epic init` set up), or that resolves no server package:  the machine's epic server
 *   instead (`ensureEpicServer()`)
 * - ~1s when it has to start, ~0.3s when it runs
 * - `SPELL_NO_SERVER=1`:  never starts it
 */
export function ensurePageServer() {
  if (process.env.SPELL_NO_SERVER) return undefined
  const kit = settingsParts(ROOT).length > 0 && firstPackageDir(KIT_PACKAGES, ROOT)
  const cli = kit && join(kit, PAGE_SERVER_CLI)
  if (!cli || !existsSync(cli)) return ensureEpicServer()
  const run = spawnSync(process.execPath, ["--import", "tsx", cli, "start", "--root", pageServerRoot(ROOT)], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, TSX_TSCONFIG_PATH: join(kit, "tsconfig.node.json") }
  })
  if (run.status !== 0) {
    console.error(`page server didn't start (${(run.stderr ?? String(run.error)).trim().split("\n").at(-1)})`)
    return undefined
  }
  try {
    return JSON.parse(run.stdout)
  } catch {
    return undefined
  }
}

/**
 * The machine's epic server (`epic hub`, spell-epic's `bin/epic`), started in the background if it isn't running,
 * as this checkout's page server:  `{ base, port }`, `base` the URL this repo's content is served at
 * (`http://127.0.0.1:4848/r/<repo>`, or the server's root for the default repo), so `serverUrl()` works unchanged:
 * it serves the content folder, and page paths are from it.
 * - `undefined` (and why, on stderr) when the repo isn't registered (`epic repo add`) or the server won't start
 */
function ensureEpicServer() {
  const run = spawnSync(process.execPath, [EPIC_BIN, "hub", "url", PAGES], { encoding: "utf8" })
  const url = run.status === 0 ? run.stdout.trim() : ""
  if (!url.endsWith("/pages")) {
    console.error(`epic server not used (${(run.stderr || String(run.error ?? "")).trim().split("\n").at(-1)})`)
    return undefined
  }
  const base = url.slice(0, -"/pages".length)
  return { base, port: Number(new URL(base).port) }
}

/** spell-epic's `epic` command:  `bin/epic` at its root. */
const EPIC_BIN = join(PACKAGE, "bin", "epic")

/**
 * A template's `html` as a new page holds it, wherever the page goes:  its links are ROOT PATHS already (epic
 * `epic-engine` P46), so nothing is rebased by depth;  only an older template's spellings are brought up to date.
 * - the engine's assets:  its route, `/_epic/assets/` (the epic server's, epic `epic-eject` P7;  `ENGINE_ROUTES`)
 *   - from wherever the template had them:
 *     - `tools/_assets/`, `packages/epics/tools/_assets/`
 *     - the docs package's old `packages/docs/tools/_assets/` (before epic `people-and-orgs` P16)
 * - the home page:  `/pages/index.html`;  the areas' list pages:  `/epics/index.html` ...
 * - the site header's `root`:  dropped (pages are served, never opened from disk:  P46, Q5)
 * - the epics pack's script (`<ui-components source>`, on epic, details and choice pages):  its route, `/_epic/pack/`
 *   - another pack's:  `/packages/<name>/components/__pack/` (a repo's own, at its engine route)
 *   - from its old folder, `packages/<name>/pack/`, too
 * - drops the template's `TEMPLATE:` how-to comment
 * - `docs:new`, `details create`, `choices create`, the docs index's list pages, and the plan-doc tool's `epic create`
 *   (`PlanDocCommands`);  `atDepth()` before P46, which wrote `../` for the page's depth
 */
export function fromTemplate(html) {
  const up = "/"
  return (
    html
      // a component pack's script (`<ui-components source>`:  the epics pack, on epic, details and choice pages)
      // the epics pack:  the engine's route;  another pack:  the repo's own, at this depth
      .replace(
        /(\bsource=")(?:\.\.\/)*\/?packages\/epics\/(?:components\/__)?pack\//g,
        `$1${ENGINE_ROUTES.pack.prefix}`
      )
      .replace(
        /(\bsource=")(?:\.\.\/)*packages\/([\w-]+)\/(?:components\/__)?pack\//g,
        `$1${up}packages/$2/components/__pack/`
      )
      .replace(
        /((?:href|src)=")(?:\.\.\/)*\/?(?:packages\/(?:docs|epics)\/)?(?:tools\/)?_assets\//g,
        `$1${ENGINE_ROUTES.assets.prefix}`
      )
      .replace(/((?:href|src)=")(?:\.\.\/)*(?:pages\/)?index\.html/g, `$1${up}pages/index.html`)
      .replace(/((?:href|src)=")(?:\.\.\/)*(epics|guides|templates|brand)\/index\.html/g, `$1${up}$2/index.html`)
      .replace(/(<spell-site-header\b[^>]*?)\s+root="[^"]*"/, "$1")
      .replace(/\n\s*<!--\s*TEMPLATE:[\s\S]*?-->/, "")
  )
}

/**
 * URL of `file` on the page server at `base`, e.g. `http://127.0.0.1:4747/pages/index.html`:  its page path
 * (`pagePath()`), whichever path it's named by (the content folder's, or through any checkout's link into it).
 */
export function serverUrl(base, file) {
  return `${base}/${pagePath(file).split("/").map(encodeURIComponent).join("/")}`
}

/**
 * Where a browser opens page `file`, for the tools that load pages headlessly (`check-spell.js`, `designer-shots.js`):
 * ALWAYS the page server, as Owen reads it (epic `epic-engine` P46, Q5:  a page's links are root paths, which only
 * mean something served;  `file://` before, unless the page needed a server)
 * - a component set's page at its address (`/components/epics/x.html`:  it loads its site bundle from there)
 * - `base`:  ANY page from that server, as it's shown there (`http://127.0.0.1:4848`)
 * - else this checkout's page server, started if it's down (`ensurePageServer()`)
 * - throws if none started, or the page is outside the content folder (no server has it)
 */
export function browserUrlFor(file, { base } = {}) {
  const inSet = componentSetAddress(file)
  const served = base ? { base: base.replace(/\/$/, "") } : ensurePageServer()
  if (!inSet && pagePath(file).startsWith("../"))
    throw new Error(`${file} is outside the content folder, ${CONTENT}, so no server has it`)
  if (!served) throw new Error(`${file} needs the page server, and it didn't start`)
  return inSet ? `${served.base}${inSet}` : serverUrl(served.base, file)
}

/** A component set's page `file` at its address (`/components/epics/x.html`);  `undefined` for any other page. */
export function componentSetAddress(file) {
  return componentSetAddressOf(ROOT, file)?.replace(/\/index\.html$/, "/")
}

/**
 * Show `file` rendered in VS Code's doc preview.
 * - for `epic open <name>`, `epic phase`, `/spell-docs`
 * - starts this checkout's page server first (`ensurePageServer()`), so the page live-reloads
 * - the spell extension (`spell app vscode`) finds the server by its pid file,
 *   and shows the page in a tab of the right side bar (or Simple Browser, `spell.docPreview.location`)
 *   - the page already in that tab isn't reloaded:  it updates itself
 * - first asks THIS session's window, through the extension's window bridge (the repo root's `src/window.mjs`);
 *   a `vscode://` URI goes to whichever window is focused
 * - NOT run from VS Code (`Window.inVSCode`:  a CLI session in another terminal):
 *   `openInChrome()` instead, `hash` kept and `view` dropped
 * - `hash`:  an id on the page to land on, e.g. a goal `g1`
 * - `query`:  the page's query, without its `?`:  `test=1` (a test run, `epic test`)
 *   - an extension from before it ignores it:  the page shows as usual
 * - `view`:  which side bar tab;  each keeps its own page
 *   - `"docs"`:  "Epic Docs", the default
 *   - `"review"`:  "Review" (`/epic review`, `epic pages open <page> --review`)
 * - the session is moving to a worktree's window (`/isolate`, `/epic`:  a pending handoff):
 *   shown THERE once it has moved, not in the window it's leaving
 * - no bridge (extension not reloaded, or not run from a VS Code window), or it failed:  the `vscode://` URI
 * - a command run's folder (`runPagePath()`):  straight to the `vscode://` URI, with its page's URL:  the bridge shows
   only a file, and a run's page is no file
 * - `open` can't fail (macOS):  without the extension, VS Code says it can't handle the URI
 * - `open` itself failed (not macOS):  falls back to Chrome
 * - async for the bridge's http request;  never rejects
 */
export async function openInVSCode(file, { hash, query, view = "docs" } = {}) {
  if (!Window.inVSCode) return openInChrome(file, { hash, query })
  const path = resolve(inContent(file))
  const served = ensurePageServer()
  const review = view === "review"
  // a command run's page is served from a template, not from a file the window bridge could show:  its URL
  const isRun = !!runPagePath(path)
  if (!isRun) {
    try {
      const { window, later } = await Window.show(path, { hash, query, view: review ? "review" : undefined })
      if (later) return console.log(`${path} shows in ${later} once this session moves there`)
      return console.log(`opened ${path} in VS Code (window ${window.pid})`)
    } catch (error) {
      if (!/^no window/.test(error.message)) console.error(`${error.message}:  falling back to the vscode:// URI`)
    }
  }
  const url = served && `${serverUrl(served.base, path)}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`
  const params = new URLSearchParams({ ...(url && { url }), file: path, ...(review && { view: "review" }) })
  const run = spawnSync("open", [`${VSCODE_PREVIEW}?${params}`], { encoding: "utf8" })
  if (run.status === 0) return console.log(`opened ${path} in VS Code`)
  console.error(`VS Code via \`open\` failed (${(run.stderr ?? String(run.error)).trim()}):  falling back to Chrome`)
  openInChrome(file)
}

/**
 * Show `file` in Chrome, in ONE tab per page, IN THE BACKGROUND:  `epic pages open <page>`;  `openInVSCode()`'s fallback.
 * - from this checkout's page server (live reload), started if need be;  `file://` if it can't start
 * - The tab is keyed by the page's path (`/epics/<name>/<name>.plan.html`:  `pagePath()`), not its full URL.
 *   - so the same page from another checkout (a worktree) reuses it:  re-pointed if the URL differs, else reloaded
 *   - the page names its tab the same way (`spell-doc-runtime.js` `window.name`;  links use that `target`)
 * - `hash`:  an id on the page to land on (`epic pages open SAGA:/saga/epic#T1`);  `query`:  the page's query
 * - Never brings Chrome or its window forward:  the tab is made active in ITS window only.
 *   - a new tab goes in the front window
 *   - `openUrlInChrome()` with `front` does bring it forward, for a link Owen clicked
 * - Chrome not running, or AppleScript refused:  `open -g -a "Google Chrome"`, which can't reuse a tab.
 *   Chrome may still raise itself for a URL it's handed (seen 2026-10-01).
 * - NOTE: `key` is an AppleScript keyword:  the variable is `pageKey`.
 */
export function openInChrome(page, { hash, query } = {}) {
  const file = inContent(page)
  const served = ensurePageServer()
  const url = served ? serverUrl(served.base, file) : pathToFileURL(resolve(file)).href
  openUrlInChrome(`${url}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`, `/${pagePath(file)}`)
}

/**
 * Show `url` in Chrome, reusing the tab whose URL contains `key` (see `openInChrome()`), and say how.
 * - `front`:  bring Chrome and that tab's window forward -- a link Owen clicked (`showRoutes.ts`)
 * - else in the background
 * - the kit's `openInChromeTab()` opens it
 */
export function openUrlInChrome(url, key, { front = false } = {}) {
  const how = openInChromeTab(url, key, { front })
  const where = front ? "in front" : "in the background"
  if (how === "none") console.log(`not opened ${url}:  SPELL_NO_BROWSER is set`)
  else if (how === "launched") console.log(`opened ${url} (Chrome launched ${where})`)
  else console.log(`opened ${url} (${how}, ${where})`)
}

/**
 * A parsed (linkedom) document as page HTML, ready to write.
 * - `<!doctype html>` lowercase, and boolean attributes bare (`styled`, not `styled=""`), as written by hand and by
 *   oxfmt.  Repeated until stable:  one pass fixes one attribute per tag, and `ui-table` has four.
 */
export function serialize(document) {
  return serializeHTML(document.toString().replace(/^<!DOCTYPE html>/i, "<!doctype html>"))
}

/**
 * Serialized `html` (a document's, or a fragment's `innerHTML`) with boolean attributes bare (`styled`, not
 * `styled=""`), as `serialize()` writes a page;  an epic page's part files too (`PlanParts`).
 */
export function serializeHTML(html) {
  for (let before; before !== html;) {
    before = html
    html = html.replace(/(<[a-z][\w-]*\b[^<>]*?) ([a-z][\w-]*)=""(?=[\s/>])/g, "$1 $2")
  }
  return html
}

/**
 * A tool's command line:  `--key value` flags (a bare `--show` is `true`), and everything else in order.
 * - `parseArgs(["open", "x.html", "--hash", "p2", "--show"])` -> `{ positional: ["open", "x.html"], flags: { hash:
 *   "p2", show: true } }`
 * @returns {{ positional: string[], flags: Record<string, string | true> }}
 */
export function parseArgs(argv) {
  const positional = []
  /** @type {Record<string, string | true>} */
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) positional.push(argv[i])
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) flags[argv[i].slice(2)] = argv[++i]
    else flags[argv[i].slice(2)] = true
  }
  return { positional, flags }
}
