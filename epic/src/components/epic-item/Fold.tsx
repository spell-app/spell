import type { Accessor } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { ACTIONS_SLOT } from "./Fold.types"

/****************
 * ### `Fold`
 * The open / folded state of a box an `<epic-*>` element folds by itself, never written to the file.
 * - The boxes that fold by one:
 *   - Choices, an answered question's option panels, More Details, Original Discussion,
 *     an aside or code panel, the Agents running panel
 *   - every card with a heading band:  a reply, the answer, a status card, a note
 *     (Owen, 2026-10-08, "everything in a section box should be collapsible")
 *   - NOT `<epic-item>`:  it folds through its `open` attribute, as links and P9 open it from outside
 * - Built on the kit's `Disclosure` (`spell/element`;  epic `coherence` P8):  its open state, `aria-expanded`,
 *   find-in-page opening it;  no events, as nothing outside listens to a card's fold.
 * - Starts as `initial()` says, and follows it until the reader toggles it:
 *   an option panel opens while its option is the chosen one.
 * - Or KEPT outside it (`kept`):  the element's own `open` attribute, page state the live patch keeps
 *   (a request in a phase's Requests field, `<epic-field>`);  then `initial()` is never read.
 * - The content box takes `hidden()`, and `watch` as its ref:
 *   folded, it's `hidden="until-found"`, so find-in-page reaches the text and unfolds it (`beforematch`).
 * - A card's heading band takes `heading` as its ref, with its fold button (`button()`) first in it:
 *   a click anywhere on the band folds, but on a link or another control in it.
 * - Draws the pieces every fold shares:
 *   - its fold button (`fold.button()`):  chevron, label, tooltip, for a card's band and every panel's title
 *     - THE fold button of every `<epic-*>` element (epic `coherence` P22):  an item's line and an option's header
 *       draw it too, on an open state of their own (`Fold.button()`, `Fold.band()`, handed an `Opener`)
 *   - the chevron (`Fold.chevron()`)
 *   - the page toolbar's one expand-all / collapse-all button (`Fold.toggleAllButton()`)
 *   - the box of a title row's `actions` slot (`Fold.actions()`):  the page's own buttons there
 * - Those are methods, not tags of their own (P10):
 *   - the button is named by `aria-labelledby`, whose ids must be in the same shadow root as the card's heading:
 *     a tag would put a shadow root between them
 *   - the chevrons must be on screen in the first frame, with no wait for an element to upgrade
 * - Its listeners are added by its refs, by hand:  `Fold` is no component, so no `@E.on`.
 * - ⌥-click (Alt-click) on any fold's chevron or title, or ⌥+Enter / ⌥+Space on its chevron, opens it AND
 *   everything inside it;  on an open one, folds it and everything inside it (`Fold.toggleFrom()`;  epic `epic-engine`
 *   I161, Owen, 2026-10-29:  "combine the 'expand/collapse all' with the normal disclosure triangle -- holding down
 *   option is 'expand all'").  Every chevron's tooltip says so (`DEEP_TIPS`).
 ****************/
export class Fold implements Opener {
  constructor(initial: Accessor<boolean>, kept?: KeptFold) {
    this.disclosure = new E.Disclosure({ initial, kept })
  }

  /** The open state:  the reader's choice (or `kept`'s), else `initial()`. */
  readonly disclosure: E.Disclosure

  ////////////////
  // ## Open or folded
  ////////////////

  /** Open?  Tracked. */
  readonly isOpen = (): boolean => this.disclosure.isOpen

  /** The content box's `hidden`:  `until-found` while folded;  tracked. */
  readonly hidden = (): "until-found" | undefined => this.disclosure.hidden

  /** Open if folded, fold if open:  a click on its header. */
  readonly toggle = () => {
    this.disclosure.toggle()
  }

  /**
   * ⌥-click:  open it and everything inside `host` (its element), or fold them all (`Fold.toggleFrom()`).
   * - `host`:  the element whose shadow root draws the fold;  what's inside it, its light children
   */
  readonly toggleDeep = (event: Event) => Fold.toggleDeepUnder(this, Fold.hostOf(event))

  /** Fold it, if open (collapse-all, `foldAllUnder()`);  true when it was open. */
  readonly close = (): boolean => this.disclosure.close()

  /** Open it, if folded, as the reader would (expand-all, `expandAllUnder()`);  true when it was folded. */
  readonly open = (): boolean => this.disclosure.open()

  /** The content box's ref:  find-in-page matched inside the folded box, which the browser has revealed. */
  readonly watch = (content: HTMLElement) => this.disclosure.revealOnMatch(content)

  ////////////////
  // ## Drawing
  ////////////////

  /** THE fold button of this fold (`Fold.button()`). */
  button(options: FoldButtonOptions): JSX.Element {
    return Fold.button(this, options)
  }

  /**
   * THE fold button, of `opener`'s fold:  the chevron, then its `label`;  its `aria-expanded` as the fold stands,
   * its tooltip (`tips`) what a click does.
   * - Its kinds:
   *   - FIRST in a card's heading band, so everything boxed in a section folds (Owen, 2026-10-08):
   *     `<epic-reply>`, `<epic-answer>`, `<epic-status>`, `<epic-note>`, an `<epic-update>` note, `<epic-updated>`
   *     - named by the heading's words (`labelledBy`:  ids in the same shadow root), no `label`
   *     - no click handler of its own:  its band's (`heading`) takes a click on it, Enter and Space too,
   *       and a click on the rest of the band
   *   - FIRST on an item's line, the chevron alone, named by its tooltip:  the line is its band (`Fold.band()`),
   *     on the item's own open state (its details, or its note box under the line)
   *   - a panel's whole title, `clicks` (it folds on its own click), its words its `label`:
   *     More Details, Original Discussion, Choices, an option's panel (answering or reviewed), an aside or code panel
   * - Named by `labelledBy`, else its `label`, else its tooltip (`aria-label`)
   * - `options` is read as the button draws:  a getter there (an item's `controls`, an option's `tips`) follows
   * - Always `FOLD_BUTTON` among its classes:  how its band knows it
   * - The chevron turns down while open (`Fold.css`, or the element's own sheet).
   * - Its tooltip ends with what ⌥-click does (`DEEP_TIPS`;  not its name):  the click itself is `Fold.toggleFrom()`'s
   */
  static button(opener: Opener, options: FoldButtonOptions): JSX.Element {
    const tip = () => (opener.isOpen() ? options.tips.fold : options.tips.unfold)
    return (
      <button
        type="button"
        class={options.className ? [FOLD_BUTTON, options.className] : FOLD_BUTTON}
        part={options.part}
        aria-expanded={opener.isOpen() ? "true" : "false"}
        aria-controls={options.controls}
        aria-labelledby={options.labelledBy}
        aria-label={options.labelledBy || options.label !== undefined ? undefined : tip()}
        title={Fold.withDeepTip(tip(), opener.isOpen())}
        onClick={options.clicks ? (event: MouseEvent) => Fold.toggleFrom(opener, event) : undefined}
        onKeyDown={(event: KeyboardEvent) => Fold.deepKey(event) && Fold.toggleFrom(opener, event)}
      >
        {Fold.chevron()}
        {options.label}
      </button>
    )
  }

  /**
   * The fold chevron every `<epic-*>` fold draws:  a right-pointing stroke, turned down by its sheet while open.
   * - Where:  an item's line, Choices, an answered question's option panels, More Details, Original Discussion,
   *   a card's fold button
   * - Drawn here, not from an icon pack:  on screen in the first frame,
   *   and its box is exactly its 16-unit view box, so it centres where its sheet puts it.
   * - Its look (size, stroke, the turn) is each sheet's:  `svg.chevron`.
   */
  static chevron(): JSX.Element {
    return (
      <svg class={CHEVRON} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M6 3.5 10.5 8 6 12.5" />
      </svg>
    )
  }

  /**
   * ONE button for expand-all and collapse-all (Owen, 2026-10-25:  "Instead of two buttons for expand all / collapse
   * all, have one button that toggles"):  chevrons down while it would open everything, up once it has
   * - the page toolbar's only:  a fold's title does it with ⌥-click on its chevron (`Fold.toggleFrom()`, I161)
   * - `expanded()`:  what its owner last did with it (and still holds:  folding the owner by hand resets it)
   */
  static toggleAllButton({ expandLabel, collapseLabel, part, expanded, onToggle }: ToggleAllOptions): JSX.Element {
    const label = () => (expanded() ? collapseLabel : expandLabel)
    return (
      <button
        type="button"
        class={COLLAPSE_ALL}
        part={part}
        aria-label={label()}
        title={label()}
        aria-pressed={expanded() ? "true" : "false"}
        onClick={onToggle}
      >
        <svg class={CHEVRONS} viewBox="0 0 16 16" aria-hidden="true">
          <path
            d={expanded() ? "M4 8.5 8 4.5 12 8.5M4 12.5 8 8.5 12 12.5" : "M4 3.5 8 7.5 12 3.5M4 7.5 8 11.5 12 7.5"}
          />
        </svg>
      </button>
    )
  }

  /**
   * The box of a title row's ACTIONS SLOT (`Fold.types.ts`):  the page's own buttons there
   * (`<ui-button slot="actions">`), and the docs runtime's bullhorn.
   * - Each element puts it after its title, before its own buttons.
   * - A click in it never folds (`CONTROLS`).
   * - `hidden` while nothing is slotted, so an empty box takes no room:  read where it's drawn, so it follows.
   */
  static actions({ part, hidden }: ActionsBoxOptions): JSX.Element {
    return (
      <span class={ACTIONS_BOX} part={part} hidden={hidden?.()}>
        <slot name={ACTIONS_SLOT} />
      </span>
    )
  }

  ////////////////
  // ## The heading band
  ////////////////

  /** A card's heading band's ref:  a click on it folds or unfolds (`Fold.band()`). */
  readonly heading = Fold.band(this)

  /**
   * The ref of a HEADING BAND that folds `opener`:  a card's heading, an item's line.  A click on it folds or unfolds:
   * - on its fold button (`Fold.button()`):  a click, Enter or Space
   * - on any other spot, unless it's a link or another control in the band (`CONTROLS`),
   *   or the end of a drag selecting its words
   * - nothing to fold (the band draws no fold button):  nothing
   * - a native listener, not JSX's `onClick`:  Solid delegates that to the document, where the click's
   *   `currentTarget` (where the band ends) is gone
   */
  static band(opener: Opener): (band: HTMLElement) => void {
    return (band) => band.addEventListener("click", (event) => Fold.clickOnBand(event, opener))
  }

  /** A click on a heading band:  `opener` folds or unfolds, as `Fold.band()` says. */
  private static clickOnBand(event: MouseEvent, opener: Opener) {
    const band = event.currentTarget as Element
    if (!band.querySelector(`.${FOLD_BUTTON}`)) return
    for (const target of event.composedPath()) {
      if (!(target instanceof Element) || target === band) break
      if (target.classList.contains(FOLD_BUTTON)) return void Fold.toggleFrom(opener, event)
      if (target.matches(CONTROLS)) return
    }
    // a drag that selected words isn't a click on them;  words selected in a FIELD are no drag (an item's note box's
    // "do it", selected):  Chrome reads them out of the selection, but as a collapsed one
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && String(selection)) return
    Fold.toggleFrom(opener, event)
  }

  ////////////////
  // ## ⌥-click:  everything inside
  ////////////////

  /**
   * A click (or Enter / Space) on a fold's chevron or title:  `opener` folds or unfolds;  with ⌥ (Alt) held, it
   * and everything inside it (epic `epic-engine` I161).
   * - ⌥:  `opener.toggleDeep()` when it has one (a section, a phase, an item), else its box and the light children of
   *   the element drawing it (`toggleDeepUnder()`)
   * - Enter / Space click the button:  the browser's click carries the keys held (⌥+Enter too)
   */
  static toggleFrom(opener: Opener, event?: Event): unknown {
    if (!Fold.isDeep(event)) return opener.toggle(event)
    return opener.toggleDeep ? opener.toggleDeep(event!) : Fold.toggleDeepUnder(opener, Fold.hostOf(event!))
  }

  /**
   * ⌥+Enter or ⌥+Space on a fold button:  true, its own activation stopped (`preventDefault()`), so the caller toggles
   * it deep (`toggleFrom()`).
   * - why:  Chromium clicks no button for Enter or Space with ⌥ held;  macOS's ⌥+Space types a no-break space, so by
   *   `code`
   */
  static deepKey(event: KeyboardEvent): boolean {
    if (!event.altKey || !DEEP_KEYS.includes(event.code)) return false
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  /** ⌥ (Alt) held through `event`:  everything inside too. */
  static isDeep(event?: Event): boolean {
    return !!event && (event as Partial<MouseEvent>).altKey === true
  }

  /**
   * Open `opener` and every block, item, card and panel inside `host` (`expandAllUnder()`, `cards`);  open, fold it
   * and all of them (`foldAllUnder()`).
   * - no `host`:  `opener` alone
   * - returns whether `opener` changed
   */
  static toggleDeepUnder(opener: Opener, host: Element | undefined): boolean {
    const opening = !opener.isOpen()
    if (opening) {
      opener.toggle()
      if (host) expandAllUnder(host, { cards: true })
    } else {
      if (host) foldAllUnder(host)
      opener.toggle()
    }
    return opening === opener.isOpen()
  }

  /** The element whose shadow root `event` started in:  the card or panel drawing the fold. */
  static hostOf(event: Event): Element | undefined {
    const start = event.composedPath()[0]
    const root = start instanceof Node ? start.getRootNode() : undefined
    return root instanceof ShadowRoot ? root.host : undefined
  }

  /** `tip`, then what ⌥-click does, on a line of its own (`DEEP_TIPS`). */
  static withDeepTip(tip: string, isOpen: boolean): string {
    return `${tip}\n${isOpen ? DEEP_TIPS.fold : DEEP_TIPS.open}`
  }
}

/**
 * What ⌥-click on a fold's chevron does, the last line of its tooltip (epic `epic-engine` I161):  every fold's, and
 * `<ui-section>`'s in the epic page's blocks (`EpicFold`).
 * - English only, as the epic page is;  a key of no one vocabulary, as `Fold` is no component
 */
export const DEEP_TIPS = {
  /** folded */
  open: "⌥-click:  open everything inside",
  /** open */
  fold: "⌥-click:  fold everything inside"
} as const

/**
 * What a fold button and its band fold (`Fold.button()`, `Fold.band()`):  a `Fold`, or an element's own open state
 * (`<epic-item>`'s).
 */
export type Opener = {
  /** open?  tracked */
  isOpen: () => boolean
  /** fold if open, open if folded:  a click on the button or its band, `originalEvent` */
  toggle: (originalEvent?: Event) => unknown
  /** ⌥-click:  open it and everything inside, or fold them all (`Fold.toggleFrom()`);  else `toggleDeepUnder()` */
  toggleDeep?: (originalEvent: Event) => unknown
}

/**
 * Fold everything under `root`:  collapse-all (Owen, 2026-10-10:  "close everything underneath it").
 * - who:  the page toolbar's toggle-all, and ⌥-click on an open fold's chevron (`Fold.toggleFrom()`,
 *   `EpicFold.toggleDeep()`)
 * - every `<epic-*>` element inside it that folds, in page order:
 *   - sections, phases and items through their own `collapse()`:  the cancelable `ui-closing`, as a click's,
 *     so the page remembers a section's fold as usual
 *   - every card and panel (an aside, a code block, a reply, Choices ...) through its `fold` (`Fold.close()`)
 * - `root` itself stays as it is;  so do the boxes in its shadow root (its own `collapseAll()` folds those)
 * - returns how many it folded
 */
export function foldAllUnder(root: Element): number {
  let folded = 0
  for (const element of root.querySelectorAll("*")) {
    if (!element.localName.startsWith(EPIC_PREFIX)) continue
    const component = (element as Partial<E.DOMElement>).component as Collapsible | undefined
    if (!component) continue
    const closed = component.collapse ? component.collapse() : component.fold instanceof Fold && component.fold.close()
    if (closed) folded++
  }
  return folded
}

/**
 * Open everything under `root`:  expand-all.
 * - the page toolbar's (Owen, 2026-10-13:  "Add expand all button next to collapse all"):
 *   - every section, phase and item inside it, through their own `expand()`:  the cancelable `ui-opening`, as a click's,
 *     so the page remembers each as a click's
 *   - NOT a block that stays folded (`staysFolded`:  the Log;  epic `epic-engine` I155), nor what's inside it
 *   - NOT the cards and panels inside them (asides, code, replies ...):  those stay as the reader left them, so an
 *     opened page reads as a list of items, not every aside at once
 * - ⌥-click on a fold's chevron (`cards`, `EpicFold.expandAll()`, `Fold.toggleFrom()`;  Owen, 2026-10-20 and
 *   2026-10-29):  the cards and panels too, through their
 *   `fold` (`Fold.open()`):  the reader's toggles, as if each were opened by hand;  collapse-all's mirror
 * - returns how many it opened
 */
export function expandAllUnder(root: Element, { cards = false }: { cards?: boolean } = {}): number {
  let opened = 0
  for (const element of root.querySelectorAll("*")) {
    if (!element.localName.startsWith(EPIC_PREFIX)) continue
    const component = (element as Partial<E.DOMElement>).component as Collapsible | undefined
    if (!component || insideFolded(element, root)) continue
    const open = component.expand
      ? component.expand()
      : (cards || !!component.opensWithAll) && component.fold instanceof Fold && component.fold.open()
    if (open) opened++
  }
  return opened
}

/** `element` is, or is inside, a block under `root` that stays folded (`staysFolded`):  expand-all leaves it alone. */
function insideFolded(element: Element, root: Element): boolean {
  for (let at: Element | null = element; at && at !== root; at = at.parentElement) {
    const component = (at as Partial<E.DOMElement>).component as Collapsible | undefined
    if (component?.staysFolded) return true
  }
  return false
}

/**
 * What `foldAllUnder()` folds and `expandAllUnder()` opens:  a component that folds itself (`collapse()`,
 * `expand()`), or one with a box that folds (`fold`).
 */
type Collapsible = {
  /** fold it as a click would;  true when it was open */
  collapse?: () => boolean
  /** open it as a click would;  true when it was folded */
  expand?: () => boolean
  /** its box's fold */
  fold?: unknown
  /** the page's expand-all opens its `fold` too, not only ⌥-click (`<epic-field>`'s named fields, I167) */
  opensWithAll?: boolean
  /** expand-all leaves it, and what's inside it, folded (`EpicSection.staysFolded`:  the Log) */
  staysFolded?: boolean
}

/** The keys that, with ⌥, open or fold a fold and everything inside it (`Fold.deepKey()`), by `KeyboardEvent.code`. */
const DEEP_KEYS = ["Enter", "NumpadEnter", "Space"]

/** Tag prefix of the epic page's elements:  only those fold. */
const EPIC_PREFIX = "epic-"

/** Where a `Fold` keeps its state when not in itself:  its element's `open` attribute (`<epic-field>`'s requests). */
export type KeptFold = {
  /** open?  tracked */
  isOpen: () => boolean
  /** the reader opened or folded it */
  setOpen: (open: boolean) => void
}

/** What `Fold.toggleAllButton()` takes. */
export type ToggleAllOptions = {
  /** its name and tooltip while it would open everything:  `Open everything in Questions` */
  expandLabel: string
  /** ... and once it has:  `Fold everything in Questions` */
  collapseLabel: string
  /** its `part`:  `toggle-all` in each owner's vocabulary */
  part: string
  /** is everything open (its owner's last use of it, still holding)? */
  expanded: () => boolean
  /** clicked:  open everything, or fold everything, as `expanded()` says */
  onToggle: () => void
}

/** What `Fold.actions()` takes. */
export type ActionsBoxOptions = {
  /** its `part`:  `actions` in each owner's vocabulary (`ACTIONS_PART_SPEC`), or the owner's own box's */
  part?: string
  /** nothing slotted:  hidden;  a function, read where the box is drawn (tracked) */
  hidden?: () => boolean
}

/** What `Fold.button()` takes:  read as the button draws (a getter follows). */
export type FoldButtonOptions = {
  /** the `id` of the box it folds;  none:  it folds no box of its own (an item's note box under its line) */
  controls?: string
  /** a card's:  the `id`s of the heading's words, space-separated:  its name */
  labelledBy?: string
  /** a panel's title:  its words, after the chevron;  its name */
  label?: JSX.Element
  /** its `part`:  `toggle` in every card's vocabulary */
  part: string
  /** its look's class, beside `FOLD_BUTTON`.  Default:  none, a card's look (`Fold.css`) */
  className?: string
  /** it folds on its own click (a panel's title);  a card's band takes the click instead */
  clicks?: boolean
  /** its tooltip while open (`fold`) and while folded (`unfold`):  the card's `foldTip` / `unfoldTip` texts */
  tips: FoldTips
}

/** A fold button's tooltips, from its card's vocabulary. */
export type FoldTips = {
  /** while open:  `Close this reply` */
  fold: string
  /** while folded:  `Open this reply` */
  unfold: string
}

/**
 * Class of EVERY fold button (`Fold.button()`):  how its band knows it, so a click on it always folds;
 * a card's look (`Fold.css`).
 */
export const FOLD_BUTTON = "fold-button"

/** Class word of a heading band that folds its card (it has a body):  a pointer over it (`Fold.css`). */
export const FOLDS = "folds"

/** Class of the box of a title row's `actions` slot (`Fold.actions()`). */
export const ACTIONS_BOX = "slotted-actions"

/**
 * What, on a line or a heading band, acts by itself:  a click there doesn't fold (`<epic-item>`'s line too).
 * - the `actions` slot and its box:  whatever the page put there acts by itself, even a plain `<span>`
 */
export const CONTROLS =
  "a[href], button, input, select, textarea, label, summary, [role='button'], [contenteditable], " +
  `slot[name='${ACTIONS_SLOT}'], .${ACTIONS_BOX}`

/** `Fold.chevron()`'s class. */
const CHEVRON = "chevron"

/** `Fold.toggleAllButton()`'s class:  its look, `CollapseAll.css`. */
const COLLAPSE_ALL = "collapse-all"

/** Its glyph's class. */
const CHEVRONS = "chevrons"
