/*
 * Entry of `commands.js`:  command reference pages (`templates/commands.html`, e.g. `dev/commands/commands.html`):  draws the page's tables
 * from the JSON beside it, then boots the docs bundle.
 * - Loaded INSTEAD of `spell-ui.js`:  it fetches, draws, then adds `spell-ui.js` (same folder), whatever happened
 *   (`drawThenBoot()`).
 * - The data:  `<page>.json5` (`body[data-commands]` overrides), fetched, so the page needs the PAGE SERVER
 *   (`epic pages open <page>`);  from `file://` it shows a notice where the tables go.
 *   - JSON5, read by the kit's `parseJSON5()`;  its old name, `<page>.json`, fetched when there's no `.json5` yet
 * - JSON:  `{ families: [{ id, title, icon?, intro?, rows: [Row] }] }` (a family `id` shares the page's id space:  never
 *   reuse a hand-written section's);  `Row`:
 *   - `op` -- the operation, in words;  `id?` -- anchor, default `<family id>-<slug of op>`
 *   - `cli`, `skill`, `yarn` -- `{ mark, names?, note? }`:  `mark` one of `same` (✓, under the shared name),
 *     `other` (≈, another name), `could` (○, doesn't but could), `no` (—, couldn't really);  `names` the commands:
 *     `spell compile`, `/epic`, `<package> <script>` (`root plan-doc`, `ui gen:icons`)
 *   - `runs` -- the tool doing the work (`src/window.mjs`, `status.py`, `prose`);  `target`, `notes` -- text
 *   - in `target`, a roadmap id in parens, `(R3)`, links to `#r3`:  the page's roadmap rows carry those ids
 *   - text fields:  `` `code` `` becomes `<code>`;  everything else is plain text, never markup
 * - `sources` (top level, optional):  what `spell commands` counts:  `userSkills` (in `~/.claude/skills`),
 *   `ignore` (commands that need no row);  ignored here
 * - Built from elements (`el()`), never from markup in strings (epic `epic-engine` P3):  Spell UI's own, as a page
 *   writes them (`<ui-section>`, `<ui-table>` round a real `<table>`, `<ui-statistic>`, `<ui-message>`), in the
 *   page's light DOM, so the runtime's contents, sticky titles, table widths and comment anchors take them as
 *   hand-written ones
 * - Placeholders the template holds, all optional:
 *   - `[data-commands-families]`:  REPLACED by one nested `<ui-section data-commands-family>` per family, numbered
 *     after its parent section
 *     - the sections take its place, so they're its section's children, as a page writes nested sections:  inside the
 *       placeholder's box they took the reading column's indent twice (epic `epic-engine` P3, I31)
 *   - `[data-commands-stats]` (a `ui-statistics`)
 *   - `[data-commands-filter]` (a `ui-input`):  hides rows without every typed word
 * - BUNDLED (epic `coherence` C12):  `node src/tools/bundle-spell-ui.js --data-pages` builds it into `commands.js`, a
 *   classic script with NO Spell UI in it (the page's `spell-ui.js` draws the `<ui-*>` markup);  edit THIS, never
 *   the bundle.  It imports the helpers that exist:  the docs helpers' `el()` and start, the kit's `slug()` and
 *   `parseJSON5()`.
 */
import { slug } from "spell/util/string"
import { parseJSON5 } from "spell/util/spell/json"

import { dataNotice, drawThenBoot, el, fetchFile, pagePath, sectionNumber, withCode } from "./spell-doc-helpers.js"

/** Cell marks:  the sign shown, the table cell's verdict class, the legend's words. */
const MARKS = {
  same: { sign: "✓", cls: "yes positive", words: "does it, shared name" },
  other: { sign: "≈", cls: "meh warning", words: "does it, other name" },
  could: { sign: "○", cls: "", words: "doesn't, but could" },
  no: { sign: "—", cls: "no negative", words: "couldn't really" }
}
/** Surface columns, in order:  JSON key, header. */
const SURFACES = [
  ["cli", "CLI"],
  ["skill", "skill"],
  ["yarn", "yarn"]
]

void drawThenBoot(load, draw, (error) => notice(`Couldn't draw the tables:  ${error.message}`))

////////////////
// ## Start
////////////////

/** The page's data, or `undefined` after showing why not. */
async function load() {
  const file =
    document.body.dataset.commands || location.pathname.replace(/[^/]*$/, (name) => name.replace(/\.html?$/, ".json5"))
  if (location.protocol === "file:") {
    notice(
      `This page draws its tables from ${file.split("/").pop()}:  open it through the page server, e.g. \`epic pages open ${pagePath()}\`.`
    )
    return undefined
  }
  // not renamed yet (`epic migrate`):  its old name
  const text = (await fetchFile(file)) ?? (file.endsWith(".json5") ? await fetchFile(file.slice(0, -1)) : undefined)
  if (text === undefined) throw new Error(`${file}:  not found`)
  return parseJSON5(text, file)
}

////////////////
// ## Drawing
////////////////

/** Fill every placeholder from `data`. */
function draw(data) {
  const families = data.families ?? []
  const holder = document.querySelector("[data-commands-families]")
  if (holder) {
    const number = sectionNumber(holder.closest("ui-section"))
    holder.replaceWith(...families.map((each, i) => family(each, number ? `${number}.${i + 1} ` : "")))
  }
  const stats = document.querySelector("[data-commands-stats]")
  if (stats) stats.replaceChildren(...statistics(families))
  const filter = document.querySelector("[data-commands-filter]")
  if (filter) wireFilter(filter)
}

/** One family:  a nested `<ui-section>` with its table. */
function family(each, prefix) {
  const head = el("tr", {}, el("th", {}, "operation"), ...SURFACES.map(([, label]) => el("th", {}, label)))
  head.append(el("th", {}, "runs"), el("th", {}, "target"))
  return el(
    "ui-section",
    {
      id: each.id,
      label: prefix + each.title,
      sticky: "",
      collapsible: "",
      dividing: "",
      "data-commands-family": ""
    },
    each.icon ? el("ui-icon", { slot: "icon", name: each.icon }) : "",
    each.intro ? el("p", {}, ...withCode(each.intro)) : "",
    el(
      "ui-table",
      { celled: "", padding: "compact", appearance: "striped", unstackable: "" },
      el("table", {}, el("thead", {}, head), el("tbody", {}, ...(each.rows ?? []).map((row) => operation(each, row))))
    )
  )
}

/** One operation's row;  its notes go under the operation. */
function operation(each, row) {
  return el(
    "tr",
    { id: row.id ?? `${each.id}-${slug(row.op)}` },
    el("td", {}, el("b", {}, ...withCode(row.op)), row.notes ? notes(row.notes) : ""),
    ...SURFACES.map(([key]) => surface(row[key])),
    el("td", {}, ...withCode(row.runs ?? "")),
    el("td", {}, ...withCode(row.target ?? "", roadmapLinks))
  )
}

/** One surface's cell:  its mark, the names, the note. */
function surface(cell) {
  if (!cell) return el("td")
  const mark = MARKS[cell.mark] ?? { sign: "?", cls: "", words: "" }
  const verdict = mark.cls ? { class: mark.cls, title: mark.words } : { title: mark.words }
  return el("td", verdict, `${mark.sign} `, ...names(cell.names), cell.note ? notes(cell.note) : "")
}

/** A note under a cell's text, small and grey. */
function notes(value) {
  return el("div", { class: "commands-notes" }, ...withCode(value))
}

/**
 * Names as code, comma-separated, yarn's grouped by script:  `ts` (app, cli, core) rather than 3 `<package> ts`s.
 * - a name of two words whose second has no space and isn't a CLI's (`spell ...`) is `<package> <script>`
 */
function names(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : [value]
  const byScript = new Map()
  const plain = []
  for (const name of list) {
    const words = name.split(" ")
    if (words.length === 2 && words[0] !== "spell" && !name.startsWith("/")) {
      if (!byScript.has(words[1])) byScript.set(words[1], [])
      byScript.get(words[1]).push(words[0])
    } else plain.push([el("code", {}, name)])
  }
  const grouped = [...byScript].map(([name, packages]) => [
    el("code", {}, name),
    " ",
    el("span", { class: "commands-where" }, `(${packages.join(", ")})`)
  ])
  return [...plain, ...grouped].flatMap((parts, i) => (i ? [", ", ...parts] : parts))
}

/** Headline numbers:  operations, families, and how many each surface does. */
function statistics(families) {
  const rows = families.flatMap((each) => each.rows ?? [])
  return [
    [rows.length, "operations"],
    [does("cli"), "in the CLI"],
    [does("skill"), "in a skill"],
    [does("yarn"), "in yarn"]
  ].map(([value, label]) => el("ui-statistic", { value, label }))

  /** How many rows surface `key` does, under either name. */
  function does(key) {
    return rows.filter((row) => ["same", "other"].includes(row[key]?.mark)).length
  }
}

/** Show `message` where the tables go (or at the top of `main`). */
function notice(message) {
  dataNotice(document.querySelector("[data-commands-families]"), "Tables not drawn", message)
}

////////////////
// ## Filter
////////////////

/**
 * Hide the rows without every typed word, and the families left empty.
 * - reads the value from the events' `detail`:  during `ui-input` the element's `value` is still the old one
 */
function wireFilter(input) {
  input.addEventListener("ui-typed", apply)
  input.addEventListener("ui-changed", apply)

  /** Apply the filter in `event`. */
  function apply(event) {
    const words = String(event.detail?.value ?? input.value ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    for (const section of document.querySelectorAll("ui-section[data-commands-family]")) {
      let shown = 0
      for (const row of section.querySelectorAll("tbody tr")) {
        const content = row.textContent.toLowerCase()
        row.hidden = !words.every((word) => content.includes(word))
        if (!row.hidden) shown++
      }
      section.hidden = shown === 0
    }
  }
}

////////////////
// ## Text
////////////////

/** `part` with each roadmap id in parens, `(R3)`, linked to its row, `#r3`. */
function roadmapLinks(part) {
  return part
    .split(/\((R\d+)\)/)
    .flatMap((piece, i) => (i % 2 ? ["(", el("a", { href: `#${piece.toLowerCase()}` }, piece), ")"] : [piece]))
}
