/*
 * Editing a docs page's own HTML in place (epic `epic-engine` T66), beside `<ui-markdown>`'s (P60):  ⌥-click
 * (Alt-click) a paragraph, a list item, a heading, a table cell or a code block written in the page, type, and it's
 * saved into the page's file at once.
 * - Only on a page the page server may save (`SPELL_SERVER.writable`), as P60's.
 * - The block itself becomes editable (`contenteditable`), its own look kept;  a code block as plain text.
 * - Enter (⌘Enter in a code block) or a click away keeps it;  Escape puts it back;  Shift+Enter, a new line;
 *   Home and End go to the block's start and end.
 * - Saved by swapping ONLY the block's inside in the file (`HtmlBlocks`):  the nearest element with an id the file
 *   has is read fresh, the block found there by its tag and place, its words checked against the page's, then
 *   written back (`SPELL_SERVER.editPage()`, `shown`), so the page never reloads or moves.
 *   - no element with an id around it in the file (a guide's opening paragraphs, epic `epic-engine` T86):  the whole
 *     file is read, the block found inside its `<main>`, and the file written back whole (`saveFile()`)
 *   - a block the place can't tell from another with the same words is refused, never guessed at
 * - A TABLE's cell being edited shows a bar above it (T86):  add an empty row below, remove the row, add an empty
 *   column to the right, remove the column;  each written into the table in the file (`HtmlBlocks.withRow()`,
 *   `withColumn()`) and made the same on the page, an added row's or column's cell then open to type in.
 * - Never:  a block inside a `<ui-markdown>` (its own editing), an epic element, a body loaded from another file
 *   (`source`), something the runtime added (`data-spell-added`), or a block holding other blocks (an item with a
 *   list in it:  its own paragraphs are edited instead).
 * Bundled into `spell-ui.js` through the docs runtime;  imports no Spell UI.
 */

import { HtmlBlocks } from "spell/epic/tools/HtmlBlocks.js"

import { el } from "./spell-doc-helpers.js"

/**
 * ⌥-click editing for `main`'s own blocks, and the outline that shows what can be edited while ⌥ is held.
 * - Once per page;  a block a live update brings in is found at its click, so nothing to rewire.
 * - `toast(message, type)`:  how a failed save is told.
 */
export function editHtmlInPlace(main, toast) {
  // an epic page's blocks are its elements' own, edited through the epic tool
  if (!window.SPELL_SERVER?.writable || main.dataset.spellEditHtml || document.body.classList.contains("plan-doc"))
    return
  main.dataset.spellEditHtml = "on"
  const root = document.documentElement
  const holding = (event) => root.toggleAttribute("data-spell-alt", event.altKey && !event.metaKey && !event.ctrlKey)
  addEventListener("keydown", holding)
  addEventListener("keyup", holding)
  addEventListener("blur", () => root.removeAttribute("data-spell-alt"))
  main.addEventListener(
    "click",
    (event) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return
      const block = editableBlock(event.target, main)
      if (!block) return
      event.preventDefault()
      event.stopPropagation()
      new BlockEdit(block, main, toast).open(event)
    },
    true
  )
}

/** The block `target` is in that can be edited here, or `undefined`. */
function editableBlock(target, main) {
  const element = target?.nodeType === 1 ? target : target?.parentElement
  if (!element || !main.contains(element)) return undefined
  const code = element.closest("pre > code")
  const block = code ?? element.closest(BLOCKS)
  if (!block || !main.contains(block) || block.isContentEditable) return undefined
  if (block.closest(NEVER)) return undefined
  if (!code && block.querySelector(INNER_BLOCKS)) return undefined
  return block
}

/****************
 * ### `BlockEdit`
 * One block being edited:  opened at the click, kept or put back, and saved into the page's file.
 ****************/
class BlockEdit {
  constructor(block, main, toast) {
    this.block = block
    this.main = main
    this.toast = toast
    this.isCode = block.localName === "code"
    this.before = { html: block.innerHTML, text: textOfLive(block) }
  }

  /** Make the block editable, the cursor where it was clicked. */
  open(event) {
    const { block } = this
    block.setAttribute("contenteditable", this.isCode ? "plaintext-only" : "true")
    block.setAttribute("data-spell-editing", "")
    block.spellcheck = !this.isCode
    block.focus()
    // the cursor where it was clicked, else at the end:  never left outside the block, where keys would move the page
    const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY)
    const selection = getSelection()
    if (caret && block.contains(caret.offsetNode)) selection?.collapse(caret.offsetNode, caret.offset)
    else {
      selection?.selectAllChildren(block)
      selection?.collapseToEnd()
    }
    block.addEventListener("keydown", this.onKey)
    block.addEventListener("focusout", this.onLeave)
    if (block.matches("td, th")) this.bar = tableBar(this)
  }

  onKey = (event) => {
    event.stopPropagation()
    if (event.key === "Escape") {
      event.preventDefault()
      return this.close("put back")
    }
    // Home and End:  the block's start and end, as `<ui-markdown>`'s box;  never the page's (a Mac scrolls it)
    if ((event.key === "Home" || event.key === "End") && !event.shiftKey) {
      event.preventDefault()
      const selection = getSelection()
      selection?.selectAllChildren(this.block)
      if (event.key === "Home") selection?.collapseToStart()
      else selection?.collapseToEnd()
      return
    }
    const keeps = this.isCode ? event.metaKey || event.ctrlKey : !event.shiftKey
    if (event.key === "Enter" && keeps) {
      event.preventDefault()
      void this.close("keep")
    }
  }

  onLeave = () => void this.close("keep")

  /** End the edit:  `keep` saves what changed, `put back` restores the block as it was. */
  async close(how) {
    const { block } = this
    if (!block.hasAttribute("data-spell-editing")) return
    block.removeEventListener("keydown", this.onKey)
    block.removeEventListener("focusout", this.onLeave)
    this.bar?.remove()
    block.removeAttribute("contenteditable")
    block.removeAttribute("data-spell-editing")
    if (how === "put back") {
      block.innerHTML = this.before.html
      return
    }
    if (textOfLive(block) === this.before.text) return
    const inner = this.innerToSave()
    block.setAttribute("data-spell-saving", "")
    try {
      await saveBlock(block, this.main, HtmlBlocks.collapsed(this.before.text), inner)
      if (this.isCode) window.hljs?.highlightElement?.(block)
    } catch (error) {
      block.innerHTML = this.before.html
      this.toast(`Not saved:  ${error?.message ?? error}`, "error")
    } finally {
      block.removeAttribute("data-spell-saving")
    }
  }

  /** What the block's inside is written back as:  a code block's text, escaped;  else its markup, the runtime's left out. */
  innerToSave() {
    if (this.isCode) return HtmlBlocks.escaped(textOfLive(this.block))
    const copy = this.block.cloneNode(true)
    for (const added of copy.querySelectorAll("[data-spell-added]")) added.remove()
    // the browser's stand-in for an empty line:  never written
    copy.innerHTML = copy.innerHTML.replace(/<br>$/, "")
    return copy.innerHTML
  }
}

/**
 * Save `block`'s new inside, `inner`, into the page's file (`changeInFile()`):  the file's own spacing at its
 * inside's start and end kept (its line breaks and indent);  a code block's is text.
 */
async function saveBlock(block, main, words, inner) {
  const isCode = block.localName === "code"
  await changeInFile(block, main, words, (inside, found) => {
    const kept = isCode ? inner : `${/^\s*/.exec(found.inner)[0]}${inner.trim()}${/\s*$/.exec(found.inner)[0]}`
    return HtmlBlocks.swapped(inside, found, kept)
  })
}

/**
 * Change `element` in the page's file:  `change(inside, found)` is the holder's inside with it changed.
 * - the holder:  each element around it with an id, nearest first, read fresh;  one the file hasn't got (an id the
 *   runtime gave) is passed over;  last the page's `main`, the WHOLE file read (T86), the element found inside its
 *   `<main>`
 * - found there by its tag, its place among the same tags and its words (`words`, what the page showed:
 *   `HtmlBlocks.locate()`);  the file changed since, or the same words in two places it can't tell apart:  throws an
 *   `HtmlBlockError`, nothing written
 * - the file changed between the read and the write:  read again, once
 * - one change at a time, in the order they're asked (`inTurn()`)
 */
function changeInFile(element, main, words, change) {
  return inTurn(async () => {
    const server = window.SPELL_SERVER
    if (!server?.readElement || !server.editPage || !server.saveFile)
      throw new Error("the page server's live client isn't loaded")
    for (const holder of holdersOf(element, main)) {
      const isWhole = holder === main
      for (let tries = 0; tries < 2; tries++) {
        const read = await server.readElement(isWhole ? {} : { id: holder.id })
        if (!isWhole && read.status === 404) break
        if (!read.ok) throw new Error(read.error ?? `the server said ${read.status}`)
        const scope = isWhole ? HtmlBlocks.find(read.html, "main", 0) : insideOf(read.html)
        if (!scope)
          throw new Error(
            "this text isn't in the page's main part, so it can't be saved here.  Edit it in the page's HTML file instead."
          )
        const inside = read.html.slice(scope.start, scope.end)
        const same = sameTagsIn(holder, element.localName)
        const place = { tag: element.localName, place: same.indexOf(element), count: same.length, words }
        const found = HtmlBlocks.locate(inside, place, decodeHtml)
        const html = read.html.slice(0, scope.start) + change(inside, found) + read.html.slice(scope.end)
        const answer = isWhole
          ? await server.saveFile({ path: server.file, text: html, etag: read.etag, shown: true })
          : await server.editPage({ id: holder.id, html, etag: read.etag, shown: true })
        if (answer.ok) return
        const isStale = answer.status === 409 || answer.status === 412
        if (!isStale || tries) throw new Error(answer.error ?? `the server said ${answer.status}`)
      }
    }
    throw new Error("no element around it has an id the page's file has")
  })
}

/** Where `element`'s edit may be written:  each element around it with an id, nearest first, then `main`. */
function* holdersOf(element, main) {
  for (let holder = element.parentElement?.closest("[id]"); holder; holder = holder.parentElement?.closest("[id]"))
    yield holder
  yield main
}

/** Where an element's markup (`html`, its own tags included) has its inside:  after its start tag, before its end. */
function insideOf(html) {
  const start = HtmlBlocks.tagEnd(html, 0)
  const end = html.lastIndexOf("<")
  return start > 0 && end >= start ? { start, end } : undefined
}

/**
 * `holder`'s `<tag>`s that its file holds too:  never what the runtime added, nor a body loaded from another file
 * (`source`).
 */
function sameTagsIn(holder, tag) {
  return [...holder.querySelectorAll(tag)].filter(
    (each) => !each.closest("[data-spell-added]") && !each.parentElement?.closest("[source]")
  )
}

/** The last change asked for:  the next waits for it, so two never read the same version. */
let lastChange = Promise.resolve()

/** Run `work` once every change asked for before it is done, failed or not. */
function inTurn(work) {
  const next = lastChange.then(work, work)
  lastChange = next.catch(() => {})
  return next
}

////////////////
// ## Rows and columns
////////////////

/**
 * The bar above a table cell being edited (T86):  a `<ui-button>` per change (`TABLE_CHANGES`), each with its
 * tooltip;  anchored to the cell by CSS (`spell-doc.css`), outside `main` so no page patch ever counts it.
 * - pressing one keeps the cell's edit first (saving its text), then changes the table
 */
function tableBar(edit) {
  const bar = el("div", { class: "spell-table-edit", "data-spell-added": "", role: "toolbar", "aria-label": "Table" })
  for (const change of TABLE_CHANGES) {
    const button = el(
      "ui-button",
      {
        appearance: "circular basic",
        size: "mini",
        icon: change.icon,
        "aria-label": change.tip
      },
      change.label
    )
    // the cell keeps the focus:  a click away would keep the edit before the change knows where it was
    button.addEventListener("mousedown", (event) => event.preventDefault())
    button.addEventListener("click", () => void changeTable(edit, change))
    bar.append(button)
  }
  document.body.append(bar)
  return bar
}

/**
 * Add or remove the row or column of the cell `edit` is in:  in the file first, then on the page, the same way;
 * an added row's or column's cell then open to type in.
 * - NEVER throws:  a refusal is told in the page's notices, the table left as it was
 */
async function changeTable(edit, { what, how }) {
  const cell = edit.block
  const table = cell.closest("table")
  const row = cell.parentElement
  if (!table || row?.localName !== "tr") return
  await edit.close("keep")
  const rows = [...table.querySelectorAll("tr")].filter((each) => each.closest("table") === table)
  const rowAt = rows.indexOf(row)
  const column = [...row.cells].indexOf(cell)
  const words = HtmlBlocks.collapsed(textOfLive(table))
  try {
    await changeInFile(table, edit.main, words, (inside, found) => {
      const changed =
        what === "row" ? HtmlBlocks.withRow(found.inner, rowAt, how) : HtmlBlocks.withColumn(found.inner, column, how)
      return HtmlBlocks.swapped(inside, found, changed)
    })
  } catch (error) {
    edit.toast(`Not saved:  ${error?.message ?? error}`, "error")
    return
  }
  const opened = what === "row" ? changeRow(row, how) : changeColumn(rows, row, column, how)
  if (opened) new BlockEdit(opened, edit.main, edit.toast).open({ clientX: -1, clientY: -1 })
}

/** The page's table as `HtmlBlocks.withRow()` made the file's:  the new row's first cell, to open. */
function changeRow(row, how) {
  if (how === "remove") {
    row.remove()
    return undefined
  }
  const isHeader = row.cells.length > 0 && [...row.cells].every((cell) => cell.localName === "th")
  const copy = emptyLike(row, "tr")
  for (const cell of row.cells) copy.append(emptyLike(cell, isHeader ? "td" : cell.localName))
  row.after(copy)
  return copy.cells[0]
}

/** The page's table as `HtmlBlocks.withColumn()` made the file's:  the new cell in the edited row, to open. */
function changeColumn(rows, edited, column, how) {
  let opened
  for (const row of rows) {
    const cell = row.cells[column]
    if (!cell) continue
    if (how === "remove") {
      cell.remove()
      continue
    }
    const added = emptyLike(cell, cell.localName)
    cell.after(added)
    if (row === edited) opened = added
  }
  return opened
}

/** An empty `<tag>` with `element`'s attributes, but its id and the runtime's (`NOT_COPIED`). */
function emptyLike(element, tag) {
  const copy = document.createElement(tag)
  for (const { name, value } of element.attributes) if (!NOT_COPIED.test(name)) copy.setAttribute(name, value)
  return copy
}

/** The text a live block shows, the runtime's additions left out. */
function textOfLive(block) {
  const copy = block.cloneNode(true)
  for (const added of copy.querySelectorAll("[data-spell-added]")) added.remove()
  return copy.textContent ?? ""
}

/** `html`'s entities read the browser's way. */
function decodeHtml(html) {
  const area = document.createElement("textarea")
  area.innerHTML = html
  return area.value
}

/** The blocks that can be edited:  a paragraph, a list item, a heading, a table cell, a definition. */
const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd"

/** What a row or column change does, by the bar's buttons (the novice voice). */
const TABLE_CHANGES = [
  { what: "row", how: "add", icon: "plus", label: "Row", tip: "Add an empty row below this one" },
  { what: "row", how: "remove", icon: "remove", label: "Row", tip: "Remove this row" },
  { what: "column", how: "add", icon: "plus", label: "Column", tip: "Add an empty column to the right of this one" },
  { what: "column", how: "remove", icon: "remove", label: "Column", tip: "Remove this column" }
]

/** What a cell copied for a new row or column never keeps. */
const NOT_COPIED = /^(id|contenteditable|style|data-spell-.*)$/

/** What a block mustn't be inside. */
const NEVER = "ui-markdown, [data-spell-added], [source], [contenteditable], [data-spell-editing], script, template"

/** A block holding one of these holds other blocks:  not edited whole. */
const INNER_BLOCKS = "p, ul, ol, li, div, table, pre, blockquote, section, ui-section, h1, h2, h3, h4, h5, h6"
