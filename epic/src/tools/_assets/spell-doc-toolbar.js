/*
 * THE TOOLBAR, every page's navigation, and its jump key (Cmd / Ctrl + K):  ONE code for both kinds of page (epic
 * `epic-engine` T11;  Owen, 2026-10-20:  "Epic UI pages should have a toolbar").
 * - Its own module, as the comments are (`spell-doc-comments.js`, P2), so two scripts carry it:
 *   - the docs bundle, `spell-ui.js`, through the page runtime (`spell-doc-runtime.js`):  a guide's and an epic page's
 *     toolbar, placed and followed there (`buildPageToolbar()`, `buildToolbar()`, `followScroll()`)
 *   - `spell-comments.js` (`spell-comments.entry.js`), on Epic UI's pages:  a band under the site's masthead, one
 *     button per top-level section, the comments' bullhorn at its right (`wireSiteToolbar()` there)
 * - Plain DOM, no Spell UI imports:  it makes `<ui-menu>` / `<ui-item>` / `<ui-label>` / `<ui-modal>` markup and lets
 *   the page's Spell UI draw it (the comments' rule:  one Spell UI on a page, epic `epic-engine` I18)
 * - Its look:  `spell-toolbar.css`, beside it (`@import`ed by `spell-doc.css`;  linked by `spell-comments.js`).
 */

import { commentsOnPage, firstWords } from "./spell-doc-comments.js"
import { FIELDS, el, nextFrames, titleInside } from "./spell-doc-helpers.js"
import { ThreadFacts } from "spell-epic/comments"

////////////////
// ## The toolbar
////////////////

/** Below this many px for each title, a titled toolbar shows its buttons' marks only (`fitTitles()`). */
const MIN_TITLE_PX = 50

/**
 * A TITLED toolbar's items (a guide's, a details page's, Epic UI's):  one per top-level section, its mark and title.
 * - `groups`:  `{ element, id, label, glyph }` each, the outline's top-level entries
 * - `badgesOf(element)`:  its badges (`[kind, number, words]`, `toolbarItem()`);  none:  `[]`
 * - the mark:  an item's number for an item (`Q3 · When?` shows 3, coloured by the section's `data-state`:  a
 *   details page's questions, `<epic-ask>`);  else its `<ui-icon>`;  else its number (`2.`);  else its access letter,
 *   shown only while the titles are hidden (`spell-toolbar-icons`)
 * - the title without its number (`2. Markup` is `Markup`), unless it's an item's
 * - its ACCESS LETTER (Owen, 2026-10-23, epic `debut`:  "the `T` in types could be bold underline black"):
 *   unique on the toolbar (`accessLetters()`), drawn IN its title (bold, underlined, the text's colour);
 *   pressing it jumps there as a click does (`wireAccessLetters()`)
 */
export function titledItems(groups, badgesOf) {
  const titles = groups.map(({ label }) => (ITEM_ID.test(label) ? label : shortLabel(label)))
  const letters = accessLetters(titles)
  return groups.map(({ element, id, label, glyph }, index) => {
    // an item id first in the label (`Q3 · When?`) says more than any icon:  every question's would be the same
    const itemNumber = label.match(ITEM_ID)?.[1]
    const number = label.match(/^\d+/)?.[0]
    return toolbarItem({
      id,
      tip: label,
      glyph: itemNumber ? undefined : glyph,
      mark: itemNumber
        ? el("b", { slot: "icon", class: "spell-toolbar-number" }, itemNumber)
        : glyph
          ? undefined
          : number
            ? el("b", { slot: "icon" }, number)
            : el("b", { slot: "icon", class: "spell-toolbar-letter" }, (letters[index] ?? label.charAt(0)).toUpperCase()),
      title: titles[index],
      letter: letters[index],
      state: element.dataset.state,
      badges: badgesOf(element)
    })
  })
}

/** An item's id first in a section's label:  `Q3 · When?`. */
const ITEM_ID = /^[A-Z](\d+)\b/

/**
 * Each title's ACCESS LETTER, unique among them, lower case;  `undefined` for a title with no free letter.
 * - its title's first letter, else the next letter IN its title not taken yet:
 *   `Types` t, `Groups` g, `Content` c, `States` s, `Variations` v, `Group Variations` r
 * - first come, first served, in toolbar order;  letters only (a-z, accents folded), never a digit or a space
 * - pure:  no DOM
 */
export function accessLetters(titles) {
  const taken = new Set()
  return titles.map((title) => {
    const letters = title
      .normalize("NFD")
      .toLowerCase()
      .replace(/[^a-z]/g, "")
    const letter = [...letters].find((candidate) => !taken.has(candidate))
    if (letter) taken.add(letter)
    return letter
  })
}

/**
 * A title with its access letter marked:  the first occurrence of `letter` in it, any case, as a
 * `<u class="spell-toolbar-key">`;  the plain title when `letter` is missing or not in it.
 */
function titleWithKey(title, letter) {
  const at = letter ? [...title.normalize("NFD")].findIndex((char) => char.toLowerCase() === letter) : -1
  if (at < 0) return [title]
  const chars = [...title.normalize("NFD")]
  return [chars.slice(0, at).join(""), el("u", { class: "spell-toolbar-key" }, chars[at]), chars.slice(at + 1).join("")]
}

/**
 * THE TOOLBAR, every page's (epic `epic-engine` P3:  Owen, 2026-10-19, "Why are we not using <ui-xxxx> or <epic-xxx>
 * components for these pages?"):  Spell UI's menu, `<ui-menu class="spell-toolbar" secondary>`, a `<nav>` landmark of
 * `<ui-item>` links (`toolbarItem()`), its look `spell-toolbar.css`'s, through the menu's tokens.
 * - the current item `selected` (scroll-follow), which the menu draws, and says (`aria-current`)
 * - `titled`:  a guide's (and Epic UI's), each item its mark and its title (`spell-toolbar-titled`);  else an epic
 *   page's, marks only, every item the same width
 * - after the items, what a page or the comments add to the row:  the toolbar's bullhorn (`PageComments`), the spell
 *   syntax guide's Expand all and Collapse all;  the items scroll sideways under them (`spell-toolbar.css`)
 * - the current item scrolled into view, on a row scrolled sideways (`scrollIntoRow()`)
 * - SIDE EFFECT:  removes the toolbar built before (`removeToolbar()`), keeping what was added to its row
 */
export function toolbarMenu(items, { titled }) {
  const kept = removeToolbar()
  // a titled toolbar is Spell UI's `<ui-toolbar>` where the page has it:  `‹` / `›` buttons while its items overflow
  const tag = titled && customElements.get("ui-toolbar") ? "ui-toolbar" : "ui-menu"
  const toolbar = el(tag, {
    class: titled ? "spell-toolbar spell-toolbar-titled" : "spell-toolbar",
    secondary: true,
    "aria-label": "Sections",
    "data-spell-added": true
  })
  toolbar.append(...items, ...kept)
  if (titled) wireAccessLetters()
  new MutationObserver((changes) => {
    for (const { target } of changes) if (target.hasAttribute("selected")) scrollIntoRow(target)
  }).observe(toolbar, { attributeFilter: ["selected"], subtree: true })
  return toolbar
}

/**
 * A titled toolbar's ACCESS LETTERS (Owen, 2026-10-23, epic `debut`):  a letter pressed on its own jumps to the item
 * whose `data-key` it is, as clicking it does (the link inside the item is clicked).
 * - once per page:  it finds the toolbar showing at the time, so a toolbar built again needs nothing
 * - left alone:  any modifier (Cmd / Ctrl + K is the jump dialog), a key held down, typing (a field, an editable box),
 *   an open dialog, a focused control that takes keys of its own (a menu, a dropdown, a live example), `/` (the site's
 *   search) and every key that isn't a letter
 */
function wireAccessLetters() {
  if (accessLettersWired) return
  accessLettersWired = true
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing || event.defaultPrevented)
      return
    if (!/^[a-z]$/i.test(event.key) || typingIn(event)) return
    if (document.querySelector("dialog[open], ui-modal:not([hidden])")) return
    const toolbar = document.querySelector(".spell-toolbar-titled")
    const focused = document.activeElement
    if (!toolbar || (focused && focused !== document.body && !toolbar.contains(focused) && takesKeys(focused))) return
    const item = toolbar.querySelector(`:scope > [data-key="${event.key.toLowerCase()}"]`)
    const link = item?.shadowRoot?.querySelector('[part~="item"]')
    if (!link) return
    event.preventDefault()
    link.click()
  })
}

/** The page's access letters are listened for (`wireAccessLetters()`). */
let accessLettersWired = false

/** A focused element that takes letters itself:  a control with a role or a custom element of its own. */
function takesKeys(element) {
  return element.matches(
    '[role="menu"], [role="menubar"], [role="listbox"], [role="combobox"], [role="grid"], [role="tree"], ' +
      '[role="slider"], [role="tablist"], ui-dropdown, ui-select, ui-search, ui-calendar, ui-menu, ui-tabs, ' +
      "ui-docs-example *, ui-docs-example"
  )
}

/**
 * One toolbar item:  a `<ui-item>` link to section `id` (`data-rail`), its mark (`glyph`, the menu's icon box;  else
 * `mark`, a `slot="icon"` element), its `title` when the toolbar is titled, its `badges` (`[kind, number, words]`:
 * `<ui-label>`s over the mark's top right), `state` (`data-state`, a details page's question's colour).
 * - its tooltip `tip` on the link inside, where the pointer lands (`titleInside()`):  its mark, title and badges let
 *   the pointer through (`spell-toolbar.css`), so it shows in VS Code too;  the badges say theirs in it, and to a
 *   screen reader
 */
export function toolbarItem({ id, tip, glyph, mark, title, letter, state, badges }) {
  const said = [tip, ...badges.map(([, , words]) => words)].join(" · ")
  const item = el(
    "ui-item",
    {
      class: "spell-toolbar-item",
      href: `#${id}`,
      "data-rail": id,
      icon: glyph,
      title: said,
      "aria-label": said,
      "aria-keyshortcuts": letter?.toUpperCase(),
      "data-key": letter,
      "data-state": state
    },
    mark,
    title && el("span", { class: "spell-toolbar-label" }, ...titleWithKey(title, letter)),
    ...badges.map(([kind, number]) =>
      el("ui-label", { class: `spell-toolbar-count ${kind}`, circular: true, size: "mini" }, String(number))
    )
  )
  titleInside(item, "item")
  return item
}

/**
 * Take the page's toolbar away (and a hand-written `.spell-toc-open`:  pages before 2026-10-01 had a "Contents"
 * button);  returns what pages and the comments had added to its row, for the toolbar built next.
 */
export function removeToolbar() {
  const kept = []
  for (const old of document.querySelectorAll(".spell-toc-open, .spell-toolbar")) {
    kept.push(...[...old.children].filter((child) => !child.hasAttribute("data-rail")))
    old.remove()
  }
  return kept
}

/**
 * A titled toolbar's titles:  shown, shrinking with `...` (CSS), while each gets `MIN_TITLE_PX` or more of the row;
 * else gone (`spell-toolbar-icons`), the marks only (Owen, 2026-10-10:  "remove the titles entirely if they each only
 * get less than 50px").
 * - each title's share:  the row's room, less every button's mark, badge and padding, and what else the row holds (the
 *   bullhorn, the spell syntax guide's Expand all), split evenly
 * - measured on the items' drawn boxes:  a `<ui-item>` is `display: contents`, its box is in its shadow root
 */
export function fitTitles(toolbar) {
  const row = toolbarRow(toolbar)
  const items = [...toolbar.querySelectorAll(":scope > [data-rail]")]
  toolbar.classList.remove("spell-toolbar-icons")
  // a `<ui-toolbar>` keeps its titles and scrolls, its `‹` / `›` buttons showing what's past either end
  if (!row || !items.length || toolbar.localName === "ui-toolbar") return
  const style = getComputedStyle(row)
  const others = [...toolbar.children]
    .filter((child) => !child.hasAttribute("data-rail") && !child.hidden)
    .reduce((sum, child) => sum + boxOf(child).width, 0)
  const room =
    row.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight) -
    (parseFloat(style.columnGap) || 0) * (toolbar.children.length - 1) -
    others
  const fixed = items.reduce(
    (sum, item) => sum + boxOf(item).width - (item.querySelector(".spell-toolbar-label")?.offsetWidth ?? 0),
    0
  )
  if ((room - fixed) / items.length < MIN_TITLE_PX) toolbar.classList.add("spell-toolbar-icons")
}

/**
 * Fit a titled toolbar's titles (`fitTitles()`) now and whenever they could change:  the window's width, the items
 * drawing, the fonts loading.
 * - `signal`:  stops watching (Epic UI's pages, whose `main` the site's router swaps for the next page's)
 */
export function keepFitted(toolbar, { signal } = {}) {
  const sizes = new ResizeObserver(() => fitTitles(toolbar))
  sizes.observe(toolbar)
  signal?.addEventListener("abort", () => sizes.disconnect(), { once: true })
  void customElements.whenDefined("ui-item").then(() => nextFrames(2).then(() => fitTitles(toolbar)))
  void document.fonts?.ready.then(() => fitTitles(toolbar))
}

/** Mark item `id` of `toolbar` as the section being read (`selected`), and no other;  `""`:  none. */
export function markCurrent(toolbar, id) {
  for (const item of toolbar?.querySelectorAll("[data-rail]") ?? [])
    item.toggleAttribute("selected", item.dataset.rail === id)
}

/** A block's label without its number:  `3. Questions` is `Questions`. */
export function shortLabel(label) {
  return label.replace(/^\d+(?:\.\d+)*\.?\s+/, "")
}

/** The toolbar's row:  the menu's `<nav>`, in its shadow root;  `undefined` before it has drawn. */
function toolbarRow(toolbar) {
  return toolbar.shadowRoot?.querySelector('[part~="menu"]') ?? undefined
}

/** The box `element` draws:  a `<ui-item>`'s item, in its shadow root (the host is `display: contents`). */
function boxOf(element) {
  const box = element.shadowRoot?.querySelector('[part~="item"]') ?? element
  return box.getBoundingClientRect()
}

/** Scroll `item`'s row sideways (never the page) until it shows whole, centred if it has to move. */
function scrollIntoRow(item) {
  const row = toolbarRow(item.parentElement)
  if (!row || row.scrollWidth <= row.clientWidth) return
  const box = boxOf(item)
  const start = box.left - row.getBoundingClientRect().left + row.scrollLeft
  if (start >= row.scrollLeft && start + box.width <= row.scrollLeft + row.clientWidth) return
  row.scrollTo({ left: start - (row.clientWidth - box.width) / 2, behavior: "smooth" })
}

////////////////
// ## Jump to an id (Cmd / Ctrl + K)
////////////////

/** What a typed id looks like (`M3`, `j7`, `cm3`, `#p2`):  on Epic UI's pages, anything else is words to search. */
const ID_LIKE = /^#?[a-z]{1,2}\d+$/i

/**
 * Cmd-K (Ctrl-K) on an epic page asks which item to jump to (Owen, 2026-10-10:  "add command-k which brings up
 * ui-prompt asking what number I want to jump to (e.g. J7)"), and lands there exactly as a link to `#j7` does
 * (`go()`:  what hides it unfolds, an item opens, it lands below the stuck titles).
 * - any id on the page, case and a `#` aside:  `J7`, `q3`, `P2`, `o1`, `#decisions`
 * - a COMMENT's (epic `epic-workflow` P23;  Owen, 2026-10-10:  "⌘K taking comment ids"):  `M3` (`m3`, the old `cm3`)
 *   lands on its thread, opened, below the stuck titles (`PageComments.landOn()`);  under the box, the threads
 *   waiting on Owen (Claude spoke last), each a line "M3 · his first words" that lands there
 * - an epic page, and every page that takes comments (a guide, Epic UI's pages:  comment ids, and any other id on it)
 * - an id that isn't there:  the dialog says so and stays open, the text selected for typing over
 * - never while typing in a field (a note box, the new item form), nor with a dialog already open
 * - the dialog is a `<ui-modal>` built as `UI.modals.prompt()` builds its own (`ModalDialogs`):
 *   no `<ui-prompt>` element exists, and `prompt()` closes on any answer, so it couldn't stay open on a miss;
 *   here its cancelable `ui-approve` is cancelled instead
 * - K is free:  the live client takes only Cmd / Ctrl + A C X V Z in VS Code's view (`liveClient.ts` `editKey()`)
 * - options, for Epic UI's pages (`spell-comments.entry.js`), whose site has its own Cmd / Ctrl + K, its search:
 *   - `search(words)`:  what's typed that isn't an id (`ID_LIKE`) goes to it, the site's search (epic `epic-engine`
 *     T11, J:  one key for both, as on a guide;  `/` still opens the search straight away)
 *   - `host`:  where the dialog goes, a `<ui-root>` that loads its elements (the site's, which loads what's added to
 *     it);  default `<body>`
 *   - `first`:  listen before the page's own handlers (window, capture), so the site's search doesn't take the key too
 */
export function wireJumpKey(go, canGo, { search, host, first = false } = {}) {
  const onKey = (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.defaultPrevented) return
    const epicPage = document.body.classList.contains("plan-doc")
    if (event.key.toLowerCase() !== "k" || event.isComposing || !(epicPage || commentsOnPage())) return
    if (document.querySelector("dialog[open], ui-modal:not([hidden])") || typingIn(event)) return
    event.preventDefault()
    event.stopPropagation()
    openJumpPrompt(go, canGo, { search, host: typeof host === "function" ? host() : host })
  }
  if (first) addEventListener("keydown", onKey, { capture: true })
  else document.addEventListener("keydown", onKey)
}

/**
 * The jump dialog:  an id typed, Go lands there;  Cancel or Escape just closes it.
 * - a comment's id (`M3`) lands on its thread, opened;  the threads waiting on Owen are listed under the box
 *   (`jumpWaitingList()`)
 * - `search`, `host`:  as `wireJumpKey()` takes them
 */
function openJumpPrompt(go, canGo, { search, host } = {}) {
  const epicPage = document.body.classList.contains("plan-doc")
  const header = epicPage ? "Jump to which item?" : search ? "Jump to a comment, or search" : "Jump to which comment?"
  const input = el("input", { type: "text", autofocus: true, autocomplete: "off", spellcheck: "false" })
  const miss = el("p", { class: "spell-jump-miss", role: "alert", hidden: true })
  const approve = el("ui-button", { class: "approve", primary: true }, "Go")
  const waiting = jumpWaitingList((id) => {
    input.value = id
    approve.click()
  })
  const modal = el(
    "ui-modal",
    { size: "tiny", closedby: "closerequest", header, "data-spell-added": true },
    el(
      "ui-content",
      {},
      el(
        "label",
        { class: "ui-native spell-jump" },
        epicPage
          ? "Its id:  J7, q3, P2, M3 ..."
          : search
            ? "A comment's id (M3), any id on the page, or words to search the site"
            : "Its id:  M3, or any id on the page",
        input
      ),
      miss,
      waiting
    ),
    el("ui-actions", {}, el("ui-button", { class: "cancel" }, "Cancel"), approve)
  )
  let target = ""
  let thread = ""
  let words = ""
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return
    // its default would press what has the focus by then:  a comment's thread takes it to its fold, which folds it
    event.preventDefault()
    approve.click()
  })
  input.addEventListener("input", () => (miss.hidden = true))
  modal.addEventListener("ui-approve", (event) => {
    const typed = input.value.trim()
    const id = typed.replace(/^#/, "").toLowerCase()
    const comment = commentsOnPage()?.find(id)
    if (comment) {
      thread = comment.id
      return
    }
    if (id && canGo(id)) {
      target = id
      return
    }
    if (search && typed && !ID_LIKE.test(typed)) {
      words = typed
      return
    }
    // stays open:  says what it couldn't find
    event.preventDefault()
    miss.textContent = id ? `No ${typed} on this page.` : "Type an id first."
    miss.hidden = false
    input.select()
  })
  modal.addEventListener(
    "ui-hide",
    () => {
      modal.remove()
      if (thread) void commentsOnPage()?.landOn(thread)
      else if (target) go(target)
      else if (words) void search(words)
    },
    { once: true }
  )
  ;(host ?? document.body).append(modal)
  modal.visible = true
  // the input once the dialog has drawn:  `autofocus` alone loses to the dialog's own focus on some opens;  an element
  // the page's root loads (Epic UI's) draws a frame or two later
  void customElements
    .whenDefined("ui-modal")
    .then(() => {
      modal.visible = true
      return nextFrames(2)
    })
    .then(() => input.focus())
}

/**
 * The jump dialog's list of the threads waiting on Owen (Claude spoke last;  `PageComments.waitingOnOwen`), in page
 * order:  a line each, "M3 · his first words", that `pick(label)` takes;  `undefined` when none wait, or the page takes
 * no comments.
 * - Spell UI's menu (epic `epic-engine` P3):  a `<ui-menu vertical secondary link>`, its title a header item, each line
 *   a `<ui-item>` button, so it takes the focus, and Enter
 */
function jumpWaitingList(pick) {
  const waiting = commentsOnPage()?.waitingInPageOrder() ?? []
  if (!waiting.length) return undefined
  const title = waiting.length === 1 ? "Waiting on you:" : `${waiting.length} waiting on you:`
  const lines = waiting.map((comment) => {
    const label = ThreadFacts.label(comment.id)
    const tip = `${ThreadFacts.aboutTip({ id: comment.id, place: comment })}\n(Jump there)`
    const line = el(
      "ui-item",
      { class: "spell-jump-thread", title: tip },
      el("b", {}, label),
      " · ",
      el("span", {}, firstWords(comment.text))
    )
    line.addEventListener("click", () => pick(label))
    titleInside(line, "item")
    return line
  })
  return el(
    "ui-menu",
    { class: "spell-jump-waiting", vertical: true, secondary: true, fluid: true, link: true, "aria-label": title },
    el("ui-item", { class: "spell-jump-waiting-title", type: "header" }, title),
    ...lines
  )
}

/** Is `event`'s key typed into a field (an input, a textarea, a select, editable text)? */
function typingIn(event) {
  return event
    .composedPath()
    .some((node) => node instanceof Element && (node.isContentEditable || node.matches(`${FIELDS}, textarea, input`)))
}
