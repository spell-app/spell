/**
 * `epic pages index`:  write the home page's area cards and each area's list page,
 * from every page's `<title>` and description (claude-design P5).
 * Usage (from spell-epic's root):  node src/tools/index.js
 * - The home, `pages/index.html`:  a routing page, one card per area (`areaCards()`), each with its count,
 *   written between `<!-- areas:start -->` and `<!-- areas:end -->`
 *   - a missing one is made from `homeSkeleton()` first (a repo `epic init` set up)
 *   - only the areas this checkout HAS (`areaCards()`):  Guides, Sagas, Epics;  and Epic Documentation, every repo's
 *   - NOT `index:start` / `index:end`:  the home is shared, so an older checkout's `index.js` runs against it too
 *     - that one wrote three lists into the home
 *     - finding no markers, it stops instead of writing its lists back
 * - The list pages (`LISTS`), each `<area>/index.html`,
 *   written between `<!-- index:start -->` and `<!-- index:end -->`.
 *   - a missing one is made from `skeleton()` first, so the rest of it is hand-authored after
 *   - Epics:  `epics/<name>/<name>.plan.html`, ONE `<epic-list>` of `<epic-card>`s (`spell/epic/list/EpicCards`,
 *     epic `epic-engine` P3), which the elements draw:
 *     - five groups, alphabetical within each:  Favorites, Active, Planning, Urgent, Done
 *     - a row of saga chips above them (each saga's count;  a click filters by them)
 *     - each card's title after its state's mark, read from its phases, its "updated" date and the items that need Owen
 *       - the marks (`spell/epic/list/EpicState`):  in progress, errors, paused, future, done
 *     - a star at its top right (`FAVORITES_FILE`), the day it was last worked on at its bottom right (`worked()`)
 *     - as it serves the page, the page server adds the running epics' cards,
 *       and marks every card `running` and `favorite` as they are now
 *   - Guides:  `guides/**`, a section per saga in the sagas' order (epic `epic-workflow` P15)
 *     - each headed by the saga's title linking its saga page
 *     - each guide under the saga its meta names (`<meta name="spell-saga" content="<id>">`)
 *     - and a "Misc" section last for the rest
 *   - Sagas:  a card per saga, in Owen's order (`sagas/sagas.json5`, through `Sagas`)
 *     - its title linking its saga page (made or not yet), its purpose, how many epics and guides name it
 *   - Templates:  `templates/**`, those only a command makes a page from (`madeTemplates()`),
 *     and the "Writing docs" notes (`WRITING_DOCS`, in its skeleton)
 *   - Brand:  `brand/**`, in its section 6, but not the rich Brand index's own pages
 *     - its own (`BRAND_OWN`):  Claude Design's export and its copies, the element pages, Compare
 *     - `section`:  the index's own sections hold an id `brand` already
 * - Paths are from the checkout's root;  links from the page's own folder.
 * - Page notes Owen left in a written part (`<spell-notes>`, `PageNotes.js`) go back into the new one
 *   (`replaceBetween()`).
 * - Prints the guides that went to Misc, and those naming a saga that isn't in the list.
 * - Then tidies the pages like any other (`pages.js` `tidy()`, link targets and oxfmt),
 *   so a re-run with nothing new changes nothing.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import { parseHTML } from "linkedom"

import { escapeHTML } from "spell/util/string.ts"
// By name with its `.ts`, its types stripped by `node` itself:  this tool runs under plain `node`
import {
  EPIC_GROUPS,
  FAVORITES_FILE,
  epicCardHtml,
  epicListHtml,
  eventTimesIn,
  lastWorked,
  favoritesIn
} from "spell/epic/list/EpicCards.ts"
import { URGENT_SELECTOR } from "spell/epic/list/EpicState.ts"
import { PhaseIds } from "spell/epic/phases/PhaseIds.ts"
import { DataFile } from "spell/epic/data/DataFile.ts"
import { Sagas } from "spell/epic/tool/Sagas.ts"
import { TOOL_TEMPLATES } from "./answerPages.js"
import { FEATURE_SET } from "./FeatureSet.js"
import { PageNotes } from "./PageNotes.js"
import {
  BRAND,
  CONTENT,
  EPICS,
  GOALS,
  GUIDES,
  HOME,
  LIST_PAGES,
  REPO_TEMPLATES,
  ROOT,
  SAGAS,
  TEMPLATES,
  fromTemplate,
  findPages,
  pageAt,
  pagePath,
  tidy
} from "./pages.js"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

/** The home page, as a page path (`pages/index.html`). */
const INDEX = pagePath(HOME)

/** The repo's own templates folder, from the checkout's root, with its `/` (`docs/templates/`);  none:  `undefined`. */
const REPO_TEMPLATE_PATH = REPO_TEMPLATES && `${pagePath(REPO_TEMPLATES)}/`

/** The repo's name, as its windows show it (`windows.repoName`):  what the pages say they're about. */
const REPO = EpicConfig.of(ROOT).windows.repoName

/** The home's markers:  its area cards go between. */
export const HOME_START = "<!-- areas:start -->"
export const HOME_END = "<!-- areas:end -->"

/** A list page's markers:  its cards go between. */
export const START = "<!-- index:start -->"
export const END = "<!-- index:end -->"

/**
 * The named character references `decodeReferences()` writes out.
 * Up here, as `GROUP_COUNTS` is:  `main()` needs it as this file loads.
 */
const NAMED_REFERENCES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" }

/**
 * Each Epics group's words in the home's Epics count (`2 favorites · 3 active · 1 planning · 4 urgent · 20 done`).
 * Up here:  this file runs as it loads (`main()`, below), and needs it then.
 */
const GROUP_COUNTS = {
  favorites: "favorites",
  active: "active",
  planning: "planning",
  urgent: "urgent",
  done: "done"
}

/** The "Writing docs" notes, on the Templates page (the home had them before P5). */
const WRITING_DOCS = `<ui-section id="writing-docs" label="Writing docs" sticky collapsible dividing open="false">
<ui-icon slot="icon" name="pen to square"></ui-icon>
<ul>
<li>Start from a template:  <code>epic pages create durable &lt;topic&gt;/&lt;topic&gt;.html --title "Title"</code>.</li>
<li>An epic page:  run <code>/epic &lt;name&gt;</code> in Claude Code.  Never copy the plan template by hand.</li>
<li>The rules:  spell-epic's <code title="epic/src/AGENTS.md">src/AGENTS.md</code>, where these templates live (<code>epic pages template</code>
prints the folder).  How the pages work:  <a href="/guides/spell-docs/spell-docs.md">spell-docs.md</a>.</li>
<li><code>pages create</code> lists the page on its area's page;  after renaming one or changing its title, run
<code>epic pages index</code>.</li>
</ul>
</ui-section>`

/**
 * The Sagas page's notes:  the parked first sagas (a checkout with `goals/` only), and how the list changes.
 * - a function:  `GOALS` is checked as the page is made
 */
const sagaNotes =
  () => `<ui-section id="${existsSync(GOALS) ? "parked" : "changing"}" label="${existsSync(GOALS) ? "Parked sagas" : "Changing the list"}" sticky collapsible dividing open="false">
<ui-icon slot="icon" name="folder"></ui-icon>
<ul>
${
  existsSync(GOALS)
    ? `<li>The first sagas, by topic, with the questions still open:  <a href="/goals/index.html" target="_self">the parked
saga sets</a>, read only (epic <code>epic-goals</code> rebuilds them).</li>\n`
    : ""
}<li>The list, its order and each epic's saga:  <code>epic saga list</code>, <code>new</code>, <code>move</code>,
<code>title</code>, <code>rename</code>, <code>set</code>.  Then <code>epic pages index</code> writes this page again.</li>
</ul>
</ui-section>`

/** The Brand page's notes:  the files beside its pages. */
const BRAND_NOTES = `<ui-section id="files" label="Files" sticky collapsible dividing open="false">
<ui-icon slot="icon" name="folder"></ui-icon>
<ul>
<li><code>brand/design-system.json</code>:  the design system's push record (<code>spell design pushed</code>).</li>
<li><code>brand/README.md</code>:  what this folder holds.</li>
</ul>
</ui-section>`

/**
 * Brand pages the Brand index lists by hand (claude-design P11:  moved from `packages/brand`), so not in its
 * generated section:  Claude Design's export and its `.spell.html` copies (`brand-pages.js` `PAGES`), the element
 * docs pages, Compare, the reference images.
 */
const BRAND_OWN = /^brand\/(spell-design-system|components|leonardo)\/|^brand\/compare\.html$/

/**
 * The list pages, each `<area>/index.html`:  section id, title, icon (the rail's, and the home card's), which pages,
 * what to say when there are none, and its skeleton's description, lede and notes (`extra`).
 * - an icon must be in `ICONS` in `bundle-spell-ui.js`
 */
export const LISTS = [
  {
    id: "epics",
    dir: EPICS,
    title: "Epics",
    icon: "layer group",
    has: (path) => path.startsWith("epics/"),
    none: "No epics yet:  run /epic in Claude Code.",
    description: "Every epic's epic page, open ones first:  phases, questions, decisions.",
    lede: "Every epic's epic page, open ones first:  one per <code>/epic</code> session, with its phases, questions, decisions and log."
  },
  {
    id: "guides",
    dir: GUIDES,
    title: "Guides",
    icon: "book open",
    has: (path) => path.startsWith("guides/"),
    none: "No guides yet.",
    description: `Every guide in ${REPO}:  design notes, references, how things work and why.`,
    lede: `Every guide in ${REPO}:  design notes, references, how things work and why.`
  },
  {
    id: "sagas",
    dir: SAGAS,
    title: "Sagas",
    icon: "bullseye",
    // its cards are the sagas' list, not pages found (`sagaCards()`)
    has: () => false,
    none: 'No sagas yet:  epic saga create <id> "Title" --purpose "...".',
    description: "Every saga, an epic of epics:  the larger aims the epics serve, most exciting first.",
    lede: "Every saga, an epic of epics:  the larger aims the epics serve, in your order, most exciting first.",
    get extra() {
      return sagaNotes()
    }
  },
  {
    id: "templates",
    dir: TEMPLATES,
    title: "Templates",
    icon: "copy",
    // the engine's (`templates/...`, wherever spell-epic is:  `pagePath()`);  the repo's own have a list of their own
    has: (path) => path.startsWith("templates/"),
    none: "No templates yet.",
    description: "A starting point for every kind of docs page, and how to write one.",
    lede: "A starting point for every kind of docs page, and how to write one.",
    made: () => madeTemplates(),
    extra: WRITING_DOCS
  },
  // the repo's own templates, when it has any (`repoTemplates`):  their list page in their folder, so the engine's
  // Templates page is the same for every repo
  ...(REPO_TEMPLATES
    ? [
        {
          id: "repo-templates",
          dir: REPO_TEMPLATES,
          title: `${REPO}'s templates`,
          icon: "copy",
          has: (path) => path.startsWith(REPO_TEMPLATE_PATH),
          none: "No templates of its own yet.",
          description: `${REPO}'s own page templates, beside spell-epic's (the Templates page).`,
          lede: `${REPO}'s own page templates, beside <a href="/templates/index.html">spell-epic's</a>:  <code>epic pages create</code> finds these first.`
        }
      ]
    : []),
  {
    id: "brand",
    dir: BRAND,
    title: "Brand",
    icon: "palette",
    has: (path) => path.startsWith("brand/") && !BRAND_OWN.test(path),
    section: { id: "pulled", title: "6. From Claude Design" },
    none: "No pages pulled from Claude Design yet.",
    description:
      "Spell's brand:  Claude Design's pages beside their Spell UI copies, the ui-brand-* elements, and pages pulled back from Claude Design.",
    lede: "Spell's brand pages:  built in Claude Design on the Spell design system, brought back with <code>/design pull</code>.",
    extra: BRAND_NOTES
  }
]

if (import.meta.main) main()

/** Write every list page, then the home's cards;  tidy them;  print what each holds, and the guides in Misc. */
function main() {
  const lists = new Set(LIST_PAGES.map((file) => pagePath(file)))
  const branches = branchCommits()
  const sagas = readSagas()
  const pages = [...findPages(), ...findPages(BRAND)]
    .map((path) => pagePath(path))
    .filter((path) => path !== INDEX && !lists.has(path))
    .map((path) => describe(path, branches))
  const written = []
  const report = []
  for (const list of LISTS) {
    if (!existsSync(list.dir)) continue
    const file = join(list.dir, "index.html")
    if (!existsSync(file)) writeFileSync(file, fromTemplate(skeleton(list)))
    const mine = list.id === "sagas" ? pages : pages.filter((page) => list.has(page.path))
    const body = listSection(list, mine, undefined, sagas)
    // the engine's Templates page (spell-epic's `templates/`, a TRACKED file):  every repo's `epic` writes the same
    // list, so it's written only when its templates changed, never churned (`sameList()`), never from a made-up
    // checkout (`writesEngineList()`), and tidied at once (`writeEngineList()`)
    if (list.dir === TEMPLATES) {
      const unchanged = sameList(readFileSync(file, "utf8"), body)
      if (unchanged || !writesEngineList()) {
        report.push(`${pagePath(file)}:  ${mine.length} (${unchanged ? "unchanged" : "left alone:  no epic config"})`)
        continue
      }
      if (!writeEngineList(file, body)) process.exit(1)
      report.push(`${pagePath(file)}:  ${mine.length}`)
      continue
    }
    if (!writeBetween(file, START, END, body)) process.exit(1)
    written.push(file)
    report.push(`${pagePath(file)}:  ${list.id === "sagas" ? sagas.length : mine.length}`)
  }
  // only the areas this checkout has:  a repo `epic init` set up has Guides, Sagas and Epics
  const cards = areaCards(pages, undefined, sagas).filter(hasArea)
  if (!existsSync(HOME)) writeFileSync(HOME, homeSkeleton())
  if (!writeBetween(HOME, HOME_START, HOME_END, homeSection(cards))) process.exit(1)
  if (!tidy([HOME, ...written])) process.exit(1)
  console.log(`${INDEX}:  ${cards.length} areas;  ${report.join(", ")}`)
  const guides = pages.filter((page) => LISTS.find((list) => list.id === "guides").has(page.path))
  const ids = new Set(sagas.map((saga) => saga.id))
  const misc = guides.filter((page) => !page.saga)
  const unknown = guides.filter((page) => page.saga && !ids.has(page.saga))
  if (misc.length) console.log(`guides in Misc (no saga):  ${misc.map((page) => page.path).join(", ")}`)
  for (const page of unknown)
    console.log(`NOTE:  ${page.path} names saga "${page.saga}", which isn't in the list:  Misc`)
}

/** The sagas, in Owen's order (`sagas/sagas.json5`, through `Sagas`);  none when the list is missing or won't read. */
export function readSagas() {
  try {
    return new Sagas(ROOT).list()
  } catch (error) {
    console.error(`sagas/sagas.json5 won't read:  ${error.message}`)
    return []
  }
}

/**
 * Whether list page `html` already holds list `body` between its markers, as `tidy()` left it:
 * the same once the link targets `doc-links.js` adds (`target="..."`) and all whitespace are set aside.
 */
export function sameList(html, body) {
  const from = html.indexOf(START)
  const to = html.indexOf(END)
  if (from < 0 || to < from) return false
  const plain = (text) => decodeReferences(text.replace(/\s+target="[^"]*"/g, "")).replace(/\s+/g, "")
  return plain(html.slice(from + START.length, to)) === plain(body)
}

/**
 * `text` with its character references written out:  `&#39;` => `'`.
 * - the list's body escapes them (`escapeHTML()`), and oxfmt writes them back as plain characters, so a tidied page
 *   and a fresh body only compare once both are decoded (epic `epic-engine` I131:  every run saw a change)
 */
function decodeReferences(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (reference, name) => {
    if (name[0] === "#")
      return String.fromCodePoint(
        name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1))
      )
    return NAMED_REFERENCES[name.toLowerCase()]
  })
}

/**
 * Whether this run may rewrite the engine's Templates page:  only from a checkout with an epic config
 * (`.epic/config.json5`), a repo's real checkout.
 * - NOT a test's made-up checkout (`PlanDocCommands`' scratch root, through `reindex()`):  the page is a file
 *   spell-epic tracks, which no test may write (epic `epic-engine` I131)
 */
function writesEngineList() {
  return existsSync(EpicConfig.of(ROOT).file)
}

/**
 * Write list `body` into the engine's Templates page `file`, tidied at once (`tidy()`);  `false` when it can't.
 * - its bytes are put back when tidying fails:  a run that dies later (a checkout with no `pages/`) never leaves it
 *   raw, with no link targets and unformatted (epic `epic-engine` I131)
 */
function writeEngineList(file, body) {
  const before = readFileSync(file, "utf8")
  if (writeBetween(file, START, END, body) && tidy([file])) return true
  writeFileSync(file, before)
  return false
}

/**
 * Replace what's between `start` and `end` in `file` with `body` (`replaceBetween()`);  `false` (and why, on stderr)
 * when the markers are missing.
 */
function writeBetween(file, start, end, body) {
  const html = replaceBetween(readFileSync(file, "utf8"), start, end, body)
  if (html === undefined) {
    console.error(`${pagePath(file)}:  missing ${start} ... ${end}`)
    return false
  }
  writeFileSync(file, html)
  return true
}

/**
 * `html` with what's between `start` and `end` replaced by `body`;  `undefined` when the markers are missing.
 * - the page notes Owen left in the old part (`<spell-notes>`) go back into their sections in the new one
 *   (`PageNotes.carryOver()`):  regenerating never loses a note
 */
export function replaceBetween(html, start, end, body) {
  const from = html.indexOf(start)
  const to = html.indexOf(end)
  if (from < 0 || to < from) return undefined
  const kept = PageNotes.carryOver(html.slice(from + start.length, to), body)
  return `${html.slice(0, from)}${start}\n${kept}\n${end}${html.slice(to + end.length)}`
}

/**
 * What the lists show for page `path`:
 * title, description, the saga it names, and a plan's status and last-worked moment.
 * - `saga`:  a guide's saga meta (`Sagas.sagaOf()`), an epic page's `<epic-page saga>`;  `null` for none
 * - title falls back to the file name, so a page without one still shows up (and looks wrong enough to fix)
 * - an epic page's title without its `Epic: ` (`planDoc.types` `TITLE_PREFIX`):  its card is in Epics already
 * - `branches`:  each branch's last commit (`branchCommits()`), for `worked()`
 */
function describe(path, branches = new Map()) {
  const html = readFileSync(pageAt(path), "utf8")
  const { document } = parseHTML(html)
  const full = document.querySelector("title")?.textContent.trim() || path
  const title = path.startsWith("epics/") ? full.replace(/^Epic:\s*/, "") : full
  const description = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ?? ""
  // Epics only:  the runtime's test page (`spell-docs/ui-section-test.html`) has phases too
  if (!path.startsWith("epics/")) {
    return { path, title, description, saga: Sagas.sagaOf(html), phases: [], updated: null, future: false, urgent: [] }
  }
  const plan = planOf(document)
  return { path, title, description, ...plan, worked: worked(path, html, plan.updated, branches) }
}

/**
 * When epic `path` (its epic page, `html` its text) was last worked on:  the latest of
 * - its "updated" day (`updated`:  the `epic` tool stamps it on every write)
 * - its last log line's time (`<epic-event at>`, in the doc or its `parts/log.html`)
 * - its branch's last commit (`branches`, by the epic's name), when the branch is still there
 * - `undefined` when none of them reads
 */
function worked(path, html, updated, branches) {
  const log = join(pageAt(path), "..", "parts", "log.html")
  const events = [...eventTimesIn(html), ...(existsSync(log) ? eventTimesIn(readFileSync(log, "utf8")) : [])]
  return lastWorked([updated, ...events, branches.get(path.split("/")[1])])
}

/**
 * Each local branch's last commit time, by branch name:  `airplane` -> `2026-10-09T22:01:59-04:00`.
 * - `git for-each-ref`, ONE call
 * - empty when git won't answer (no repo, a scratch checkout)
 * - NEVER throws
 */
function branchCommits() {
  try {
    const out = execFileSync(
      "git",
      ["for-each-ref", "--format=%(refname:short)%09%(committerdate:iso-strict)", "refs/heads"],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    )
    return new Map(
      out
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split("\t"))
    )
  } catch {
    return new Map()
  }
}

/**
 * What an epic page's card shows, from its skeleton:  `{ phases, updated, future, urgent }`.
 * - each `<epic-phase status title>` (its label `P2 · <title>`), `<epic-page updated future>`
 * - a doc still in the old markup (no `<epic-page>`:  one restored from an old backup) shows as an empty plan:
 *   the `epic` tool refuses it until it's converted (epic `epic-components` P15)
 * - `updated`:  the `epic` tool's "updated" stamp (`touch()`):  how long since anyone worked on it
 * - `future`:  an epic written down with `/epic future`, not planned yet
 * - `standing`:  open for good, every phase merging on its own (epic `epic-workflow`):  never shown done
 * - `saga`:  the saga it serves, its id (`<epic-page saga>`, epic `epic-workflow` P15);  `null` for none
 * - `urgent`:  the ids of the items that need Owen (`URGENT_SELECTOR`:  their red and orange chips)
 */
export function planOf(document) {
  const page = document.querySelector("epic-page")
  if (!page) return { phases: [], updated: null, future: false, saga: null, urgent: [] }
  const phases = Array.from(
    document.querySelectorAll('epic-page > epic-section[kind="phases"] > epic-phase'),
    (phase) => ({
      status: phase.getAttribute("status"),
      // numbered as drawn, not by its id (stable since epic `epic-workflow` P15:  `p-epic-migrate`):  P7, P11.1
      label: `${PhaseIds.labelOf(phase)} · ${(phase.getAttribute("title") ?? phase.querySelector(':scope > [slot="title"]')?.textContent ?? "").replace(/\s+/g, " ").trim()}`
    })
  )
  return {
    phases,
    updated: page.getAttribute("updated") || null,
    future: page.hasAttribute("future"),
    standing: page.hasAttribute("standing"),
    saga: page.getAttribute("saga") || null,
    urgent: Array.from(document.querySelectorAll(URGENT_SELECTOR), (item) => item.id),
    // its "0. While you were out" waits to be read (epic `epic-engine` P62)
    away: !!document.querySelector('epic-page > epic-section[kind="away"]')
  }
}

/** What epic `page`'s state is read from (`describe()`'s shape;  `spell/epic/list/EpicState` `EpicFacts`). */
function epicFacts(page) {
  return {
    phases: page.phases.map((phase) => phase.status),
    updated: page.updated,
    future: page.future,
    standing: page.standing,
    urgent: page.urgent,
    away: page.away,
    active: page.phases.find((phase) => phase.status === "active")?.label
  }
}

////////////////
// ## The home
////////////////

/**
 * The home's cards:  Guides, Sagas, Epics, the areas an epic user works in;  then Epic Documentation, the epic
 * tooling's own READMEs.
 * - Epic Documentation (Owen, 2026-11-19), in place of Templates:  `/_epic/docs/README-epics.md`, on every page server
 *   (spell-epic's `docsRoutes.ts`);  in VS Code's side bar it opens the Epic Docs tab (`opensTab`)
 *   - the Templates list page is still written, but no longer on the home:  not ready for other people to edit
 * - Owen, 2026-11-18 (epic `epic-engine` J275, before the demo):  "Remove anything Spell related in this page
 *   permanently.  No longer relevant to Epics."
 *   - before:  Epic/UI, Spell/UI, App, App/UI and Brand cards too (Owen, 2026-10-11, J40 of `epic-workflow`);
 *     their pages are still served at their addresses (`/components/ui/`, `/editor/`, `/brand/`), and the top bar
 *     leaves their tabs out (the epic repo's `page-server.json5`)
 * - Sagas was Goals until epic `epic-workflow` P15 (Owen, 2026-10-13:  "saga means roughly epic of epics")
 *
 * Each `{ id, title, icon, href, count?, description, meta?, pills?, opensTab? }`.
 * - `id`:  the card's id, so the old `pages/index.html#epics` / `#guides` / `#templates` links land on its card
 * - `pages`:  every page `describe()`d, so the counts come from the same data as the list pages;
 *   the Epics count by the Epics page's groups, `favorites` the starred epics' names (`readFavorites()`);
 *   the Sagas count is `sagas`' (`readSagas()`)
 * - every area, whether this checkout has it or not:  the home shows only those it has (`hasArea()`, `main()`)
 */
export function areaCards(pages, favorites = readFavorites(), sagas = readSagas()) {
  const of = (id) => pages.filter((page) => LISTS.find((list) => list.id === id).has(page.path))
  const groups = of("epics").map((page) => epicCard(page, "epics", favorites).group)
  const counts = EPIC_GROUPS.map((name) => [name, groups.filter((group) => group === name).length])
  return [
    {
      id: "guides",
      title: "Guides",
      icon: "book open",
      href: "/guides/index.html",
      count: plural(of("guides").length, "guide"),
      description: `Design notes, references and how-tos:  how each part works, and why.`
    },
    {
      id: "sagas",
      title: "Sagas",
      icon: "bullseye",
      href: "/sagas/index.html",
      count: plural(sagas.length, "saga"),
      description: "Each saga an epic of epics:  the larger aims the epics serve, in your order, most exciting first.",
      meta: existsSync(GOALS) ? `and ${plural(goalSets(), "parked saga set")}, read only` : undefined
    },
    {
      id: "epics",
      title: "Epic Pages",
      icon: "layer group",
      href: "/epics/index.html",
      count: counts
        .filter(([, count]) => count)
        .map(([name, count]) => `${count} ${GROUP_COUNTS[name]}`)
        .join(" · "),
      description: "Epic pages, one per /epic session:  phases, questions, decisions and the log of the work.",
      pills: true
    },
    {
      id: "epic-docs",
      title: "Epic Documentation",
      icon: "book",
      href: "/_epic/docs/README-epics.md",
      description: "How epics work:  setting up, planning, building and reviewing.",
      opensTab: true
    }
  ]
}

/**
 * A new home page, `pages/index.html`:  site header, sticky title, lede, the markers, a note on how it's made.
 * - for a repo `epic init` set up, which has none;  spell-app's is hand-authored
 * - written once, when missing;  after that only between the markers
 */
export function homeSkeleton() {
  const title = `${REPO} epics`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(`${REPO}'s epics:  the plans, the sagas they serve, and the guides they leave behind.`)}" />
<link rel="stylesheet" href="/_epic/assets/spell-doc.css" />
</head>
<body class="spell-doc-page">
<spell-site-header></spell-site-header>
<div class="spell-doc">
<main class="spell-doc-main">
<ui-sticky class="spell-h1"><header class="spell-page-head"><h1>${escapeHTML(title)}</h1></header></ui-sticky>
<p class="lede">${escapeHTML(REPO)}'s epics, the sagas they serve, and the guides they leave behind.</p>
${HOME_START}
${HOME_END}
</main>
</div>
<script src="/_epic/assets/highlight.min.js"></script>
<script src="/_epic/assets/spell-ui.js"></script>
</body>
</html>
`
}

/** Whether this checkout has area card `card`'s area:  its list page's folder (`guides/` ...). */
export function hasArea(card) {
  const list = LISTS.find((each) => each.id === card.id)
  return list ? existsSync(list.dir) : true
}

/**
 * What the home holds between its markers:  the area cards in a grid, straight under the lede.
 * - no "Areas" section around them (Owen, 2026-11-19)
 */
function homeSection(cards) {
  return `<ui-cards class="spell-grid spell-areas" stackable>
${cards.map(areaCard).join("\n")}
</ui-cards>`
}

/**
 * An area's card:  icon and linked title, its count, what's there.
 * - `pills`:  the Epic Pages card's Active epics, `<epic-pills>`, which draws itself from the page server, live (epic
 *   `epic-engine` T99;  J276 wrote a pill per epic here, as of the last `epic pages index`)
 * - `opensTab`:  in VS Code's side bar, the page opens in the tab it belongs to (`data-spell-open="tab"`, the kit's live
 *   client);  in a browser, a plain link
 * - `target="_self"`:  the home is a site's front page, so its cards navigate in place, as the top bar's tabs do
 *   (`doc-links.js` exempts `_self` from one-tab-per-destination)
 */
function areaCard(area) {
  const title = area.href
    ? `<a href="${escapeHTML(area.href)}" target="_self"${area.opensTab ? ` data-spell-open="tab"` : ""}>${escapeHTML(area.title)}</a>`
    : `<span>${escapeHTML(area.title)}</span>`
  const meta = [area.count, area.meta]
    .filter(Boolean)
    .map((part) => escapeHTML(part))
    .join(" · ")
  return `<ui-card id="${area.id}"><ui-content>
<ui-header><ui-icon name="${area.icon}"></ui-icon> ${title}</ui-header>
${meta ? `<ui-meta>${meta}</ui-meta>` : ""}
<ui-description>${descriptionLines(area.description)}</ui-description>
${area.pills ? "<epic-pills></epic-pills>" : ""}
</ui-content></ui-card>`
}

/**
 * A card's description, broken onto a second line at its first colon:  `Design notes, references and how-tos:` /
 * `how each part works, and why.` (Owen, 2026-11-18:  "Split the text in these buttons into 2 lines at the colon").
 * - no colon:  one line
 */
export function descriptionLines(description) {
  const at = description.indexOf(":")
  if (at < 0) return escapeHTML(description)
  const rest = description.slice(at + 1).trim()
  return `${escapeHTML(description.slice(0, at + 1))}<br />${escapeHTML(rest)}`
}

/** `count` and `noun`, plural unless 1:  `3 guides`, `1 page`. */
function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/** How many saga sets there are (goal sets, once):  folders of `goals/` with an `index.html`. */
function goalSets() {
  if (!existsSync(GOALS)) return 0
  return readdirSync(GOALS, { withFileTypes: true }).filter(
    (entry) => !entry.name.startsWith(".") && existsSync(join(GOALS, entry.name, "index.html"))
  ).length
}

////////////////
// ## The list pages
////////////////

/**
 * A new list page:  site header, breadcrumb back to the home, sticky title, lede, the markers, then `list.extra`.
 * - every list page is `<area>/index.html`, one folder deep:  `..` up to the root
 * - the engine's assets from the epic server's route, `/_epic/assets/` (epic `epic-eject` P7)
 * - written once, when missing;  after that only between the markers
 */
export function skeleton(list) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHTML(list.title)}</title>
<meta name="description" content="${escapeHTML(list.description)}" />
<link rel="stylesheet" href="/_epic/assets/spell-doc.css" />
</head>
<body class="spell-doc-page">
<spell-site-header></spell-site-header>
<div class="spell-doc">
<main class="spell-doc-main">
<ui-breadcrumbs class="spell-crumbs" size="small" aria-label="Breadcrumb">
<ui-breadcrumb link="/pages/index.html" target="_self">Spell Epic</ui-breadcrumb>
<ui-breadcrumb selected>${escapeHTML(list.title)}</ui-breadcrumb>
</ui-breadcrumbs>
<ui-sticky class="spell-h1"><header class="spell-page-head"><h1>${escapeHTML(list.title)}</h1></header></ui-sticky>
<p class="lede">${list.lede}</p>
${START}
${END}
${list.extra ?? ""}
</main>
</div>
<script src="/_epic/assets/highlight.min.js"></script>
<script src="/_epic/assets/spell-ui.js"></script>
</body>
</html>
`
}

/**
 * A list page's section:  a `<ui-section>` with the list's icon, and a card per page.
 * - id and header:  `list.section`'s when it has one (Brand:  its index has sections of its own), else the list's
 * - Epics:  ALWAYS its `<epic-list>` (`spell/epic/list/EpicCards` `epicListHtml()`), which groups, sorts and filters
 *   its cards itself;  each card starred as `favorites` says (the starred epics' names) and naming its saga (`sagas`:
 *   the list, `readSagas()`);  the page server adds the running epics' cards between its markers
 * - Guides:  a section per saga, then Misc (`guideSections()`);  Sagas:  a card per saga (`sagaSection()`)
 * - open, not `open="false"`:  the list IS the page
 */
export function listSection(list, pages, favorites = readFavorites(), sagas = readSagas()) {
  const epics = list.id === "epics"
  const from = pagePath(list.dir)
  if (list.id === "guides") return guideSections(list, pages, sagas)
  if (list.id === "sagas") return sagaSection(list, pages, sagas)
  const cards = [...pages, ...(list.made?.() ?? [])]
  const body = epics
    ? epicListHtml(
        pages.map((page) => epicCard(page, from, favorites, sagas)),
        sagas
      )
    : cards.length
      ? `<ui-cards class="spell-grid" stackable>\n${cards.map((page) => card(page, from)).join("\n")}\n</ui-cards>`
      : `<p class="meta">${escapeHTML(list.none)}</p>`
  const section = list.section ?? { id: list.id, title: list.title }
  return `<ui-section id="${section.id}" label="${escapeHTML(section.title)}" sticky collapsible dividing>
<ui-icon slot="icon" name="${list.icon}"></ui-icon>
${body}
</ui-section>`
}

/**
 * The Guides page's sections (epic `epic-workflow` P15):
 * - one per saga, in `sagas`' order
 *   - headed by the saga's title, linking its saga page (`sagas/<id>/<id>.saga.html`, made or not yet)
 *   - its purpose under it
 * - then "Misc", for the guides that name no saga, or one that isn't in the list
 * - a guide's saga:  its `<meta name="spell-saga" content="<id>">` (`describe()`'s `saga`)
 * - each section's id `saga-<id>`, Misc's `misc`:  the toolbar lists the sagas
 * - a saga with no guides yet says so
 */
export function guideSections(list, pages, sagas) {
  if (!pages.length) return `<p class="meta">${escapeHTML(list.none)}</p>`
  const from = pagePath(list.dir)
  const ids = new Set(sagas.map((saga) => saga.id))
  const cards = (mine) =>
    mine.length
      ? `<ui-cards class="spell-grid" stackable>\n${mine.map((page) => card(page, from)).join("\n")}\n</ui-cards>`
      : `<p class="meta">No guides name this saga yet.</p>`
  const sections = sagas.map((saga) => {
    const link = `<a href="${escapeHTML(href(Sagas.pageOf(saga.id), from))}">${escapeHTML(saga.title)}</a>`
    return `<ui-section id="saga-${saga.id}" sticky collapsible dividing>
<ui-icon slot="icon" name="bullseye"></ui-icon>
<span slot="label">${link}</span>
<p class="meta">${escapeHTML(saga.purpose)}</p>
${cards(pages.filter((page) => page.saga === saga.id))}
</ui-section>`
  })
  const misc = pages.filter((page) => !page.saga || !ids.has(page.saga))
  return [
    ...sections,
    `<ui-section id="misc" label="Misc" sticky collapsible dividing>
<ui-icon slot="icon" name="folder"></ui-icon>
<p class="meta">Guides that serve no one saga.</p>
${misc.length ? cards(misc) : `<p class="meta">None.</p>`}
</ui-section>`
  ].join("\n")
}

/**
 * The Sagas page's one section:  a card per saga, in `sagas`' order:  its title linking its saga page (made or not
 * yet), its purpose, and how many epics and guides name it (of `pages`, every page `describe()`d).
 */
export function sagaSection(list, pages, sagas) {
  const from = pagePath(list.dir)
  const count = (id, area) => pages.filter((page) => page.path.startsWith(`${area}/`) && page.saga === id).length
  const body = sagas.length
    ? `<ui-cards class="spell-grid" stackable>\n${sagas
        .map((saga) => {
          const page = Sagas.pageOf(saga.id)
          const counts = [plural(count(saga.id, "epics"), "epic"), plural(count(saga.id, "guides"), "guide"), page]
          return `<ui-card id="${saga.id}"><ui-content>
<ui-header><ui-icon name="bullseye"></ui-icon> <a href="${escapeHTML(href(page, from))}">${escapeHTML(saga.title)}</a></ui-header>
<ui-description>${escapeHTML(saga.purpose)}</ui-description>
<ui-meta>${escapeHTML(counts.join(" · "))}</ui-meta>
</ui-content></ui-card>`
        })
        .join("\n")}\n</ui-cards>`
    : `<p class="meta">${escapeHTML(list.none)}</p>`
  return `<ui-section id="${list.id}" label="${escapeHTML(list.title)}" sticky collapsible dividing>
<ui-icon slot="icon" name="${list.icon}"></ui-icon>
${body}
</ui-section>`
}

/** The starred epics' names (`FAVORITES_FILE`, shared;  its old `.json` too);  none when it's missing or won't read. */
export function readFavorites() {
  try {
    return favoritesIn(DataFile.read(join(CONTENT, FAVORITES_FILE)))
  } catch {
    return new Set()
  }
}

/**
 * Page path `path` as a link from folder `from` (a list page's):  its root path, `/guides/solid/solid-2.html`;  one in
 * the list page's own folder by its name (epic `epic-engine` P46, Q1)
 */
function href(path, from) {
  return dirname(path) === from ? basename(path) : `/${path}`
}

/** A page's card, on the list page in folder `from`:  linked title, description, path. */
function card(page, from) {
  const title = escapeHTML(page.title)
  // no path:  nothing to open, its command says how it's used
  const header = page.path ? `<a href="${escapeHTML(href(page.path, from))}">${title}</a>` : title
  return `<ui-card><ui-content>
<ui-header>${header}</ui-header>
${page.description ? `<ui-description>${escapeHTML(page.description)}</ui-description>` : ""}
<ui-meta>${escapeHTML(page.path ?? page.command)}</ui-meta>
</ui-content></ui-card>`
}

/**
 * The templates only a command makes a page from, as cards:  a Feature Set's.
 * - no path:  it's the tool's own, not served, and never copied
 * - its words:  the template's own title and description
 */
function madeTemplates() {
  const { document } = parseHTML(readFileSync(join(TOOL_TEMPLATES, `${FEATURE_SET}.html`), "utf8"))
  return [
    {
      title: document.querySelector("title").textContent,
      description: document.querySelector('meta[name="description"]').getAttribute("content"),
      command: `epic ask create <slug> --template ${FEATURE_SET} --from <data.json5>`
    }
  ]
}

/**
 * An epic's card, on the list page in folder `from`, with the group it goes in (`spell/epic/list/EpicCards`
 * `epicCardHtml()`):  the state's mark, linked title, description, the active phase in the meta line, the star
 * (`favorites`:  the starred epics' names), the last-worked date, its saga's label (`sagas`:  the list).
 * - SAME markup as `RunningEpics`' running cards (`spell/epic/list/RunningEpics`):  both write them with
 *   `epicCardHtml()`
 */
function epicCard(page, from, favorites, sagas = []) {
  const name = page.path.split("/")[1]
  const active = page.phases.find((phase) => phase.status === "active")
  const saga = sagas.find((each) => each.id === page.saga)
  return epicCardHtml({
    name,
    title: page.title,
    href: href(page.path, from),
    description: page.description,
    meta: `${active ? `${active.label} · ` : ""}${page.path}`,
    facts: epicFacts(page),
    worked: page.worked,
    favorite: favorites.has(name),
    saga
  })
}
