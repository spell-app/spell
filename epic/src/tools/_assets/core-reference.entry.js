/*
 * Entry of `core-reference.js`:  the core reference page (`guides/targets/core-reference.html`, epic `python-target` P29):
 * draws every name the javascript core offers, file by file,
 * with Python's name for each and whether spell_core has it yet;  then boots the docs bundle.
 * - Loaded INSTEAD of `spell-ui.js`, as `commands.js` is:  it fetches, draws, then adds `spell-ui.js` (same folder),
 *   whatever happened (`drawThenBoot()`).
 * - The data:  two JSON files, fetched from the checkout SERVING the page,
 *   so the page shows that checkout's core and can't go stale.
 *   Their paths are relative to the page, in `<body>`'s data attributes:
 *   - `data-core-declarations`:  `spell-parser/src/core/core.declarations.json5`, the core's method list
 *     (`yarn core:gen:declarations` in spell-parser, `coreDeclarations.ts`);  `{ provides, statements: [Statement] }`
 *   - `data-not-ported`:  `spell-parser/src/py/core/not_ported_yet.json5`, what spell_core doesn't have yet;
 *     `{ about, groups: [{ why, names: [javascript name] }] }`.  Optional:  without it the Python column says "?"
 * - `Statement`, by its keys:
 *   - a method of `core`:  `{ kind: "method", name, of, module, params?: [{ name }], section?, description? }`
 *   - a property of `core`:  `{ property, of, module, section?, description? }`
 *   - a class compiled code imports:  `{ type, superType?, module, description? }`
 *   - a function compiled code imports:  `{ kind: "function", name, module, params?, description? }`
 *   - `module`:  the core's file under `spell-parser/src/core/`, without `.ts` (`classes` is `classes/index.ts`);
 *     `section`:  the `// ## Heading` it's under there
 * - Python's names, as spell-parser's `tests/py/core/tests/test_core_declarations.py` checks them:
 *   `snakeCase()` of the javascript name
 *   - a member is `core.get_item_at()`
 *   - a class keeps its name (`spell_core.Thing`)
 * - Placeholders the page holds, all optional:
 *   - `[data-core-stats]` (a `ui-statistics`)
 *   - `[data-core-modules]`:  REPLACED by one nested `<ui-section data-core-module>` per file, numbered after its
 *     parent section, each a table with a sub-heading row per heading of the file (`headingRuns()`)
 *     - the sections take its place, so they're its section's children, as a page writes nested sections:  inside the
 *       placeholder's box they took the reading column's indent twice (epic `epic-engine` P3)
 *   - `[data-core-filter]` (a `ui-input`):  hides rows without every typed word
 *   - `[data-core-not-ported]`:  spell_core's missing names, by why, each linked to its row
 * - Built from elements (`el()`), never from markup in strings (epic `epic-engine` P3):  Spell UI's own, as a page
 *   writes them (`<ui-section>`, `<ui-table>` round a real `<table>`, `<ui-label>`, `<ui-statistic>`, `<ui-message>`,
 *   the source link a `<ui-button>`), in the page's light DOM, so the runtime's contents, sticky titles, table widths
 *   and comment anchors take them as hand-written ones
 * - From `file://` it shows a notice where the tables go:
 *   the page needs the PAGE SERVER (`epic pages open <page>`).
 * - BUNDLED (epic `coherence` C12):  `node src/tools/bundle-spell-ui.js --data-pages` builds it into
 *   `core-reference.js`, a classic script with NO Spell UI in it;  edit THIS, never the bundle.  It imports the helpers
 *   that exist:  the docs helpers' `el()`, `titleInside()` and start, the kit's `slug()`.
 */
import { slug } from "spell/util/string"

import {
  dataNotice,
  drawThenBoot,
  el,
  fetchFile,
  pagePath,
  sectionNumber,
  titleInside,
  withCode as withCodeSpans
} from "./spell-doc-helpers.js"

/** Columns of every file's table. */
const COLUMNS = ["name", "Python", "in Python", "what it does"]

void drawThenBoot(load, draw, (error) => notice(`Couldn't draw the reference:  ${error.message}`))

////////////////
// ## Start
////////////////

/**
 * Both files, as `{ declarations, notPorted? }`, or `undefined` after showing why not.
 * - throws when the core's method list can't be read;  a missing `not_ported_yet.json5` only leaves `notPorted` out
 */
async function load() {
  const { coreDeclarations, notPorted } = document.body.dataset
  if (location.protocol === "file:") {
    notice(
      `This page draws the core's method list from the checkout serving it:  open it through the page server, e.g. \`epic pages open ${pagePath()}\`.`
    )
    return undefined
  }
  if (!coreDeclarations) throw new Error("the page's `<body>` has no `data-core-declarations`")
  const [declarations, groups] = await Promise.all([
    fetchJSON(coreDeclarations),
    notPorted ? fetchJSON(notPorted).catch(() => undefined) : undefined
  ])
  return { declarations, notPorted: groups }
}

/**
 * The JSON at `path`, relative to the page;  throws on a failed response.
 * - A `.json` path is read as `.json5` first (epic `people-and-orgs` P12):  the page names the old file, which an
 *   older checkout still has, and this checkout's file is the new one.  Both hold plain JSON.
 */
async function fetchJSON(path) {
  const renamed = path.endsWith(".json") ? await fetchFile(`${path}5`, { format: "json" }) : undefined
  const found = renamed ?? (await fetchFile(path, { format: "json" }))
  if (found === undefined) throw new Error(`${path}:  not found`)
  return found
}

////////////////
// ## Drawing
////////////////

/** Fill every placeholder from `data`. */
function draw({ declarations, notPorted }) {
  const statements = declarations.statements ?? []
  const missing = missingNames(notPorted)
  const modules = byModule(statements)
  const holder = document.querySelector("[data-core-modules]")
  if (holder) {
    const number = sectionNumber(holder.closest("ui-section"))
    const sections = [...modules].map(([module, rows], i) =>
      moduleSection(module, rows, missing, number ? `${number}.${i + 1} ` : "")
    )
    holder.replaceWith(...sections)
  }
  document.querySelector("[data-core-stats]")?.replaceChildren(...statistics(statements, modules, missing))
  document.querySelector("[data-core-not-ported]")?.replaceChildren(notPortedList(statements, notPorted))
  const filter = document.querySelector("[data-core-filter]")
  if (filter) wireFilter(filter)
}

/** The statements by file, in the list's order. */
function byModule(statements) {
  const modules = new Map()
  for (const statement of statements) {
    const module = statement.module ?? "core"
    if (!modules.has(module)) modules.set(module, [])
    modules.get(module).push(statement)
  }
  return modules
}

/**
 * One file:  a nested `<ui-section>` with its table, a `<tbody>` per run of names under one heading.
 * - a link to its source file in the title bar's `actions`:  a round icon button (a phone has little room);  `tiny`,
 *   its icon 11px, as the bare icon it was before
 * - its count in the `badge`
 */
function moduleSection(module, statements, missing, prefix) {
  const file = sourceFile(module)
  const notIn = missing ? statements.filter((statement) => missing.has(jsName(statement))).length : 0
  const path = `spell-parser/src/core/${file}`
  const source = el("ui-button", {
    slot: "actions",
    appearance: "circular basic",
    size: "tiny",
    icon: "code",
    link: sourceHref(file),
    target: `src-${slug(path)}`,
    title: path,
    "aria-label": `Open ${file.split("/").pop()}`
  })
  titleInside(source)
  const bodies = headingRuns(statements).map(({ heading, rows }) =>
    el(
      "tbody",
      {},
      heading ? el("tr", {}, el("th", { colspan: String(COLUMNS.length) }, ...withCode(heading))) : "",
      ...rows.map((statement) => row(statement, missing))
    )
  )
  return el(
    "ui-section",
    {
      id: `file-${slug(module)}`,
      label: prefix + module,
      badge: notIn ? `${statements.length} · ${notIn} not in Python` : `${statements.length}`,
      sticky: "",
      collapsible: "",
      dividing: "",
      open: "false",
      "data-core-module": ""
    },
    source,
    el(
      "ui-table",
      { celled: "", padding: "compact", appearance: "striped", unstackable: "" },
      el("table", {}, el("thead", {}, el("tr", {}, ...COLUMNS.map((label) => el("th", {}, label)))), ...bodies)
    )
  )
}

/**
 * A file's names in the list's order (the file's), cut into runs under one heading:  `[{ heading, rows }]`.
 * - members of `core` under their `section`;  one without, after one with, stays under the one before
 *   - the list says no section for a few whose first declaration is above every heading:
 *     an overload, an interface's member
 * - what compiled code imports by name, classes and functions, under "imported by name"
 */
function headingRuns(statements) {
  const runs = []
  for (const statement of statements) {
    const heading = statement.of === "core" ? (statement.section ?? runs.at(-1)?.heading ?? "") : "imported by name"
    if (runs.at(-1)?.heading !== heading) runs.push({ heading, rows: [] })
    runs.at(-1).rows.push(statement)
  }
  return runs
}

/** One name's row. */
function row(statement, missing) {
  return el(
    "tr",
    { id: rowId(statement) },
    el("td", {}, ...nameParts(statement)),
    el("td", {}, el("code", {}, pythonName(statement))),
    ported(jsName(statement), missing),
    el("td", {}, ...withCode(statement.description ?? ""))
  )
}

/** The javascript name, with its parameters, and a label saying what it is unless it's a method of `core`. */
function nameParts(statement) {
  const params = statement.params ? `(${statement.params.map((param) => param.name).join(", ")})` : ""
  const kind = kindOf(statement)
  return [
    el("code", {}, jsName(statement) + (statement.kind ? params || "()" : "")),
    ...(kind === "method" ? [] : [" ", el("ui-label", { size: "mini" }, kind)]),
    ...(statement.superType ? [" extends ", el("code", {}, statement.superType)] : [])
  ]
}

/** "in Python" cell:  ✓, or ✗ with why as its tooltip;  "?" without `not_ported_yet.json5`. */
function ported(name, missing) {
  if (!missing) return el("td", { title: "this checkout has no spell-parser/src/py/core/not_ported_yet.json5" }, "?")
  const why = missing.get(name)
  if (why === undefined) return el("td", { class: "yes positive", title: "spell_core has it" }, "✓")
  return el("td", { class: "no negative", title: why }, "✗ not yet")
}

/** Headline numbers:  names, files, how many Python has and hasn't. */
function statistics(statements, modules, missing) {
  const notIn = missing ? statements.filter((statement) => missing.has(jsName(statement))).length : undefined
  return [
    [statements.length, "names"],
    [modules.size, "files"],
    [notIn === undefined ? "?" : statements.length - notIn, "in Python"],
    [notIn ?? "?", "not in Python yet"]
  ].map(([value, label]) => el("ui-statistic", { value: String(value), label }))
}

/** spell_core's missing names:  one bullet per group, its why, then its names linked to their rows. */
function notPortedList(statements, notPorted) {
  if (!notPorted)
    return el(
      "ui-message",
      { state: "warning", heading: "No list of what Python lacks" },
      el("p", {}, "This checkout has no ", el("code", {}, "spell-parser/src/py/core/not_ported_yet.json5"), ".")
    )
  const byName = new Map(statements.map((statement) => [jsName(statement), statement]))
  const items = (notPorted.groups ?? []).map((group) => {
    const names = group.names.flatMap((name, i) => {
      const statement = byName.get(name)
      const code = el("code", {}, name)
      return [i ? ", " : "", statement ? el("a", { href: `#${rowId(statement)}` }, code) : code]
    })
    return el("li", {}, ...withCode(group.why), ` (${group.names.length}):`, el("br"), ...names)
  })
  return el("ul", {}, ...items)
}

/** Show `message` where the tables go (or at the top of `main`). */
function notice(message) {
  dataNotice(document.querySelector("[data-core-modules]"), "Reference not drawn", message)
}

////////////////
// ## Names
////////////////

/** The javascript name a statement declares:  a member's, a class's or a function's. */
function jsName(statement) {
  return statement.name ?? statement.property ?? statement.type
}

/** What a statement declares, as its label says:  `method`, `property`, `class` or `import` (a function). */
function kindOf(statement) {
  if (statement.type) return "class"
  if (statement.property) return "property"
  return statement.kind === "function" ? "import" : "method"
}

/** The row's id:  unique, though a few names are both a method and an import (`positionOf`). */
function rowId(statement) {
  const kind = kindOf(statement)
  const prefix = kind === "class" ? "class" : kind === "import" ? "import" : "spellcore"
  return `${prefix}-${jsName(statement)}`
}

/**
 * Python's name for `statement`, as spell_core's test looks for it.
 * - a member of `core`:  `core.get_item_at()`, `core.time_units_map` (a constant may keep its capitals)
 * - a class:  `spell_core.Thing`;  a function compiled code imports:  `position_of()`, on `core` or the package
 */
function pythonName(statement) {
  const kind = kindOf(statement)
  if (kind === "class") return `spell_core.${statement.type}`
  const name = snakeCase(jsName(statement))
  if (kind === "property") return `core.${name}`
  return kind === "import" ? `${name}()` : `core.${name}()`
}

/**
 * `name` as Python writes it:  `getItemAt` is `get_item_at`.
 * - capitals together stay one word:  `isANumber` is `is_a_number`, `fromJSON` `from_json`
 * - a name all in capitals is lowercased:  `ACTIVE_TEST` is `active_test`
 * - SEE:  `snake_case()` in spell-parser's `tests/py/core/tests/test_core_declarations.py`, which this must match
 */
function snakeCase(name) {
  if (/^[A-Z0-9_]+$/.test(name)) return name.toLowerCase()
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
}

/** The names spell_core doesn't have yet, each to its group's why;  `undefined` without the file. */
function missingNames(notPorted) {
  if (!notPorted) return undefined
  return new Map((notPorted.groups ?? []).flatMap((group) => group.names.map((name) => [name, group.why])))
}

/** `module`'s file under `spell-parser/src/core/`:  `classes` is `classes/index.ts`. */
function sourceFile(module) {
  return module === "classes" ? "classes/index.ts" : `${module}.ts`
}

/** `file`'s link from this page:  `src/<file>` beside the core's method list, wherever the page says that is. */
function sourceHref(file) {
  return (document.body.dataset.coreDeclarations ?? "").replace(/[^/]*$/, `src/${file}`)
}

////////////////
// ## Filter
////////////////

/**
 * Hide the rows without every typed word, the sub-headings left empty, and the files left empty.
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
    for (const section of document.querySelectorAll("ui-section[data-core-module]")) {
      let shown = 0
      for (const body of section.querySelectorAll("tbody")) {
        let inBody = 0
        for (const row of body.querySelectorAll("tr:has(td)")) {
          const content = row.textContent.toLowerCase()
          row.hidden = !words.every((word) => content.includes(word))
          if (!row.hidden) inBody++
        }
        const head = body.querySelector("tr:not(:has(td))")
        if (head) head.hidden = inBody === 0
        shown += inBody
      }
      section.hidden = shown === 0
    }
  }
}

////////////////
// ## Text
////////////////

/**
 * `value` as nodes:  its `` `code` `` spans (and a flattened ```` ```lang ...``` ```` block) as `<code>`, the rest as
 * text, never markup.
 */
function withCode(value) {
  return withCodeSpans(String(value).replace(/```(?:[a-z]+\s)?([\s\S]*?)```/g, (_, code) => `\`${code.trim()}\``))
}
