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

import { nextFrame } from "spell/util/dom"
import { commentsOnPage, firstWords } from "./spell-doc-comments.js"
import { FIELDS, el, titleInside } from "./spell-doc-helpers.js"
import { ThreadFacts } from "spell/epic/comments"

////////////////
// ## The toolbar
////////////////

/**
 * A TITLED toolbar's items (a guide's, a details page's, Epic UI's):  one per top-level section, its mark and title.
 * - `groups`:  `{ element, id, label, glyph }` each, the outline's top-level entries
 * - `badgesOf(element)`:  its badges (`[kind, number, words]`, `toolbarItem()`);  none:  `[]`
 * - the mark:  an item's number for an item (`Q3 · When?` shows 3, coloured by the section's `data-state`:  a
 *   details page's questions, `<epic-ask>`);  else its `<ui-icon>`;  else its number (`2.`);  else its access letter,
 *   shown only while the titles are hidden (the menu's `:state(icons-only)`)
 * - the title without its number (`2. Markup` is `Markup`), unless it's an item's
 * - its ACCESS LETTER:  unique on the toolbar (`accessLetters()`), drawn IN its title (bold, the text's colour);
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
            : el(
                "b",
                { slot: "icon", class: "spell-toolbar-letter" },
                (letters[index] ?? label.charAt(0)).toUpperCase()
              ),
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
 * components for these pages?"):  Spell UI's menu, `<ui-menu class="spell-toolbar" appearance="secondary">`, a `<nav>` landmark of
 * `<ui-item>` links (`toolbarItem()`), its look `spell-toolbar.css`'s, through the menu's tokens.
 * - the current item `selected` (scroll-follow), which the menu draws, and says (`aria-current`)
 * - `titled`:  a guide's (and Epic UI's), each item its mark and its title (`spell-toolbar-titled`);  else an epic
 *   page's, marks only, every item the same width
 *   - its titles fit the row:  `<ui-toolbar shrinkable>`, Spell UI's own fitting (epic `ui-gaps` P13):  the longest
 *     end in `...` first;  once one would be cut under 50px, the marks only, each title its tooltip;  narrower still,
 *     one `...` button whose menu holds every section (Owen, 2026-10-10:  "remove the titles entirely if they each
 *     only get less than 50px")
 *   - except a `segmented` one:  it scrolls, every title whole, its `‹` / `›` showing what's past either end
 * - an epic page's:  it scrolls too, its `‹` / `›` showing what's past either end
 * - after the items, what a page or the comments add to the row:  the toolbar's bullhorn (`PageComments`), the spell
 *   syntax guide's Expand all and Collapse all;  the items scroll sideways under them (`spell-toolbar.css`)
 * - `segmented`:  the toolbar under a page's tabs (Spell UI's components pages) is a SEGMENTED menu, as the tabs are:
 *   the same pills, and the same sliding key as the section being read changes
 * - the current item scrolled into view, on a row scrolled sideways (`scrollIntoRow()`)
 * - SIDE EFFECT:  removes the toolbar built before (`removeToolbar()`), keeping what was added to its row
 */
export function toolbarMenu(items, { titled, segmented = false }) {
  const kept = removeToolbar()
  // Spell UI's `<ui-toolbar>` where the page has it:  `‹` / `›` buttons while its items overflow (an epic page's
  // marks on a phone too, epic `epic-engine` I138:  the 6th was cut, nothing saying more was past it)
  const tag = customElements.get("ui-toolbar") ? "ui-toolbar" : "ui-menu"
  const toolbar = el(tag, {
    class: ["spell-toolbar", titled && "spell-toolbar-titled", segmented && "spell-toolbar-segmented"]
      .filter(Boolean)
      .join(" "),
    ...(segmented ? { appearance: "segmented" } : { appearance: "secondary" }),
    shrinkable: titled && !segmented,
    "aria-label": "Sections",
    "data-spell-added": true
  })
  toolbar.append(...items, ...kept)
  if (titled) {
    wireAccessLetters()
    wireKeyTips(toolbar)
  }
  new MutationObserver((changes) => {
    for (const { target } of changes) if (target.hasAttribute("selected")) scrollIntoRow(target)
  }).observe(toolbar, { attributeFilter: ["selected"], subtree: true })
  return toolbar
}

/**
 * A titled toolbar's ACCESS LETTERS:  a letter pressed on its own jumps to the item whose `data-key` it is,
 * as clicking it does (the link inside the item is clicked).
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

/** Whether the page listens for access letters yet (`wireAccessLetters()`):  once per page. */
let accessLettersWired = false

/**
 * A titled toolbar's KEY TIPS:  under the pointer or the keyboard's focus, an item with an access letter shows
 * "Type T to jump to this section", the letter as a key cap.
 * - ONE tip per page (`.spell-toolbar-tip`), a `popover` in the top layer:  the toolbar's row scrolls sideways, which
 *   would clip a tip inside it
 * - placed under the item, centred on it, kept inside the window;  gone at once as the pointer leaves, focus moves on,
 *   the page scrolls or the item is clicked
 * - under the pointer only after a second of resting on the item (`TIP_DELAY_MS`);
 *   the keyboard's focus shows it at once
 * - the item's accessible name says the same (`aria-keyshortcuts`):  the tip is for the eye only (`aria-hidden`)
 */
function wireKeyTips(toolbar) {
  const tip = keyTip()
  let waiting
  const show = (event) => {
    const item = event.target.closest?.("ui-item[data-key]")
    if (!item || !toolbar.contains(item)) return
    clearTimeout(waiting)
    if (event.type === "pointerover") waiting = setTimeout(() => showUnder(item), TIP_DELAY_MS)
    else showUnder(item)
  }
  const showUnder = (item) => {
    const box =
      item.shadowRoot?.querySelector('[part~="item"]')?.getBoundingClientRect() ?? item.getBoundingClientRect()
    tip.querySelector("kbd").textContent = item.dataset.key.toUpperCase()
    if (!tip.matches(":popover-open")) tip.showPopover()
    const width = tip.offsetWidth
    tip.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, box.left + box.width / 2 - width / 2))}px`
    tip.style.top = `${box.bottom + 6}px`
  }
  const hide = () => {
    clearTimeout(waiting)
    if (tip.matches(":popover-open")) tip.hidePopover()
  }
  toolbar.addEventListener("pointerover", show)
  toolbar.addEventListener("focusin", show)
  toolbar.addEventListener("pointerleave", hide)
  toolbar.addEventListener("focusout", hide)
  toolbar.addEventListener("click", hide)
}

/** How long the pointer rests on an item before its key tip shows (`wireKeyTips()`). */
const TIP_DELAY_MS = 1000

/** The page's one key tip (`wireKeyTips()`), made the first time a toolbar asks. */
function keyTip() {
  const found = document.querySelector("body > .spell-toolbar-tip")
  if (found) return found
  const tip = el(
    "div",
    { class: "spell-toolbar-tip", popover: "manual", "aria-hidden": "true", "data-spell-added": true },
    "Type ",
    el("kbd"),
    " to jump to this section"
  )
  document.body.append(tip)
  addEventListener("scroll", () => tip.matches(":popover-open") && tip.hidePopover(), { passive: true })
  return tip
}

/** A focused element that takes letters itself:  a control with a role or a custom element of its own. */
function takesKeys(element) {
  return element.matches(
    '[role="menu"], [role="menubar"], [role="listbox"], [role="combobox"], [role="grid"], [role="tree"], ' +
      '[role="slider"], [role="tablist"], ui-dropdown, ui-select, ui-search, ui-calendar, ui-menu, ui-tabs, ' +
      "ui-example *, ui-example"
  )
}

/**
 * One toolbar item:  a `<ui-item>` link to section `id` (`data-rail`), its mark (`glyph`, the menu's icon box;  else
 * `mark`, a `slot="icon"` element), its `title` when the toolbar is titled (a plain `<span>` in the item:  a
 * shrinkable menu's item draws it in its title box, and cuts it there), its `badges` (`[kind, number, words]`:  `<ui-label slot="badge">`s, over
 * the mark's top right on an epic page), `state` (`data-state`, a details page's question's colour).
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
      link: `#${id}`,
      "data-rail": id,
      icon: glyph,
      // an item with an access letter says it in the toolbar's own tooltip (`wireKeyTips()`), not the browser's:
      // an empty one, so the menu draws none either, with the icons only
      title: letter ? "" : said,
      "aria-label": said,
      "aria-keyshortcuts": letter?.toUpperCase(),
      "data-key": letter,
      "data-state": state
    },
    mark,
    // one box for the title and its access letter:  loose, the item's flex row would part them ("T ypes")
    title && el("span", {}, ...titleWithKey(title, letter)),
    ...badges.map(([kind, number]) =>
      el(
        "ui-label",
        { class: `spell-toolbar-count ${kind}`, slot: "badge", appearance: "circular", size: "mini" },
        String(number)
      )
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

/** What a typed id looks like (`C3`, `j7`, `cm3`, `#p2`):  on Epic UI's pages, anything else is words to search. */
const ID_LIKE = /^#?[a-z]{1,2}\d+$/i

/**
 * Cmd-K (Ctrl-K) on an epic page asks which item to jump to (Owen, 2026-10-10:  "add command-k which brings up
 * ui-prompt asking what number I want to jump to (e.g. J7)"), and lands there exactly as a link to `#j7` does
 * (`go()`:  what hides it unfolds, an item opens, it lands below the stuck titles).
 * - any id on the page, case and a `#` aside:  `J7`, `q3`, `P2`, `o1`, `#decisions`
 * - a COMMENT's (epic `epic-workflow` P23;  Owen, 2026-10-10:  "⌘K taking comment ids"):  `C3` (`c3`, the old `cm3`;
 *   `M3` is a manual test's since epic `epic-engine` P44)
 *   lands on its thread, opened, below the stuck titles (`PageComments.landOn()`);  under the box, the threads
 *   waiting on Owen (Claude spoke last), each a line "C3 · his first words" that lands there
 * - an epic page, and every page that takes comments (a guide, Epic UI's pages:  comment ids, and any other id on it)
 * - an id that isn't there:  the dialog says so and stays open, the text selected for typing over
 * - never while typing in a field (a note box, the new item form), nor with a dialog already open
 * - the dialog is a `<ui-modal>` built as `UI.modals.prompt()` builds its own (`ModalDialogs`):
 *   no `<ui-prompt>` element exists, and `prompt()` closes on any answer, so it couldn't stay open on a miss;
 *   here its cancelable `ui-approving` is cancelled instead
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
 * - a comment's id (`C3`) lands on its thread, opened;  the threads waiting on Owen are listed under the box
 *   (`jumpWaitingList()`)
 * - `search`, `host`:  as `wireJumpKey()` takes them
 */
function openJumpPrompt(go, canGo, { search, host } = {}) {
  const epicPage = document.body.classList.contains("plan-doc")
  const header = epicPage ? "Jump to which item?" : search ? "Jump to a comment, or search" : "Jump to which comment?"
  const input = el("input", { type: "text", autofocus: true, autocomplete: "off", spellcheck: "false" })
  const miss = el("p", { class: "spell-jump-miss", role: "alert", hidden: true })
  const approve = el("ui-button", { class: "approve", color: "primary" }, "Go")
  const waiting = jumpWaitingList((id) => {
    input.value = id
    approve.click()
  })
  const modal = el(
    "ui-modal",
    { size: "tiny", closedby: "closerequest", heading: header, "data-spell-added": true },
    el(
      "ui-content",
      {},
      el(
        "label",
        { class: "ui-native spell-jump" },
        epicPage
          ? "Its id:  J7, q3, P2, C3 ..."
          : search
            ? "A comment's id (C3), any id on the page, or words to search the site"
            : "Its id:  C3, or any id on the page",
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
  modal.addEventListener("ui-approving", (event) => {
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
    "ui-closed",
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
      return nextFrame(2)
    })
    .then(() => input.focus())
}

/**
 * The jump dialog's list of the threads waiting on Owen (Claude spoke last;  `PageComments.waitingOnOwen`), in page
 * order:  a line each, "C3 · his first words", that `pick(label)` takes;  `undefined` when none wait, or the page takes
 * no comments.
 * - Spell UI's menu (epic `epic-engine` P3):  a `<ui-menu direction="vertical" appearance="secondary link">`, its title a header item, each line
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
    {
      class: "spell-jump-waiting",
      direction: "vertical",
      appearance: "secondary link",
      fluid: true,
      "aria-label": title
    },
    el("ui-item", { class: "spell-jump-waiting-title", kind: "header" }, title),
    ...lines
  )
}

/** Is `event`'s key typed into a field (an input, a textarea, a select, editable text)? */
function typingIn(event) {
  return event
    .composedPath()
    .some((node) => node instanceof Element && (node.isContentEditable || node.matches(`${FIELDS}, textarea, input`)))
}
