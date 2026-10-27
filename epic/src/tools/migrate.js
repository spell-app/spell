/**
 * MIGRATE the docs' pages, by page KIND (epic `epic-workflow`, P8;  J44):
 * each kind's named, dated, idempotent steps, oldest first, on each page of that kind, under its lock;
 * a report per page that changed.
 * - the epic page's steps are the `epic` tool's (`spell-epic/tool/migrations`, `Migrations`):
 *   this file holds the OTHER kinds', and `epic migrate` runs it as a child for them (`MigrateCommands`)
 * - `KINDS`:  every page kind, the same list as `PAGE_KINDS` in `spell-epic/tool/migrations` (`migrate.test.ts` checks)
 * - `pageKind()`:  which kind a page is, from where it lives and what it loads
 * - `STEPS`:  the steps, as steps of their kind:
 *   - `components-not-markup`:  `to-components.js`, a page's bare tables and `<details>` asides in components
 *     (epic `epic-engine` P3);  what it can't call is left, and listed
 *   - `engine-asset-paths`:  a page still loading the engine's files by their old checkout paths
 *     (`../packages/epics/tools/_assets/spell-ui.js`) loads them from the epic server's routes (`/_epic/assets/...`);
 *     the saga pages, the parked goal sets and a brand page had them (epic `repo-split` I63)
 *   - `root-links`:  every local link a ROOT PATH, as the page server serves it (`/spell-ui/x.ts`), broken ones mended
 *     where a move left one home (epic `epic-engine` P46;  `RootLinks`, the epic tool's, whose content folder's pass
 *     `epic migrate` runs too);  a TEXT step (`rewrite()`):  every other byte kept
 *   - The older steps went once every page had run them (epic `repo-split` Q45):  `ui-section`, `answer-elements`,
 *     `engine-asset-routes` (which `engine-asset-paths` brings back for the pages it missed), and the data files'
 *     renames (`json5-data-files`).
 *     Their code is in git history, for a page restored from an old backup.
 * - A new step:  an entry in `STEPS`, LAST, in the same commit as the markup change it follows.
 *   It must change nothing on a page it has migrated already, and keep every word.
 * - runs under `tsx` (`root-links` links through `spell/server`):  `epic migrate` runs it so (`MigrateCommands`)
 * - `node --import tsx src/tools/migrate.js [--root <checkout>] [<kind>] [--file <page>] [--step <name>] [--dry-run] [--list]`:
 *   - every kind with steps, or one kind
 *   - one page (`--file`, its kind found unless given)
 *   - `--list`:  the steps
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

import { parseHTML } from "linkedom"

import { FileLock } from "spell/server/FileLock"
import { parseVerbArgs, stringFlag } from "spell-epic/command/command.types.ts"
import { EpicConfig } from "spell-epic/config/EpicConfig.ts"
import { DataFile } from "spell-epic/data/DataFile.ts"
import { engineUrlFor } from "spell-epic/server/server.types.ts"
import { rowsFile } from "./choices.js"
import { listPages } from "./details.js"
import { findPages, formattedAlready, pageFile, ROOT, serialize, tidy } from "./pages.js"
import { convertMarkup, hasMarkup } from "./to-components.js"
import { linkerFor, linkerUnder } from "./doc-links.js"
import { RootLinks } from "spell-epic/tool/migrations/RootLinks"
import { RepoList } from "spell-epic/server/RepoList"

/**
 * Every page kind, by its key:  `spell-epic/tool/migrations` `PAGE_KINDS`, kept the same.
 * - keys, typed on the command line (`epic migrate detail`);  what's printed is the kind's name (`KIND_NAMES`)
 */
export const KINDS = [
  "epic",
  "goal",
  "guide",
  "cheatsheet",
  "command",
  "changelog",
  "template",
  "home",
  "list",
  "detail",
  "choice",
  "component",
  "brand",
  "goal-set"
]

/** Each kind's name, as people read it (Owen, 2026-10-14, epic `epic-workflow` P14), where it isn't its key. */
const KIND_NAMES = {
  epic: "epic page",
  goal: "saga page",
  command: "commands page",
  home: "home page",
  list: "list page",
  detail: "details page",
  choice: "choice page",
  component: "components page",
  brand: "brand page",
  "goal-set": "saga page (parked)"
}

/** The kind `kind`'s pages, in words:  `details pages`, `guides`. */
function kindPages(kind) {
  const name = KIND_NAMES[kind] ?? kind
  return name.replace(/^(\S+ page|\S+)/, "$1s")
}

/**
 * The steps, oldest first:  `{ name, date, kinds, description, applies(html), run(document) }`.
 * - `applies(html)`:  a cheap test on the page's text, so a page with nothing to do isn't parsed
 * - `run(document, { file })`:  changes the page IN PLACE (`file`:  its path, for what lies beside it)
 *   - returns `{ changed, notes }`, `notes` one line each
 *   - notes with nothing `changed`:  what it left for a person, reported all the same
 * - OR `rewrite(text, { file, root })`, a TEXT step:  the page's text, never parsed, every other byte kept;
 *   returns `{ text, changed, notes }`;  `root`, the checkout it's in
 */
export const STEPS = [
  {
    name: "components-not-markup",
    date: "2026-10-19",
    kinds: ["guide", "cheatsheet", "command", "changelog", "template", "home", "list", "detail", "choice"],
    description:
      "a page's bare tables in <ui-table>, every <ui-table> unstackable, its <details> asides as <ui-accordion>s;  the rest listed (to-components.js, epic-engine P3, I36)",
    applies: hasMarkup,
    run(document) {
      const { tables, unstacked, asides, opened, left } = convertMarkup(document)
      const notes = [
        ...(tables ? [`${tables} tables -> <ui-table celled padding="compact" appearance="striped" unstackable>`] : []),
        ...(unstacked ? [`${unstacked} <ui-table>s made unstackable`] : []),
        ...(asides ? [`${asides} <details> -> <ui-accordion appearance="styled">`] : []),
        ...opened.map((where) => `${where}:  started open, now folded`),
        ...left.map((why) => `LEFT for a person:  ${why}`)
      ]
      return { changed: tables + unstacked + asides > 0, notes }
    }
  },
  {
    name: "engine-asset-paths",
    date: "2026-10-21",
    kinds: KINDS.filter((kind) => kind !== "epic"),
    description:
      "a page loading the engine's files by an old checkout path (../packages/epics/tools/_assets/) loads them from /_epic/ (the epic server's routes;  repo-split I63)",
    applies: (html) => ENGINE_PATH_LINK.test(html),
    run(document) {
      const changes = rewriteEngineLinks(document)
      return { changed: changes.length > 0, notes: changes.map(({ from, to }) => `${from} -> ${to}`) }
    }
  },
  {
    name: "root-links",
    date: "2026-10-25",
    kinds: KINDS.filter((kind) => kind !== "epic"),
    description:
      "every local link a root path (/spell-ui/x.ts), as the page server serves it;  broken ones mended where a move left one home (epic-engine P46)",
    applies: (html) => RELATIVE_URL.test(html),
    rewrite(text, { file, root }) {
      const { linker, dir } =
        resolve(root) === resolve(ROOT) ? linkerFor(dirname(resolve(file))) : scratchLinker(root, file)
      const { text: rooted, changes } = RootLinks.rewrite(text, join(dir, basename(file)), linker)
      const notes = changes
        .filter((change) => change.kind === "broken" || change.kind === "outside")
        .map(
          (change) =>
            `${change.kind === "broken" ? "BROKEN" : "LEFT, above the root"}, for a person:  ${change.from} -> ${change.to}`
        )
      const rewritten = changes.filter((change) => change.kind !== "outside").length
      return {
        text: rooted,
        changed: rooted !== text,
        notes: [...(rewritten ? [`${rewritten} links as root paths`] : []), ...notes]
      }
    }
  }
]

/** Linkers for checkouts other than this one (`--root`, a test's scratch checkout), by root:  each built once. */
const scratchLinkers = new Map()

/** `root`'s linker (`linkerUnder()`, laid under the checkout that serves it), and `file`'s folder as it takes it. */
function scratchLinker(root, file) {
  const at = new RepoList().linkRootOf(resolve(root))
  if (!scratchLinkers.has(at)) scratchLinkers.set(at, linkerUnder(at))
  return { linker: scratchLinkers.get(at), dir: dirname(resolve(file)) }
}

/**
 * A cheap test for `root-links`:  any relative URL or site header root in the page (the step reads it properly).
 * - any double-quoted URL attribute that doesn't start `/`, `#` or a scheme, or a Markdown link
 */
const RELATIVE_URL =
  /\s(?:href|src|source|poster|link|title|data-[\w-]+)="\.?\.\/|\s(?:href|link)="(?![#/?]|[a-z][a-z0-9+.-]*:)[^"]+"|<spell-site-header\b[^>]*\sroot=/i

/**
 * The elements that LOAD an engine file, and the attribute naming it:  a stylesheet (`<link href>`), a script
 * (`<script src>`), a component pack (`<ui-components source>`).
 * - never a plain link (`<a href>`) or a `title`:  those name a source file for a reader, not something the page loads
 */
const ENGINE_LINKS = [
  { selector: "link[href]", attribute: "href" },
  { selector: "script[src]", attribute: "src" },
  { selector: "ui-components[source]", attribute: "source" }
]

/** A loading attribute naming an engine file by an old checkout path, from any depth (`engineUrlFor()`'s folders). */
const ENGINE_PATH_LINK =
  /\b(?:href|src|source)="(?:\.\.\/)*\/?packages\/(?:epics\/(?:tools\/_assets|components\/__pack|pack)|docs\/(?:tools\/)?_assets)\//

/**
 * Point `document`'s links to the engine's files (`ENGINE_LINKS`) at the engine routes, IN PLACE:
 * `../../packages/epics/tools/_assets/spell-ui.js` => `/_epic/assets/spell-ui.js` (`engineUrlFor()`).
 * - returns each change, `{ from, to }`;  none when every link is a route already (idempotent)
 */
export function rewriteEngineLinks(document) {
  const changes = []
  for (const { selector, attribute } of ENGINE_LINKS) {
    for (const element of document.querySelectorAll(selector)) {
      const from = element.getAttribute(attribute)
      const to = engineUrlFor(from)
      if (!to) continue
      element.setAttribute(attribute, to)
      changes.push({ from, to })
    }
  }
  return changes
}

/**
 * Which kind page `file` is (`KINDS`), from where it lives (its page path:  `pathFrom()`, checkout `root`'s) and
 * what it loads.
 * - a details page with `<slug>.rows.json5` (or its old `.json`) beside it is a choice page
 * - a review page counts as a details page
 * - under `guides/`:  a page loading `commands.js` is a commands page, one with a card filter a cheatsheet
 */
export function pageKind(file, root = ROOT, html = existsSync(file) ? readFileSync(file, "utf8") : "") {
  const path = pathFrom(file, root)
  // before `details/`:  the epic `details` has its page there (epic `epic-engine` P3)
  if (EPIC_PAGE.test(path)) return "epic"
  if (/(^|\/)details\//.test(path)) return DataFile.exists(rowsFile(file)) ? "choice" : "detail"
  // before `<epic-page>`:  a saga page is one too (`<epic-page kind="saga">`), which `epic migrate` doesn't list
  if (/\.(goal|saga)\.html$/.test(path)) return "goal"
  if (EPIC_PAGE_TAG.test(html)) return "epic"
  if (path === "pages/index.html") return "home"
  if (/^(epics|guides|templates|brand|sagas)\/index\.html$/.test(path)) return "list"
  if (path.startsWith("goals/") || path.startsWith("templates/goals/")) return "goal-set"
  if (path.startsWith("templates/")) return "template"
  if (path.startsWith("brand/")) return "brand"
  if (path.startsWith("ui/")) return "component"
  if (path === "guides/changelog.html") return "changelog"
  if (/\bcommands\.js\b/.test(html)) return "command"
  if (/\bclass="[^"]*\bspell-filter\b/.test(html)) return "cheatsheet"
  return "guide"
}

/**
 * An `<epic-page>` ELEMENT, starting a line or right after a tag:  never the name in an attribute's text (the epic
 * tool's guide describes `<epic-page>` in a step's `description`, and was taken for an epic page, so no guide step
 * ran on it:  epic `epic-engine` I25)
 */
const EPIC_PAGE_TAG = /(^|>)[ \t]*<epic-page\b/m

/** The steps for `kind`, oldest first (or just `step`);  throws for a step that isn't one. */
export function stepsFor(kind, step) {
  if (step && !STEPS.some((each) => each.name === step)) throw new MigrateError(`no step "${step}" (--list lists them)`)
  return STEPS.filter((each) => each.kinds.includes(kind) && (!step || each.name === step))
}

/**
 * The pages of checkout `root` that some step is for, as `{ file, kind }`, sorted:
 * - every page of the docs' areas:  pages, guides, templates, epics, sagas, the parked goal sets, brand
 * - every details and choice page (`details.js` `listPages()`:  `findPages()` skips `details/` folders)
 * - epic pages and components pages left out (no step is for them)
 * - `kind`:  only that kind
 */
export function pagesFor(root, kind) {
  const content = EpicConfig.contentOf(root)
  const areas = [
    ...["pages", "guides"].map((area) => join(content, area)),
    join(root, "templates"),
    ...["epics", "sagas", "goals", "brand"].map((area) => join(content, area))
  ]
  const found = [...findPages(areas), ...listPages(content)]
  const files = [...new Set(found)].filter((file) => existsSync(file)).sort((one, other) => one.localeCompare(other))
  return files
    .map((file) => ({ file, kind: pageKind(file, root) }))
    .filter((page) => (kind ? page.kind === kind : STEPS.some((step) => step.kinds.includes(page.kind))))
}

/**
 * Migrate `pages` (`{ file, kind }`):  each one's steps, oldest first (or just `step`), each page under its lock;
 * returns `{ results, written }`:  `results` one per page, `{ file, kind, ran, notes }`.
 * - `dryRun`:  the same results, nothing written
 * - `root`:  the checkout the pages are in (default this one, `ROOT`), for a text step's links (`root-links`)
 * - `tidied`:  tidy what it wrote, as every tool that writes a page does (link targets, oxfmt;  `pages.js` `tidy()`)
 *   - oxfmt only on a page that was formatted BEFORE (`formattedAlready()`):  it folds runs of spaces in text, and a
 *     page that wasn't keeps them (`Bedtime:  epic-workflow` in an h1:  epic `epic-engine` I7)
 */
export function migratePages(
  pages,
  { step = /** @type {string | undefined} */ (undefined), dryRun = false, tidied = true, root = ROOT } = {}
) {
  const results = []
  const written = []
  const due = new Set(
    pages
      .filter(({ file, kind }) => stepsFor(kind, step).some((each) => each.applies(readFileSync(file, "utf8"))))
      .map(({ file }) => file)
  )
  // asked before any page changes:  which were formatted
  const formatted = new Set(tidied && !dryRun ? formattedAlready([...due]) : [])
  for (const { file, kind } of pages) {
    const steps = stepsFor(kind, step)
    if (!due.has(file)) {
      results.push({ file, kind, ran: [], notes: [] })
      continue
    }
    const result = withLocks(dryRun ? [] : [file], () => {
      // the page as text, parsed only for a DOM step, and serialized only after one
      let text = readFileSync(file, "utf8")
      let document
      const current = () => (document ? serialize(document) : text)
      const ran = []
      const notes = []
      for (const each of steps) {
        // only a step with something to do, on the page as the steps before left it:  a step's `run()` may change
        // a page it isn't for
        if (!each.applies(current())) continue
        let done
        if (each.rewrite) {
          done = each.rewrite(current(), { file, root })
          text = done.text
          document = undefined
        } else {
          document ??= parseHTML(text).document
          done = each.run(document, { file })
          text = serialize(document)
        }
        if (done.changed) ran.push(each.name)
        // one that changed nothing may still say what it left, or skipped
        notes.push(...done.notes.map((note) => `${each.name}:  ${note}`))
      }
      if (ran.length && !dryRun) {
        writeFileSync(file, current())
        written.push(file)
      }
      return { file, kind, ran, notes }
    })
    results.push(result)
  }
  const format = written.filter((file) => formatted.has(resolve(ROOT, file)))
  if (tidied && written.length && !tidy(written, { format }))
    throw new MigrateError("tidying the migrated pages failed (above)")
  return { results, written }
}

/** The report's lines:  one per page that changed (each with its notes), then one per kind. */
export function report(results, root, { dryRun = false, all = false } = {}) {
  const lines = []
  const kinds = new Map()
  for (const { file, kind, ran, notes } of results) {
    const counts = kinds.get(kind) ?? { pages: 0, changed: 0, steps: new Map() }
    kinds.set(kind, counts)
    counts.pages++
    if (!ran.length) {
      if (notes.length) lines.push(`${pathFrom(file, root)}:  nothing to change`, ...notes.map((note) => `  ${note}`))
      else if (all) lines.push(`${pathFrom(file, root)}:  up to date`)
      continue
    }
    counts.changed++
    for (const each of ran) counts.steps.set(each, (counts.steps.get(each) ?? 0) + 1)
    lines.push(`${pathFrom(file, root)}:  ${dryRun ? "would run " : ""}${ran.join(", ")}`)
    for (const note of notes) lines.push(`  ${note}`)
  }
  for (const [kind, { pages, changed, steps }] of kinds) {
    const byStep = [...steps].map(([each, n]) => `${each} ${n}`).join(", ")
    lines.push(
      `${kindPages(kind)}:  ${changed} of ${pages} ${dryRun ? "would change" : "changed"}${byStep ? ` (${byStep})` : ""}`
    )
  }
  return lines
}

/**
 * Run `fn` holding every `<file>.lock` of `files`:  the kit's `FileLock`, one inside the other.
 * - waits up to 30s for each, and takes over one older than a minute (a crashed holder's)
 */
export function withLocks(files, fn) {
  const [file, ...rest] = files
  if (file === undefined) return fn()
  return FileLock.run(file, () => withLocks(rest, fn), { wait: 30_000, stale: 60_000 })
}

/** An epic page, from the checkout's root:  `epics/<name>/<name>.plan.html` (or an older `<name>.html`). */
const EPIC_PAGE = /^epics\/([^/]+)\/\1(\.plan)?\.html$/

/** A problem to say, not a stack trace:  exit 2. */
export class MigrateError extends Error {}

/**
 * Page argument `page`:  absolute as is, else a page path in checkout `root`'s content folder, else from `root`,
 * else as `pages.js` `pageFile()` reads it.
 */
function fileOf(page, root) {
  if (isAbsolute(page)) return page
  const there = [EpicConfig.contentOf(root), root].map((base) => resolve(base, page)).find((file) => existsSync(file))
  return there ?? pageFile(page)
}

/**
 * The folder page paths are from for `file`, a page of checkout `root`:  its repo's content folder
 * (`EpicConfig.contentOf()`, epic `epic-eject` P12) when it's in it, else the checkout (`templates/` ...).
 */
function baseOf(file, root) {
  const content = EpicConfig.contentOf(root)
  const inside = relative(content, file)
  return inside.startsWith("..") || isAbsolute(inside) ? root : content
}

/** `file`'s page path, `/`-separated:  from `baseOf()`. */
function pathFrom(file, root) {
  return relative(baseOf(file, root), file).split(sep).join("/")
}

/**
 * The command line, `argv` after the script:  prints with `say(line)`.
 * - returns the exit code (2:  a usage problem, said on stderr)
 * - returns rather than exits:  `process.exit()` cuts off output still on its way down a pipe
 */
export function main(argv, say = (line) => process.stdout.write(`${line}\n`)) {
  const { positional, flags } = parseVerbArgs(argv)
  const root = resolve(stringFlag(flags.root) ?? ROOT)
  const [kind] = positional
  try {
    if (kind && !KINDS.includes(kind)) throw new MigrateError(`no page kind "${kind}":  ${KINDS.join(", ")}`)
    if (kind === "epic") throw new MigrateError("epic pages are the `epic` tool's:  epic migrate epic")
    if (flags.list) {
      for (const step of STEPS.filter((each) => !kind || each.kinds.includes(kind)))
        say(`${step.kinds.join(",").padEnd(11)} ${step.date}  ${step.name.padEnd(24)} ${step.description}`)
      return 0
    }
    const step = stringFlag(flags.step)
    const dryRun = Boolean(flags.dryRun)
    let pages
    const named = stringFlag(flags.file)
    if (named !== undefined) {
      const file = fileOf(named, root)
      if (!existsSync(file)) throw new MigrateError(`no page ${flags.file}`)
      const found = kind ?? pageKind(file, root)
      if (found === "epic") throw new MigrateError("an epic page:  epic migrate --file <page>")
      pages = [{ file, kind: found }]
    } else pages = pagesFor(root, kind)
    if (kind && !stepsFor(kind, step).length) {
      say(`${kindPages(kind)}:  no steps${step ? ` called ${step}` : ""} for them yet`)
      return 0
    }
    const { results } = migratePages(pages, { step, dryRun, root })
    for (const line of report(results, root, { dryRun, all: named !== undefined })) say(line)
    return 0
  } catch (error) {
    if (!(error instanceof MigrateError)) throw error
    process.stderr.write(`migrate:  ${error.message}\n`)
    return 2
  }
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2))
