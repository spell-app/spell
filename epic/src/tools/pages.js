/**
 * Where the docs are, how scripts find, tidy and open pages -- shared by `update.js`, `index.js`, `open.js` and
 * the other docs tools (the `epic` tool, `$/epics/tool`, has its own).
 */
import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { Window, envCheckout } from "../window.mjs"
import { EpicConfig } from "../config/EpicConfig.ts"
import { ENGINE_ROUTES, EPIC_UI } from "../server/server.types.ts"

import { ComponentSetFolders } from "./ComponentSetFolders.ts"
import { packageDir, resolvedFile } from "./packageDir.ts"

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

/** `pages/details/`:  scratch details pages (`epic ask new`, no `--epic`). */
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
 */
export function pageFile(page, cwd = process.env.INIT_CWD ?? process.cwd()) {
  if (isAbsolute(page)) return inContent(page)
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
 * - anything else:  from the checkout's root (`packages/brand/x.html`), which the page server serves at `/` too;
 *   a file outside it keeps its `../` path
 * - `/`-separated
 * - the paths the lists, the checks and the openers use (`index.js`, `update.js`, `serverUrl()`);  `pageAt()` turns
 *   one back into its file
 */
export function pagePath(file) {
  const path = resolve(file)
  const inTemplates = insideOf(TEMPLATES, path) ?? insideOf(TEMPLATES, realOf(path))
  if (inTemplates !== undefined) return ["templates", ...(inTemplates ? inTemplates.split(sep) : [])].join("/")
  const inSet = SETS.pageFor(path) ?? SETS.pageFor(realOf(path), realOf)
  if (inSet !== undefined) return inSet
  const content = insideContent(path)
  return (content ?? relative(ROOT, path)).split(sep).join("/")
}

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
  return insideOf(CONTENT, path) ?? insideOf(realOf(CONTENT), realOf(path))
}

/**
 * `path` with its links followed (a checkout's `spell-epic` link, an old checkout's `epics` link ...):  its nearest
 * folder that exists, real, then the rest as it is;  so a page not made yet is followed too.
 */
function realOf(path) {
  try {
    return realpathSync(path)
  } catch {
    const parent = dirname(path)
    return parent === path ? path : join(realOf(parent), basename(path))
  }
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
 * - `epic pages template <name>` prints it, for the skills;  `epic pages new` copies it
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
 * A comment or note on a docs page named as one word, `guides/x.html#M3`, as one on an epic page is (`seo#M3`):
 * `[page, id, ...rest]`, the page and the id as the tools take them (epic `epic-workflow` P19).
 * - the two words, `guides/x.html M3`, read the same:  passed through as they are
 * @param {string[]} words  the verb's words after the verb:  `["guides/x.html#M3", "on"]`
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
  const real = (path) => (existsSync(path) ? realpathSync(path) : path)
  const different = new Set(
    (run.stdout ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => real(resolve(PACKAGE, line)))
  )
  return paths.filter((path) => !different.has(real(path)))
}

/**
 * How to run `doc-links.js` with `args` as a child `node`, for `spawnSync(command, args, { env })`.
 * - under `tsx`, with this package's `tsconfig.json`, from whatever folder it runs in;  and the run-time alias hook
 *   (`ALIASES`), for the `$/` imports inside the packages it uses (`spell-kit/assembler`'s own)
 * - the one way the tools run it (`tidy()`, `update.js`, goals' check, its own test)
 */
export function docLinksRun(args) {
  return {
    command: process.execPath,
    args: ["--import", "tsx", "--import", ALIASES, join(TOOLS, "doc-links.js"), ...args],
    env: { ...process.env, TSX_TSCONFIG_PATH: join(PACKAGE, "tsconfig.json") }
  }
}

/**
 * The run-time alias hook (`spell-kit/toolchain/aliases`, epic `repo-split` I12), for a child `node` under `tsx`:
 * every `$/` import resolves through the importing file's own repo's table, so other repos' source runs here.
 */
export const ALIASES = pathToFileURL(resolvedFile("spell-kit/toolchain/aliases") ?? "spell-kit/toolchain/aliases").href

/** Does checkout `root` run a page server of its own:  `"pageServer"` in its root `package.json` (spell-app's)? */
function hasPageServer(root) {
  try {
    return JSON.parse(readFileSync(join(root, "package.json"), "utf8")).pageServer !== undefined
  } catch {
    return false
  }
}

/**
 * Opens a doc in VS Code's doc preview, through spell-epic's extension's URI handler.
 * - `vscode/src/DocPreview.ts`, its id `spell-app.spell-epic` (epic `epic-eject` P7)
 */
const VSCODE_PREVIEW = "vscode://spell-app.spell-epic/doc-preview"

/**
 * This checkout's page server (`spell server`), started in the background if it isn't running.
 * - returns `{ base, port }`, or `undefined` if it can't start (the caller falls back to `file://`)
 * - runs the server package's `src/page/cli.ts start` under `tsx` with the run-time alias hook (`ALIASES`):  the
 *   `spell-kit/server` this checkout's install resolves (the kit's, `packageDir()`, epic `epic-engine` P10)
 * - a checkout whose settings name no page server (no `"pageServer"` in its `package.json`:  a repo `epic init` set
 *   up, spell-epic itself), or that resolves no server package:  the machine's epic server instead
 *   (`ensureEpicServer()`)
 * - ~1s when it has to start, ~0.3s when it runs
 * - `SPELL_NO_SERVER=1`:  never starts it
 */
export function ensurePageServer() {
  if (process.env.SPELL_NO_SERVER) return undefined
  const server = hasPageServer(ROOT) && packageDir("spell-kit/server", ROOT)
  const cli = server && join(server, "src/page/cli.ts")
  if (!cli || !existsSync(cli)) return ensureEpicServer()
  const run = spawnSync(process.execPath, ["--import", "tsx", "--import", ALIASES, cli, "start", "--root", ROOT], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, TSX_TSCONFIG_PATH: join(server, "tsconfig.json") }
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
 * A template's `html` fixed for a page `depth` folders below the checkout's root (`guides/glossary.html` is 1,
 * `epics/a/a.plan.html` 2).
 * - rewrites whatever depth the template assumed, `<up>` being the path up to the root:
 *   - the engine's assets:  its route, `/_epic/assets/` (the epic server's, epic `epic-eject` P7;  `ENGINE_ROUTES`)
 *     - from wherever the template had them:
 *       - `tools/_assets/`, `packages/epics/tools/_assets/`
 *       - the docs package's old `packages/docs/tools/_assets/` (before epic `people-and-orgs` P16)
 *   - the home page's paths:  `<up>pages/index.html`
 *   - the areas' list pages:  `<up>epics/index.html` ...
 *   - the site header's `root`:  `<up>`
 *   - the epics pack's script (`<ui-components source>`, on epic, details and choice pages):
 *     its route, `/_epic/pack/`
 *     - another pack's:  `<up>packages/<name>/components/__pack/` (a repo's own)
 *     - from its old folder, `packages/<name>/pack/`, too
 * - drops the template's `TEMPLATE:` how-to comment
 * - `docs:new`, `details new`, and the plan-doc tool's `epic new` (`PlanDocCommands`)
 */
export function atDepth(html, depth) {
  const up = "../".repeat(depth)
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
      .replace(/(<spell-site-header\b[^>]*?\broot=")[^"]*"/, `$1${up.replace(/\/$/, "") || "."}"`)
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
 *   - `"docs"`:  "Spell Docs", the default
 *   - `"review"`:  "Review" (`/epic review`, `epic pages open <page> --review`)
 * - the session is moving to a worktree's window (`/isolate`, `/epic`:  a pending handoff):
 *   shown THERE once it has moved, not in the window it's leaving
 * - no bridge (extension not reloaded, or not run from a VS Code window), or it failed:  the `vscode://` URI
 * - `open` can't fail (macOS):  without the extension, VS Code says it can't handle the URI
 * - `open` itself failed (not macOS):  falls back to Chrome
 * - async for the bridge's http request;  never rejects
 */
export async function openInVSCode(file, { hash, query, view = "docs" } = {}) {
  if (!Window.inVSCode) return openInChrome(file, { hash, query })
  const path = resolve(inContent(file))
  const served = ensurePageServer()
  const review = view === "review"
  try {
    const { window, later } = await Window.show(path, { hash, query, view: review ? "review" : undefined })
    if (later) return console.log(`${path} shows in ${later} once this session moves there`)
    return console.log(`opened ${path} in VS Code (window ${window.pid})`)
  } catch (error) {
    if (!/^no window/.test(error.message)) console.error(`${error.message}:  falling back to the vscode:// URI`)
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
 * Show `url` in Chrome, reusing the tab whose URL contains `key` (see `openInChrome()`).
 * - `front`:  bring Chrome and that tab's window forward -- a link Owen clicked (`showRoutes.ts`)
 * - else in the background
 */
export function openUrlInChrome(url, key, { front = false } = {}) {
  const script = `
set target to ${JSON.stringify(url)}
set pageKey to ${JSON.stringify(key)}
if application "Google Chrome" is not running then return "launch"
tell application "Google Chrome"
  repeat with w in windows
    set i to 0
    repeat with t in tabs of w
      set i to i + 1
      if (URL of t) contains pageKey then
        if (URL of t) starts with target then
          tell t to reload
        else
          set URL of t to target
        end if
        set active tab index of w to i
        ${front ? "set index of w to 1\n        activate" : ""}
        return "reused"
      end if
    end repeat
  end repeat
  if (count of windows) is 0 then make new window
  tell front window to make new tab with properties {URL:target}
  ${front ? "activate" : ""}
  return "new tab"
end tell`
  const where = front ? "in front" : "in the background"
  const run = spawnSync("osascript", ["-e", script], { encoding: "utf8" })
  const how = run.stdout.trim()
  if (run.status === 0 && how !== "launch") return console.log(`opened ${url} (${how}, ${where})`)
  if (run.status !== 0) console.error(`Chrome via AppleScript failed (${run.stderr.trim()}):  falling back to \`open\``)
  spawnSync("open", [...(front ? [] : ["-g"]), "-a", "Google Chrome", url])
  console.log(`opened ${url} (Chrome launched ${where})`)
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
