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
 * - Never:  a block inside a `<ui-markdown>` (its own editing), an epic element, a body loaded from another file
 *   (`source`), something the runtime added (`data-spell-added`), or a block holding other blocks (an item with a
 *   list in it:  its own paragraphs are edited instead).
 * Bundled into `spell-ui.js` through the docs runtime;  imports no Spell UI.
 */

import { HtmlBlocks } from "spell/epic/tools/HtmlBlocks.js"

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
      new BlockEdit(block, toast).open(event)
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
  constructor(block, toast) {
    this.block = block
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
      await saveBlock(block, HtmlBlocks.collapsed(this.before.text), inner)
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
 * Save `block`'s new inside, `inner`, into the page's file.
 * - Each element around it with an id, nearest first:  read fresh;  one the file hasn't got (an id the runtime gave)
 *   is passed over.  The block is the same-tag element at the same place there, its words what the page showed
 *   (`words`);  otherwise the file changed since:  throws, nothing written.
 * - The file changed between the read and the write:  read again, once.
 */
async function saveBlock(block, words, inner) {
  const server = window.SPELL_SERVER
  if (!server?.readElement || !server.editPage) throw new Error("the page server's live client isn't loaded")
  for (let holder = block.parentElement?.closest("[id]"); holder; holder = holder.parentElement?.closest("[id]")) {
    for (let tries = 0; tries < 2; tries++) {
      const read = await server.readElement({ id: holder.id })
      if (read.status === 404) break
      if (!read.ok) throw new Error(read.error ?? `the server said ${read.status}`)
      const found = HtmlBlocks.find(read.html, block.localName, placeOf(block, holder))
      if (!found || HtmlBlocks.wordsOf(found.inner, decodeHtml) !== words)
        throw new Error("this text changed in the file since the page showed it:  reload")
      // the file's own spacing at its inside's start and end kept (its line breaks and indent):  a code block's is text
      const isCode = block.localName === "code"
      const kept = isCode ? inner : `${/^\s*/.exec(found.inner)[0]}${inner.trim()}${/\s*$/.exec(found.inner)[0]}`
      const html = HtmlBlocks.swapped(read.html, found, kept)
      const answer = await server.editPage({ id: holder.id, html, etag: read.etag, shown: true })
      if (answer.ok) return
      const isStale = answer.status === 409 || answer.status === 412
      if (!isStale || tries) throw new Error(answer.error ?? `the server said ${answer.status}`)
    }
  }
  throw new Error("no element around it has an id the page's file has")
}

/** Which of `holder`'s `<tag>`s `block` is, counting only what the page's file holds too. */
function placeOf(block, holder) {
  const same = [...holder.querySelectorAll(block.localName)].filter((each) => !each.closest("[data-spell-added]"))
  return same.indexOf(block)
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

/** What a block mustn't be inside. */
const NEVER = "ui-markdown, [data-spell-added], [source], [contenteditable], [data-spell-editing], script, template"

/** A block holding one of these holds other blocks:  not edited whole. */
const INNER_BLOCKS = "p, ul, ol, li, div, table, pre, blockquote, section, ui-section, h1, h2, h3, h4, h5, h6"
