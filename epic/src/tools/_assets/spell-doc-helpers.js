/*
 * Small helpers the docs pages' scripts share:
 * - the data pages (`commands.entry.js`, `core-reference.entry.js`, `spell-syntax.entry.js`), bundled since epic
 *   `coherence` C12:  their start (`drawThenBoot()`), notice, section numbers and page path
 * - the page runtime (`spell-doc-runtime.js`)
 * - the comments (`spell-doc-comments.js`) and the toolbar (`spell-doc-toolbar.js`),
 *   which Epic UI's pages load by themselves too (`spell-comments.js`)
 * - Plain DOM, no Spell UI imports:  the comments' own script runs beside the page's Spell UI, never with a second one
 *   (a toast goes through the page's `window.SpellUI`)
 * - What they keep in the browser goes through the kit's `PrefStore` (generic:  no Spell UI either)
 */
import { PrefStore } from "spell/util/persist/PrefStore"
import { $fetch } from "spell/util/spell/$fetch"

/** What types or picks:  a key pressed in one is the field's (paging, the jump key). */
export const FIELDS = "input, textarea, select, ui-input, ui-select, ui-dropdown"

/** Resolves after `count` animation frames:  long enough for UI's first render after its definitions. */
export async function nextFrames(count) {
  for (let left = count; left > 0; left--) await new Promise((resolve) => requestAnimationFrame(resolve))
}

/**
 * The object kept as JSON under `key`, a key named whole (`spell-folds:/x.html`), or `{}`:  nothing kept, or not one.
 * - NEVER throws:  storage blocked or a value it can't read is `{}`, logged (`PrefStore`).
 */
export function readJSON(key) {
  const value = PrefStore.getAt(key)
  return value && typeof value === "object" ? value : {}
}

/** Keep `value` as JSON under `key`;  a browser that blocks storage keeps it for this page only. */
export function writeJSON(key, value) {
  PrefStore.setAt(key, value)
}

/** Add `pill` to the page header `head`, before its toolbar (`buildPageToolbar()`):  the toolbar stays its last row. */
export function beforeToolbar(head, pill) {
  const toolbar = head.querySelector(":scope > .spell-toolbar")
  if (toolbar) toolbar.before(pill)
  else head.append(pill)
}

/**
 * The page header's TOOLS ROW (epic `epic-engine` I38):  ONE row at the right of the h1's line,
 * holding what our tools put there, in `HEAD_TOOLS`' order, whoever adds first:
 *   1. expand all and collapse all (`folds`)
 *   2. the comments' Send
 *   3. the page's own tools (the Epics page's New epic pill and sort)
 *   4. the page's bullhorn, last at the right
 * - one row, so they never overlap each other:  the row overlaps a long title rather than wrapping (`spell-doc.css`)
 *   - they used to be placed apart, each at its own distance from the edge, and Send covered the New epic pill
 * - a docs page's `.spell-page-head` only:
 *   any other head (Epic UI's masthead) takes the tool as before (`beforeToolbar()`)
 * - made on first use, `data-spell-added` (a live update steps around it);  `kind`:  one of `HEAD_TOOLS`
 */
export function addHeadTool(head, tool, kind) {
  tool.dataset.headTool = kind
  if (!head.matches(".spell-page-head")) return beforeToolbar(head, tool)
  let row = head.querySelector(":scope > .spell-head-tools")
  if (!row) {
    row = el("span", { class: "spell-head-tools", "data-spell-added": true })
    beforeToolbar(head, row)
  }
  const rank = HEAD_TOOLS.indexOf(kind)
  const after = [...row.children].find((each) => HEAD_TOOLS.indexOf(each.dataset.headTool) > rank)
  row.insertBefore(tool, after ?? null)
}

/** The page header's tools, in their order (`addHeadTool()`). */
const HEAD_TOOLS = ["folds", "send", "page", "comment"]

/**
 * A block's ACTIONS ROW (epic `epic-engine` I26):  the ONE row of a block's own controls,
 * for a block with no title row of its own (a table, a paragraph, a list, a message ...).
 * - a line of no height just before the block, its buttons over the block's top right corner
 *   (`spell-comments.css`, "A block's actions row")
 * - Owen, 2026-10-19:  "The expand button should be to the right of the bullhorn rather than in its own line"
 * - every feature puts its control here, never in a row of its own, so they never overlap or float apart:
 *   the comments' bullhorn (`addBullhorn()`), a table's expand button (`wireTableWidths()`)
 * - in `BLOCK_ACTIONS`' order, whoever adds first:  the bullhorn, then the expand button
 * - made on first use, `data-spell-added` (a live update steps around it);
 *   `dropBlockAction()` takes it away with its last control
 * - `kind`:  one of `BLOCK_ACTIONS`;  returns the row
 */
export function addBlockAction(block, control, kind) {
  let row = block.previousElementSibling
  if (!row?.classList.contains("spell-block-actions")) {
    row = document.createElement("div")
    row.className = "spell-block-actions"
    row.dataset.spellAdded = ""
    // the buttons in a box of their own, out of the flow:  the row stays a line of no height;
    // over the block's top edge however its margin falls (`alignBlockActions()`)
    const buttons = document.createElement("span")
    buttons.className = "spell-block-buttons"
    row.append(buttons)
    // a block slotted into an element (a docs example's description) takes its row with it:
    // unslotted, the row landed in the element's default slot, somewhere else entirely
    if (block.slot) row.slot = block.slot
    block.before(row)
  }
  const buttons = row.firstElementChild
  control.dataset.action = kind
  const rank = BLOCK_ACTIONS.indexOf(kind)
  const after = [...buttons.children].find((each) => BLOCK_ACTIONS.indexOf(each.dataset.action) > rank)
  buttons.insertBefore(control, after ?? null)
  alignBlockActions(row)
  return row
}

/** Take `control` away, and its block's actions row with it once that's empty (`addBlockAction()`). */
export function dropBlockAction(control) {
  const row = control.closest(".spell-block-actions")
  control.remove()
  if (row && !row.querySelector("[data-action]")) row.remove()
}

/** The controls of a block's actions row, in their order:  the bullhorn first (`addBlockAction()`). */
const BLOCK_ACTIONS = ["comment", "expand"]

/**
 * Put the buttons of every actions row in `root` (or the one row `root` is) over their block's top edge, 2px in:
 * the row is a line of no height just before the block, but the block's own top margin (a table's 12px, a list's)
 * may lie between them, or collapse into the margin above:  CSS can't know which, so this measures it
 * (`--spell-block-gap`, read by `spell-comments.css`'s `.spell-block-buttons`).
 * - a table's buttons are centred on its header row (its first row):
 *   the gap down to that ROW's top (the table's own top border lies above it), its height, `--spell-block-head`,
 *   and the row marked `.at-head-row`
 *   - to the hundredth of a pixel, not whole pixels:  the gap to the TABLE's top, and both rounded,
 *     left the expand button 1.65px above the row's middle (epic `epic-engine` r1, the repo-split analysis page's Q5)
 * - all reads, then all writes
 * - a row or block not drawn (a folded section's) is skipped until it shows:
 *   its callers run again on a resize (the comments' `makeRoom()`, a table's `place()`)
 */
export function alignBlockActions(root) {
  const rows = root.matches?.(".spell-block-actions") ? [root] : [...root.querySelectorAll(".spell-block-actions")]
  const sizes = rows.map((row) => {
    const block = row.nextElementSibling
    if (!block || !row.getClientRects().length || !block.getClientRects().length) return undefined
    const head = block.querySelector("tr")?.getBoundingClientRect()
    const top = head?.height ? head.top : block.getBoundingClientRect().top
    return { gap: pixels(top - row.getBoundingClientRect().top), head: head?.height ? pixels(head.height) : undefined }
  })
  rows.forEach((row, at) => {
    const size = sizes[at]
    if (!size) return
    for (const [name, value] of [
      ["--spell-block-gap", size.gap],
      ["--spell-block-head", size.head]
    ]) {
      if (value === undefined) row.style.removeProperty(name)
      else if (row.style.getPropertyValue(name) !== value) row.style.setProperty(name, value)
    }
    row.classList.toggle("at-head-row", !!size.head)
  })
}

/** `value` px as CSS, to the hundredth. */
function pixels(value) {
  return `${Math.round(value * 100) / 100}px`
}

/**
 * Put `host`'s `title` (a `<ui-button>`'s) on the button inside it too, once drawn:  the element the pointer lands
 * on carries the tooltip itself (Owen, 2026-10-10:  "No tooltip on those same buttons"), as an epic page item's note
 * buttons do, rather than leaving the browser to find it on the shadow host.
 * - `part`:  the inner box's part, `button` (a `<ui-button>`), or `item` (a `<ui-item>`:  the toolbar's buttons)
 * - again after the title changes:  it copies at once when the box is drawn
 */
export function titleInside(host, part = "button") {
  const copy = () => {
    const inner = host.shadowRoot?.querySelector(`[part~="${part}"]`)
    if (inner) inner.title = host.title
    return !!inner
  }
  if (!copy()) void customElements.whenDefined(host.localName).then(() => requestAnimationFrame(copy))
}

/**
 * A new `tag` with `attributes`, holding `children` (nodes or text):  how the runtime draws its elements, never an
 * HTML string (epic `epic-engine` P3).
 * - an attribute `undefined` or `false` is left out;  `true` or `""` is set bare (`selected`)
 * - a child `undefined`, `null`, `false` or `""` is skipped
 */
export function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag)
  for (const [name, value] of Object.entries(attributes))
    if (value !== undefined && value !== false) node.setAttribute(name, value === true ? "" : String(value))
  node.append(...children.filter((child) => child !== undefined && child !== null && child !== false && child !== ""))
  return node
}

/** `field` as tall as its text (between its CSS `min-height` and `max-height`). */
export function growField(field) {
  field.style.height = "auto"
  field.style.height = `${field.scrollHeight + 2}px`
}

/**
 * A toast through `UI.toast()`;  the console when toasts aren't there.
 * - `displayTime`:  ms, 3s unless given;  `actions`:  its buttons (`ToastAction`s:  `{ text, icon, click }`)
 * - a toast with buttons looks like one without (epic `epic-engine` P20):
 *   each button on the toast's own line, at its end, on its colour (`TOAST_ACTIONS`), never a second band under it
 *   - Owen, 2026-10-22:  "make the 'comment deleted' toast not ugly, matching the styles of the other toasts"
 */
export function noteToast(message, type, { displayTime = 3000, actions } = {}) {
  const buttons = actions?.map((action) => ({ class: TOAST_ACTION_CLASS, ...action }))
  try {
    window.SpellUI.UI.toast({
      message,
      type,
      displayTime,
      ...(buttons && { actions: buttons, classActions: TOAST_ACTIONS })
    })
  } catch {
    console.info(message)
  }
}

/** A toast's buttons:  a column at its end, no bar of their own (Spell UI's `classActions`). */
const TOAST_ACTIONS = "basic vertical"

/** Each toast button's look:  an outline on the toast's own colour, as short as the toast's line. */
const TOAST_ACTION_CLASS = "basic inverted compact"

////////////////
// ## Data pages
////////////////

/**
 * A DATA PAGE's start (the commands page, the core reference, the syntax page;  epic `coherence` C12):
 * `load()` its data, `draw(data)` it into the page, then boot the docs bundle, `spell-ui.js` beside this script,
 * whatever happened;  resolves to the data, or `undefined` (none, or it failed).
 * - why this order:  the runtime builds the toolbar and the sticky titles from `main`'s sections once, at start,
 *   so the drawn sections must be in the page before it runs
 * - `failed(error)`:  shows why it couldn't draw (`dataNotice()`)
 * - MUST be called as the script runs:  it finds the bundle beside `document.currentScript`
 */
export function drawThenBoot(load, draw, failed) {
  const bundle = new URL("spell-ui.js", document.currentScript?.src ?? location.href).href
  return (async () => {
    let data
    try {
      data = await load()
      if (data) draw(data)
    } catch (error) {
      failed(error)
      data = undefined
    }
    document.body.append(el("script", { src: bundle }))
    return data
  })()
}

/**
 * A data page's file at `url` (relative to the page), from the checkout serving it, never the browser's cache
 * (the kit's `$fetch()`):  its text, or as JSON (`format: "json"`);  `undefined` when there's none (404).
 * - throws any other failure, its message starting with the file's name
 */
export async function fetchFile(url, { format = "text" } = {}) {
  try {
    return (await $fetch({ url, format, cache: "no-store", defaultContents: null })) ?? undefined
  } catch (error) {
    throw new Error(`${url.split("/").pop()}:  ${error.message}`, { cause: error })
  }
}

/** Show `message` (its `` `code` `` as code) in a warning headed `header`, first in `holder` (else `main`). */
export function dataNotice(holder, header, message) {
  ;(holder ?? document.querySelector("main"))?.prepend(
    el("ui-message", { state: "warning", header }, el("p", {}, ...withCode(message)))
  )
}

/**
 * `value` as nodes:  its `` `code` `` spans as `<code>`, the rest as text, never markup;  each text part through
 * `plain()` (default:  as it is), which may make nodes of it (a link).
 */
export function withCode(value, plain = (part) => [part]) {
  return String(value)
    .split("`")
    .flatMap((part, i) => (i % 2 ? [el("code", {}, part)] : plain(part)))
    .filter((part) => part !== "")
}

/** The leading number of `section`'s label (`2` for "2. Operations", `3.1` for "3.1 Files"), or `""`. */
export function sectionNumber(section) {
  return /^\s*(\d+(?:\.\d+)*)\.?\s/.exec(section?.getAttribute("label") ?? "")?.[1] ?? ""
}

/** This page's path from the content folder's root (`guides/...`):  what `epic pages open` takes. */
export function pagePath() {
  return decodeURIComponent(location.pathname).replace(/^.*\/(?=(?:guides|epics|templates|pages)\/)/, "")
}
