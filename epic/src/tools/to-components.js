/**
 * A page's CONTENTS in components, not hand-written markup:  the migration step `components-not-markup`
 * (epic `epic-engine` P3, Owen on I26, 2026-10-19:  "page controls AND contents" are components).
 * - a bare `<table>` (no `<ui-table>` around it) gets one, the house comparison table's:
 *   `<ui-table celled padding="compact" appearance="striped" unstackable>`, the table inside it unchanged (its id too)
 * - a `<ui-table>` without `unstackable` gets it, its other attributes as they were (epic `epic-engine` I36;  Owen,
 *   2026-10-19, on a table drawn as its header cells, then each row's cells one under another:  "I hate it"):  no
 *   table ever stacks.  `spell-doc.css` holds them all unstacked anyway;  this keeps the page true without it.
 *   - one that asks to stack (`stackable`, `stack-by`) is left, and listed:  a demo of stacking
 * - a `<details>` aside (its first child a `<summary>`) becomes the house aside, the durable template's:
 *   `<ui-accordion class="spell-aside" appearance="styled">` > `<ui-title>` (the summary's contents) + `<ui-content>` (the rest)
 *   - just a code block in it:  `class="spell-code"`, as every folded code block is
 *   - its `id` and classes kept
 *   - folded, as every aside starts (src/AGENTS.md, "Sections"):  an `open` one is listed (`opened`)
 * - LEFT for a person, each listed (`left`), never guessed at:
 *   - a table with its own `class`, `style` or `role`:  which `<ui-table>` look it wants is a call
 *   - a `<details>` with other attributes, a `<summary>` with any, or no `<summary>` first
 *   - either one inside an `<epic-*>` element that reads its children (`READS_CHILDREN`)
 *   - every one on a page that runs its own script, or styles tables or asides itself (`ownCode()`):
 *     moving them into an element could break what it selects (`main > table`)
 * - not looked at:  examples, not content (in a `<template>`, `<pre>`, `<code>`, an `<svg>`, `<ui-code>` ...)
 * - NOT the step's:
 *   - a page's own `<button>`s:  its own script wires them
 *   - the markup the TOOLS draw (the epics list's cards, the commands tables):  their own code becomes elements
 *   - a heading outside `<ui-section>`:  where its section ends is a call (none left in the docs, 2026-10-19)
 * - idempotent:  a converted table is in a `<ui-table>`, a converted aside is no `<details>`
 * - on a parsed page (linkedom), elements made with `answerPages.js`' `make()`, never strings
 */
import { make } from "./answerPages.js"

/** The house comparison table's flags (src/AGENTS.md, "Writing a page"). */
const TABLE_FLAGS = { celled: true, padding: "compact", appearance: "striped", unstackable: true }

/** Where a table or `<details>` is an example or data, not the page's content:  never looked at. */
const NOT_CONTENT = "template, pre, code, svg, textarea, noscript, ui-code, ui-markdown, ui-include, epic-code"

/** The epics pack's elements that hold prose in a slot:  a table or aside in one is the page's own. */
const PROSE_ELEMENTS = new Set(["epic-aside", "epic-field", "epic-section", "epic-question", "epic-option"])

/** The engine's own scripts:  they draw the page's chrome, never select its tables or asides. */
const ENGINE_SCRIPT = /^\/_epic\/assets\/(spell-ui|highlight\.min|spell-comments)\.js$/

/** A `<script type>` that holds data, not code (`text/markdown`, `application/json` ...). */
const DATA_SCRIPT = /^(text\/(?!javascript)|application\/(ld\+)?json$|importmap$|speculationrules$)/i

/** Page CSS that styles what the step moves. */
const STYLES_THEM = /\b(table|details|summary)\b/

/** A `<ui-table>` that asks to stack:  left as it is. */
const STACKS = "[stackable], [stack-by]"

/** Is there anything for the step on page `html`? */
export function hasMarkup(html) {
  return /<(table|details)\b/i.test(html)
}

/**
 * Convert `document`'s bare tables and `<details>` asides in place, and make its `<ui-table>`s unstackable;  what it
 * did:  `{ tables, unstacked, asides, opened, left }`:  `opened` the asides that started open, `left` a line per one
 * left for a person.
 */
export function convertMarkup(document) {
  const { unstacked, left } = unstackTables(document)
  const report = { tables: 0, unstacked, asides: 0, opened: [], left }
  const tables = [...document.querySelectorAll("table")].filter((table) => !table.closest("ui-table"))
  const asides = [...document.querySelectorAll("details")]
  const found = [...tables, ...asides].filter((element) => !element.closest(NOT_CONTENT))
  if (!found.length) return report
  const own = ownCode(document)
  if (own) {
    for (const element of found) report.left.push(`${describe(element)}:  the page ${own}`)
    return report
  }
  for (const element of found) {
    const reader = readerOf(element)
    const why = reader
      ? `in <${reader}>, which reads its children`
      : element.matches("table")
        ? tableCall(element)
        : asideCall(element)
    if (why) report.left.push(`${describe(element)}:  ${why}`)
    else if (element.matches("table")) {
      wrapTable(document, element)
      report.tables++
    } else {
      if (element.hasAttribute("open")) report.opened.push(describe(element))
      convertAside(document, element)
      report.asides++
    }
  }
  return report
}

/**
 * Every `<ui-table>` under `root` (a page, or a snippet's box) without `unstackable`:  given it, IN PLACE (epic
 * `epic-engine` I36).  What it did:  `{ unstacked, left }`, `left` a line per table that asks to stack.
 * - ONE rule for every page kind:  this step's, the epic page's step (`UnstackableTables`) and the epic tool's way
 *   in (`IncomingHtml`)
 * - an attribute, so nothing a script selects moves:  on a page that runs its own too
 * - not in an example (`NOT_CONTENT`)
 */
export function unstackTables(root) {
  const report = { unstacked: 0, left: [] }
  for (const table of root.querySelectorAll("ui-table:not([unstackable])")) {
    if (table.closest(NOT_CONTENT)) continue
    if (table.matches(STACKS)) report.left.push(`${describe(table)}:  asks to stack (a demo of stacking?)`)
    else {
      addLast(table, "unstackable")
      report.unstacked++
    }
  }
  return report
}

/**
 * Give `element` the boolean attribute `name`, AFTER its others (`<ui-table padding="compact" celled unstackable>`), as a
 * person adds a word.
 * - linkedom puts each new attribute FIRST (`make()`):  there they're all set again, backwards;  a browser's DOM
 *   adds it last already
 */
function addLast(element, name) {
  element.setAttribute(name, "")
  if (element.attributes[0]?.name !== name) return
  const kept = [...element.attributes].slice(1).map((attribute) => [attribute.name, attribute.value])
  for (const [old] of kept) element.removeAttribute(old)
  for (const [each, value] of kept.reverse()) element.setAttribute(each, value)
}

/** Why table `table` is left for a person, if it is. */
function tableCall(table) {
  const own = ["class", "style", "role"].filter((name) => table.hasAttribute(name))
  return own.length ? `its own ${own.join(", ")} (which <ui-table> look?)` : undefined
}

/** Why `<details>` `details` is left for a person, if it is. */
function asideCall(details) {
  const summary = details.firstElementChild
  if (!summary?.matches("summary")) return "no <summary> first"
  if (details.querySelectorAll(":scope > summary").length > 1) return "two <summary>s"
  const extra = [...details.attributes]
    .map(({ name }) => name)
    .filter((name) => !["id", "class", "open"].includes(name))
  if (extra.length) return `its own ${extra.join(", ")}`
  if (summary.attributes.length) return "a <summary> with attributes"
  return undefined
}

/**
 * Table `table` in a `<ui-table>`, in its place;  the table itself untouched.
 * - a line break and the table's indent around it inside, so the formatter lays it out as the rest
 */
function wrapTable(document, table) {
  const indent = indentBefore(table)
  const wrap = make(document, "ui-table", TABLE_FLAGS)
  table.replaceWith(wrap)
  wrap.append(...(indent === undefined ? [table] : [`\n${indent}  `, table, `\n${indent}`]))
}

/**
 * `<details>` `details` as the house aside, in its place:  every child node kept, in order.
 * - the white space between the summary and the rest goes between `<ui-title>` and `<ui-content>`, and the last
 *   child's after `<ui-content>`:  laid out as an aside written by hand
 */
function convertAside(document, details) {
  const summary = details.firstElementChild
  const before = []
  for (let node = details.firstChild; node !== summary; node = node.nextSibling) before.push(node)
  const rest = []
  for (let node = summary.nextSibling; node; node = node.nextSibling) rest.push(node)
  const blocks = rest.filter((node) => !isSpace(node))
  const kind = blocks.length === 1 && blocks[0].matches?.("pre") ? "spell-code" : "spell-aside"
  const classes = [kind, ...(details.getAttribute("class") ?? "").split(/\s+/)].filter(
    (name, index, all) => name && all.indexOf(name) === index
  )
  const accordion = make(document, "ui-accordion", {
    id: details.getAttribute("id") ?? undefined,
    class: classes.join(" "),
    appearance: "styled"
  })
  const lead = isSpace(rest[0]) ? rest.shift() : undefined
  const trail = rest.length && isSpace(rest.at(-1)) ? rest.pop() : undefined
  const inside = lead ? [`${lead.data}  `, ...rest, lead.data] : rest
  const title = make(document, "ui-title", {}, [...summary.childNodes])
  const content = make(document, "ui-content", {}, inside)
  accordion.append(...before, title, ...(lead ? [lead] : []), content, ...(trail ? [trail] : []))
  details.replaceWith(accordion)
}

/** Is `node` a text node of white space only? */
function isSpace(node) {
  return node?.nodeType === 3 && !node.data.trim()
}

/** The indent of `element`'s line, from the white space before it;  `undefined` if it doesn't start a line. */
function indentBefore(element) {
  const before = element.previousSibling
  return before?.nodeType === 3 ? /\n([ \t]*)$/.exec(before.data)?.[1] : undefined
}

/** The `<epic-*>` element around `element` that draws from its children rather than showing them, if any. */
function readerOf(element) {
  for (let up = element.parentElement; up; up = up.parentElement) {
    const tag = up.localName
    if (tag.startsWith("epic-") && !PROSE_ELEMENTS.has(tag)) return tag
  }
  return undefined
}

/**
 * What of its own the page runs or styles that could select what the step moves, in words;  `undefined` if
 * nothing:
 * - a script that isn't the engine's (`ENGINE_SCRIPT`) or data (`DATA_SCRIPT`):  inline, or from its own file
 * - a `<style>` naming tables or asides
 */
function ownCode(document) {
  for (const script of document.querySelectorAll("script")) {
    const type = script.getAttribute("type") ?? ""
    if (DATA_SCRIPT.test(type)) continue
    const src = script.getAttribute("src")
    if (src && ENGINE_SCRIPT.test(src)) continue
    return src ? `runs its own script (${src})` : "runs its own inline script"
  }
  for (const style of document.querySelectorAll("style"))
    if (STYLES_THEM.test(style.textContent)) return "styles tables or asides itself (a <style>)"
  return undefined
}

/** Where `element` is, for a note:  its tag, and its id or the nearest one around it. */
function describe(element) {
  const tag = `<${element.localName}>`
  if (element.id) return `${tag}#${element.id}`
  const around = element.parentElement?.closest("[id]")
  return around ? `${tag} in #${around.id}` : tag
}
