/*
 * Small helpers the docs pages' scripts share:  the page runtime (`spell-doc-runtime.js`) and the comments
 * (`spell-doc-comments.js`), which Epic UI's pages load by themselves too (`spell-comments.js`).
 * - Plain DOM, no Spell UI imports:  the comments' own script runs beside the page's Spell UI, never with a second one
 *   (a toast goes through the page's `window.SpellUI`)
 */

/** The object saved as JSON under `key`, or `{}` (nothing saved, bad JSON, or storage that throws). */
export function readJSON(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}")
    return value && typeof value === "object" ? value : {}
  } catch {
    return {}
  }
}

/** Save `value` as JSON under `key`;  a browser that blocks storage just doesn't remember. */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private window:  not remembered
  }
}

/** Add `pill` to the page header `head`, before its toolbar (`buildPageToolbar()`):  the toolbar stays its last row. */
export function beforeToolbar(head, pill) {
  const toolbar = head.querySelector(":scope > .spell-toolbar")
  if (toolbar) toolbar.before(pill)
  else head.append(pill)
}

/**
 * The page header's TOOLS ROW (epic `epic-engine` I38):  ONE row at the right of the h1's line, holding what our tools
 * put there, in `HEAD_TOOLS`' order, whoever adds first:  the comments' Send, then the page's own tools (the Epics
 * page's New epic pill and sort), then the page's bullhorn, last at the right.
 * - one row, so they never overlap each other (they used to be placed apart, each at its own distance from the edge,
 *   and Send covered the New epic pill);  the row overlaps a long title rather than wrapping (`spell-doc.css`)
 * - a docs page's `.spell-page-head` only:  any other head (Epic UI's masthead) takes the tool as before
 *   (`beforeToolbar()`)
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
const HEAD_TOOLS = ["send", "page", "comment"]

/**
 * A block's ACTIONS ROW (epic `epic-engine` I26;  Owen, 2026-10-19:  "The expand button should be to the right of the
 * bullhorn rather than in its own line"):  the ONE row of a block's own controls, for a block with no title row of its
 * own (a table, a paragraph, a list, a message ...):  a line of no height just before the block, its buttons over the
 * block's top right corner (`spell-comments.css`, "A block's actions row").
 * - every feature puts its control here, never in a row of its own, so they never overlap or float apart:  the
 *   comments' bullhorn (`addBullhorn()`), a table's expand button (`wireTableWidths()`)
 * - in `BLOCK_ACTIONS`' order, whoever adds first:  the bullhorn, then the expand button
 * - made on first use, `data-spell-added` (a live update steps around it);  `dropBlockAction()` takes it away with its
 *   last control
 * - `kind`:  one of `BLOCK_ACTIONS`;  returns the row
 */
export function addBlockAction(block, control, kind) {
  let row = block.previousElementSibling
  if (!row?.classList.contains("spell-block-actions")) {
    row = document.createElement("div")
    row.className = "spell-block-actions"
    row.dataset.spellAdded = ""
    // the buttons in a box of their own, out of the flow:  the row stays a line of no height;  over the block's top
    // edge however its margin falls (`alignBlockActions()`)
    const buttons = document.createElement("span")
    buttons.className = "spell-block-buttons"
    row.append(buttons)
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
 * - all reads, then all writes;  a row or block not drawn (a folded section's) is skipped until it shows:  its
 *   callers run again on a resize (the comments' `makeRoom()`, a table's `place()`)
 */
export function alignBlockActions(root) {
  const rows = root.matches?.(".spell-block-actions") ? [root] : [...root.querySelectorAll(".spell-block-actions")]
  const gaps = rows.map((row) => {
    const block = row.nextElementSibling
    if (!block || !row.getClientRects().length || !block.getClientRects().length) return undefined
    return `${Math.round(block.getBoundingClientRect().top - row.getBoundingClientRect().top)}px`
  })
  rows.forEach((row, at) => {
    if (gaps[at] !== undefined && row.style.getPropertyValue("--spell-block-gap") !== gaps[at])
      row.style.setProperty("--spell-block-gap", gaps[at])
  })
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
 * - `displayTime`:  ms, 3s unless given;  `actions`:  its buttons (`ToastAction`s:  `{ text, icon, class, click }`)
 */
export function noteToast(message, type, { displayTime = 3000, actions } = {}) {
  try {
    window.SpellUI.UI.toast({ message, type, position: "bottom right", displayTime, showIcon: true, actions })
  } catch {
    console.info(message)
  }
}

/**
 * POST `body` as JSON to page-server route `url`, with the page server's token;  returns its answer.
 * - a 403 on the token (the server restarted since the page loaded):  takes the new token from the page as served
 *   now, and tries once more
 * - `keepalive`:  the request outlives the page (sent as it goes:  a small body only, under 64 KB)
 * - throws an `Error` saying why (the route's `error`)
 */
export async function postJSON(url, body, { keepalive = false, retried = false } = {}) {
  const server = window.SPELL_SERVER
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-server-token": server.token },
    body: JSON.stringify(body),
    keepalive
  })
  const answer = await response.json().catch(() => ({}))
  if (response.ok) return answer
  if (response.status === 403 && /token/i.test(answer.error ?? "") && !retried && server.readPage) {
    const { html } = await server.readPage()
    const fresh = /window\.SPELL_SERVER = (\{.*?\})<\/script>/.exec(html)
    if (fresh) {
      server.token = JSON.parse(fresh[1]).token
      return postJSON(url, body, { keepalive, retried: true })
    }
  }
  throw new Error(answer.error ?? `${response.status} ${response.statusText}`)
}
