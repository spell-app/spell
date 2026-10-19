/*
 * Command reference pages (`templates/commands.html`, e.g. `dev/commands/commands.html`):  draws the page's tables
 * from the JSON beside it, then boots the docs bundle.
 * - Loaded INSTEAD of `spell-ui.js`:  the runtime builds the contents sidebar, the rail and the sticky titles from
 *   `main`'s sections once, at start, so the families must be in the page before it runs.  This script fetches,
 *   draws, then adds `spell-ui.js` (same folder), whatever happened.
 * - The data:  `<page>.json5` (`body[data-commands]` overrides), fetched, so the page needs the PAGE SERVER
 *   (`spell dev docs open <page>`);  from `file://` it shows a notice where the tables go.
 *   - JSON5's JSON-compatible part, comments and trailing commas allowed (`parseData()`;  epic `epic-workflow` P21);
 *     its old name, `<page>.json`, fetched when there's no `.json5` yet
 * - JSON:  `{ families: [{ id, title, icon?, intro?, rows: [Row] }] }` (a family `id` shares the page's id space:  never
 *   reuse a hand-written section's);  `Row`:
 *   - `op` -- the operation, in words;  `id?` -- anchor, default `<family id>-<slug of op>`
 *   - `cli`, `skill`, `yarn` -- `{ mark, names?, note? }`:  `mark` one of `same` (✓, under the shared name),
 *     `other` (≈, another name), `could` (○, doesn't but could), `no` (—, couldn't really);  `names` the commands:
 *     `spell compile`, `/epic`, `<package> <script>` (`root plan-doc`, `ui gen:icons`)
 *   - `runs` -- the tool doing the work (`src/window.mjs`, `status.py`, `prose`);  `target`, `notes` -- text
 *   - in `target`, a roadmap id in parens, `(R3)`, links to `#r3`:  the page's roadmap rows carry those ids
 *   - text fields:  `` `code` `` becomes `<code>`;  everything else is plain text, never markup
 * - `sources` (top level, optional):  what `spell dev commands` counts:  `userSkills` (in `~/.claude/skills`),
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
 * - Classic script, no imports:  same rule as every docs asset.
 */
;(function () {
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
  const script = document.currentScript
  const bundle = new URL("spell-ui.js", script.src).href

  void start()

  ////////////////
  // ## Start
  ////////////////

  /** Draw from the JSON (or the notice), then boot the bundle. */
  async function start() {
    try {
      const data = await load()
      if (data) draw(data)
    } catch (error) {
      notice(`Couldn't draw the tables:  ${error.message}`)
    }
    const tag = document.createElement("script")
    tag.src = bundle
    document.body.append(tag)
  }

  /** The page's data, or `undefined` after showing why not. */
  async function load() {
    const file =
      document.body.dataset.commands ||
      location.pathname.replace(/[^/]*$/, (name) => name.replace(/\.html?$/, ".json5"))
    if (location.protocol === "file:") {
      notice(
        `This page draws its tables from ${file.split("/").pop()}:  open it through the page server, e.g. \`spell dev docs open ${pagePath()}\`.`
      )
      return undefined
    }
    let response = await fetch(file, { cache: "no-store" })
    // not renamed yet (`epic migrate`):  its old name
    if (response.status === 404 && file.endsWith(".json5"))
      response = await fetch(file.slice(0, -1), { cache: "no-store" })
    if (!response.ok) throw new Error(`${file}:  ${response.status} ${response.statusText}`)
    return parseData(await response.text())
  }

  /**
   * The text of a JSON5 data file in its JSON-compatible part (keys and text in double quotes), as data:  its
   * comments and trailing commas dropped (never inside a string), then plain `JSON.parse()`.  Throws as it does.
   */
  function parseData(text) {
    const withoutComments = outsideStrings(text, (rest) => {
      if (rest.startsWith("//")) return rest.indexOf("\n") === -1 ? rest.length : rest.indexOf("\n")
      if (rest.startsWith("/*")) return rest.indexOf("*/") === -1 ? rest.length : rest.indexOf("*/") + 2
      return 0
    })
    return JSON.parse(outsideStrings(withoutComments, (rest) => (/^,\s*[}\]]/.test(rest) ? 1 : 0)))
  }

  /** `text` without what `cut(rest)` says to cut (how many characters, at each place outside a string). */
  function outsideStrings(text, cut) {
    let out = ""
    for (let at = 0; at < text.length;) {
      if (text[at] === '"') {
        let end = at + 1
        while (end < text.length && text[end] !== '"') end += text[end] === "\\" ? 2 : 1
        out += text.slice(at, end + 1)
        at = end + 1
        continue
      }
      const skip = text[at] === "/" || text[at] === "," ? cut(text.slice(at)) : 0
      if (skip) at += skip
      else out += text[at++]
    }
    return out
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
        header: prefix + each.title,
        sticky: "",
        collapsible: "",
        dividing: "",
        "data-commands-family": ""
      },
      each.icon ? el("ui-icon", { slot: "icon", name: each.icon }) : "",
      each.intro ? el("p", {}, ...withCode(each.intro)) : "",
      el(
        "ui-table",
        { celled: "", compact: "", striped: "", unstackable: "" },
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
    const holder = document.querySelector("[data-commands-families]") ?? document.querySelector("main")
    holder?.prepend(
      el("ui-message", { state: "warning", header: "Tables not drawn" }, el("p", {}, ...withCode(message)))
    )
  }

  ////////////////
  // ## Filter
  ////////////////

  /**
   * Hide the rows without every typed word, and the families left empty.
   * - reads the value from the events' `detail`:  during `ui-input` the element's `value` is still the old one
   */
  function wireFilter(input) {
    input.addEventListener("ui-input", apply)
    input.addEventListener("ui-change", apply)

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

  /**
   * `value` as nodes:  its `` `code` `` spans as `<code>`, the rest as text, each text part through `plain()`
   * (default:  as it is).
   */
  function withCode(value, plain = (part) => [part]) {
    return String(value)
      .split("`")
      .flatMap((part, i) => (i % 2 ? [el("code", {}, part)] : plain(part)))
      .filter((part) => part !== "")
  }

  /** `part` with each roadmap id in parens, `(R3)`, linked to its row, `#r3`. */
  function roadmapLinks(part) {
    return part
      .split(/\((R\d+)\)/)
      .flatMap((piece, i) => (i % 2 ? ["(", el("a", { href: `#${piece.toLowerCase()}` }, piece), ")"] : [piece]))
  }

  /** A new `tag` with `attributes`, holding `children` (nodes or text;  `""` skipped):  as `spell-syntax.js`'s. */
  function el(tag, attributes = {}, ...children) {
    const node = document.createElement(tag)
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)
    node.append(...children.filter((child) => child !== ""))
    return node
  }

  /** `value` as an id:  lowercase words joined by dashes. */
  function slug(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  /** The leading number of `section`'s header (`2` for "2. Operations"), or "". */
  function sectionNumber(section) {
    return /^\s*(\d+(?:\.\d+)*)\.?\s/.exec(section?.getAttribute("header") ?? "")?.[1] ?? ""
  }

  /** This page's path from the checkout's root (`guides/...`), for the notice's command. */
  function pagePath() {
    return decodeURIComponent(location.pathname).replace(/^.*\/(?=(?:guides|epics|templates|pages)\/)/, "")
  }
})()
