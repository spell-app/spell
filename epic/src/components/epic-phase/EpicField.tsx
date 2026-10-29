import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"

// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"

// the fold pieces every `<epic-*>` fold shares:  their files, not `epic-item`'s barrel (which would define it here)
import { FOLDS, Fold } from "spell/epic/components/epic-item/Fold"
// Spell UI's page zoom (the docs runtime's too):  its plain-DOM leaf alone, so the pack holds no second `<ui-zoom>`
import { ImageZoom } from "spell/ui/components/ui-zoom/ImageZoom"

import { epicFieldVocabulary } from "./EpicField.en"
import { ICON, LABEL, TEXT } from "./EpicPhase.types"

import fieldCSS from "./EpicField.css?inline"
import requestsPageCSS from "./EpicField.requests.css?inline"
import foldCSS from "spell/epic/components/epic-item/Fold.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicField`
 * The component behind `<epic-field>`:  one named field of a phase (Symptom, Changes, Goal ...).
 * - its icon in a column, centred on the first line
 * - then its bold label (`Symptom:`) and its prose, wrapping beside the icon
 * - A labelled block in prose (`label`, no `name`:  `Where:`, P14):  the bold label and its prose, no icon column.
 * - Files and Verify are hidden until the Phases title's toggles show them
 *   (`--epic-files-display` / `--epic-verify-display`, inherited from the Phases section).
 * - A NAMED field folds (epic `epic-engine` I167;  Owen, 2026-10-29:  "These should be collapsable"):
 *   - a chevron before its icon (`fold.button()`);  a click on it, the icon or the label folds or opens it
 *   - folded, its label row stays, with a TASTE after the label:  one line of its text, cut off with "…";
 *     a field that's only a list, how many it holds ("3 items", "2 requests")
 *   - open to start with (today's look);  the reader's folds remembered per page, in this browser
 *     (`FieldFolds`:  `spell-field-folds:<path>`, keyed `<phase or item id>#<name>`)
 *   - ⌥-click on a phase's chevron, and the page's expand-all and collapse-all, reach it (its `fold`,
 *     `opensWithAll`);  ⌥-click on its own chevron opens or folds what's inside it too (a Requests field's requests)
 *   - a link or a comment landing inside opens it (`reveal()`, from the docs runtime), not remembered;
 *     find-in-page too (`hidden="until-found"`)
 *   - hidden by the Phases or phase's gear (Files, Verify:  I166), it's hidden whatever its fold;
 *     shown again, it's folded or open as the reader left it
 *   - NOT a labelled block (`Where:`, a manual test's Step and Should, a details page's Asked):  a line or two of
 *     prose in an item or a question that folds already;  a chevron on each would hide next to nothing
 * - To review:  its `<epic-mark item link>`s draw themselves, each in its item's state colour (epic `epic-engine` P45:
 *   this field coloured `<a href>` links by writing `data-spell-state` on them before).
 * - A REQUEST (a labelled field right inside a Requests field, as `epic file` writes it;  Owen, 2026-10-25, r31:
 *   "this needs to be collapsable.  Don't need to show image at full size, smaller with click to show in modal"):
 *   - a fold:  the chevron (`fold.button()`) and its label as the title row, folded to start with
 *   - open or folded is its `open` attribute (`Fold`'s `kept`):  page state the live patch keeps, never written
 *   - its screenshots are thumbnails, a page sheet's (`EpicField.requests.css`:  they're light DOM, out of reach of
 *     the shadow sheet);  a click shows one full size in the page's `<ui-zoom>` (Spell UI's `ImageZoom`), never its link
 *     (kept for a page without scripts, or opened from disk)
 ****************/
export class EpicField extends E.UIComponent<typeof epicFieldVocabulary> {
  @E.proto static vocabulary = epicFieldVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-fold-button": foldCSS, "epic-field": fieldCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** `open`:  a request unfolded (a boolean is always the DOM element's, see `@controlled`). */
  @E.controlled("open") accessor isMarkedOpen = false

  /** Its look:  icon and label key;  Symptom's for an unknown name. */
  get look(): FieldLook {
    return FIELD_LOOKS[(this.name ?? "symptom") as FieldName] ?? FIELD_LOOKS.symptom
  }

  /** Its icon. */
  readonly glyph = new E.IconGlyph({ owner: this, name: () => this.look.icon })

  /** A labelled block in prose (`label`, no `name`):  its label alone, no icon (P14). */
  get isLabelled(): boolean {
    return !this.name && !!this.label
  }

  /**
   * One request in a phase's Requests field (r31):  a labelled field right inside `<epic-field name="requests">`.
   * - its parent is read once connected:  `epic file` writes it there, nothing moves it
   */
  @E.cssState("request")
  get isRequest(): boolean {
    return this.isConnected && this.isLabelled && !!this.domElement.parentElement?.matches(REQUESTS)
  }

  /** A request's fold, kept in its `open` attribute;  never read for any other field. */
  private readonly requestFold = new Fold(() => false, {
    isOpen: () => !!this.isMarkedOpen,
    setOpen: (open) => (this.isMarkedOpen = open)
  })

  /** A named field (not a labelled block, nor a request):  it folds by its label row (I167). */
  get folds(): boolean {
    return !this.isLabelled
  }

  /**
   * Folded on this load, once the reader (or a link) folded or opened it;  `undefined`:  as remembered
   * (`FieldFolds`).
   */
  @E.state accessor isFoldedNow: boolean | undefined = undefined

  /** A named field's fold:  open unless the reader folded it;  each fold or open remembered (`FieldFolds`). */
  private readonly fieldFold = new Fold(() => true, {
    isOpen: () => !(this.isFoldedNow ?? FieldFolds.isFolded(this.foldKey)),
    setOpen: (open) => {
      this.isFoldedNow = !open
      FieldFolds.remember(this.foldKey, !open)
    }
  })

  /**
   * Its fold:  a request's, or a named field's.
   * - collapse-all and expand-all reach it here (`foldAllUnder()`, `expandAllUnder()`), and ⌥-click on a block
   *   around it
   */
  get fold(): Fold | undefined {
    return this.isRequest ? this.requestFold : this.folds ? this.fieldFold : undefined
  }

  /**
   * The page's expand-all opens it too, not only ⌥-click (`expandAllUnder()`):  a named field starts open, so the page
   * opened reads as it always did;  a request stays a card, folded until asked.
   */
  get opensWithAll(): boolean {
    return this.folds && !this.isRequest
  }

  /** Unfolded:  a request opened, or a named field not folded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.fold?.isOpen() ?? false
  }

  /**
   * A link or a comment landed inside it (the docs runtime's `reveal()`):  open it, NOT remembered, as a link's unfold
   * of a section isn't;  true when it was folded.
   */
  reveal(): boolean {
    if (this.isRequest) return this.requestFold.open()
    if (!this.folds || this.fieldFold.isOpen()) return false
    this.isFoldedNow = false
    return true
  }

  /**
   * Its key in the page's remembered folds:  `<phase or item id>#<name>`, `-2` on for a second field of that name
   * there;  `page#<name>` outside any.
   */
  get foldKey(): string {
    const name = this.name ?? "field"
    const container = this.domElement.parentElement?.closest(FOLD_CONTAINERS)
    const scope = container ?? this.domElement.getRootNode()
    const same = Array.from((scope as ParentNode).querySelectorAll(`epic-field[name="${name}"]`)).filter(
      (field) => field.parentElement?.closest(FOLD_CONTAINERS) === container
    )
    const place = same.indexOf(this.domElement) + 1
    return `${container?.id || "page"}#${name}${place > 1 ? `-${place}` : ""}`
  }

  /**
   * What a folded field shows after its label:  one line of its text (CSS cuts it off), else how many a list holds.
   * - its own words, never what the runtime added in it (comment threads:  `[data-spell-added]`)
   * - a mark (`<epic-mark item>`) reads as its item's id (`J9`)
   */
  @E.watches({ childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["item"] })
  get taste(): string {
    const own = Array.from(this.domElement.children).filter((child) => !child.matches(ADDED))
    if (this.name === REQUESTS_NAME) {
      const count = own.filter((child) => child.matches(REQUEST_CHILD)).length
      if (count) return this.counted(count, "tasteRequest", "tasteRequests")
    }
    const text = EpicField.textOf(this.domElement).replace(/\s+/g, " ").trim()
    const lists = own.filter((child) => child.matches(LISTS))
    if (lists.length && lists.length === own.length) {
      const count = lists.reduce((sum, list) => sum + list.querySelectorAll(":scope > li").length, 0)
      return this.counted(count, "tasteItem", "tasteItems")
    }
    return text
  }

  /** `count` in words:  `1 item`, `3 items`. */
  private counted(count: number, one: "tasteItem" | "tasteRequest", many: "tasteItems" | "tasteRequests"): string {
    return count === 1 ? this.translationForKey(one) : this.translationForKey(many, { count: String(count) })
  }

  /** `node`'s words, its marks as their items' ids, leaving out what the runtime added. */
  private static textOf(node: Node): string {
    let text = ""
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) text += child.textContent ?? ""
      else if (!(child instanceof Element) || child.matches(ADDED)) continue
      else if (child.localName === MARK) text += (child.getAttribute("item") ?? "").toUpperCase()
      // a block's words never run into the next's
      else text += child.matches(BLOCKS) ? ` ${EpicField.textOf(child)} ` : EpicField.textOf(child)
    }
    return text
  }

  /** A request's screenshots are thumbnails:  the page sheet that draws them, registered once per page. */
  @E.onChange("isRequest")
  protected onRequest(request: boolean) {
    if (request && !UI.styles.has(REQUESTS_PAGE_SHEET))
      UI.styles.register(REQUESTS_PAGE_SHEET, requestsPageCSS, { page: true })
  }

  /**
   * A click on a request's screenshot (or Enter on its link):  shown full size (`ImageZoom`), not opened as its link.
   * - the docs runtime takes every other image's click on the page;  this one is for a page without it (Epic UI's)
   * - with a modifier key (or not the main button):  the link's, as usual (a new tab)
   */
  @E.on("click")
  protected onClick(event: MouseEvent) {
    if (this.isRequest) ImageZoom.onClick(event)
  }

  render(): JSX.Element {
    return (
      <Show
        when={this.isRequest}
        fallback={
          <Show when={this.folds} fallback={this.field()}>
            {this.foldingField()}
          </Show>
        }
      >
        {this.request()}
      </Show>
    )
  }

  /** Its label's words:  `Symptom:`, `Claude's plan, accepted:`, a labelled block's `Where:`. */
  private get labelText(): string {
    return this.isLabelled
      ? this.translationForKey("labelled", { label: this.label ?? "" })
      : this.translationForKey(this.name === PLAN && this.accepted ? "planAccepted" : this.look.label)
  }

  /**
   * A named field (I167):  the fold chevron, its icon, its label, then its prose;  folded, the label row alone with
   * its taste.
   * - the icon and label fold it on a click, as the chevron does (⌥ too:  `Fold.toggleFrom()`);  the prose never
   * - open, the prose's box is `display: contents`:  a first paragraph still runs on after the label
   */
  private foldingField(): JSX.Element {
    const toggle = (event: MouseEvent) => Fold.toggleFrom(this.fieldFold, event)
    return (
      <div
        class={[this.rootClass, FIELD, FOLDING, { [FOLDED]: !this.fieldFold.isOpen() }]}
        part={this.partForName("base")}
      >
        <span class={FOLD_CELL}>
          {this.fieldFold.button({
            controls: BODY_ID,
            labelledBy: LABEL_ID,
            clicks: true,
            part: this.partForName("toggle"),
            tips: { fold: this.translationForKey("foldFieldTip"), unfold: this.translationForKey("unfoldFieldTip") }
          })}
        </span>
        <span class={ICON} part={this.partForName("icon")} aria-hidden="true" onClick={toggle}>
          {this.glyph.svg}
        </span>
        <div class={TEXT}>
          <b id={LABEL_ID} class={LABEL} part={this.partForName("label")} onClick={toggle}>
            {this.labelText}
          </b>{" "}
          <Show when={!this.fieldFold.isOpen()}>
            <span class={TASTE} part={this.partForName("taste")}>
              {this.taste}
            </span>
          </Show>
          <span
            ref={this.fieldFold.watch}
            id={BODY_ID}
            class={BODY}
            part={this.partForName("body")}
            hidden={this.fieldFold.hidden()}
          >
            <slot />
          </span>
        </div>
      </div>
    )
  }

  /** A labelled block:  its label, its prose;  no icon, no fold. */
  private field(): JSX.Element {
    return (
      <div class={[this.rootClass, FIELD, this.isLabelled && LABELLED]} part={this.partForName("base")}>
        <Show when={!this.isLabelled}>
          <span class={ICON} part={this.partForName("icon")} aria-hidden="true">
            {this.glyph.svg}
          </span>
        </Show>
        <div class={TEXT}>
          <b class={LABEL} part={this.partForName("label")}>
            {this.labelText}
          </b>{" "}
          <slot />
        </div>
      </div>
    )
  }

  /** A request:  its title row (the fold chevron, its label), its prose under it, folded. */
  private request(): JSX.Element {
    return (
      <div class={[this.rootClass, FIELD, REQUEST]} part={this.partForName("base")}>
        <div ref={this.requestFold.heading} class={[HEAD, FOLDS]}>
          {this.requestFold.button({
            controls: BODY_ID,
            labelledBy: LABEL_ID,
            part: this.partForName("toggle"),
            tips: { fold: this.translationForKey("foldTip"), unfold: this.translationForKey("unfoldTip") }
          })}
          <b id={LABEL_ID} class={LABEL} part={this.partForName("label")}>
            {this.label}
          </b>
        </div>
        <div
          ref={this.requestFold.watch}
          id={BODY_ID}
          class={[TEXT, BODY]}
          part={this.partForName("body")}
          hidden={this.requestFold.hidden()}
        >
          <slot />
        </div>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicField extends E.AttributeValues<typeof epicFieldVocabulary> {}

/** A build plan's field name (epic `epic-engine` P33):  labelled as accepted once Owen accepted it. */
const PLAN = "plan"

/** A field's `name` => its icon and its label's text key, as today's phase bodies drew them. */
const FIELD_LOOKS = {
  symptom: { icon: "circle exclamation", label: "symptom" },
  changes: { icon: "wand magic sparkles", label: "changes" },
  requests: { icon: "comment dots", label: "requests" },
  goal: { icon: "bullseye", label: "goal" },
  plan: { icon: "route", label: "plan" },
  done: { icon: "circle check", label: "done" },
  files: { icon: "folder", label: "files" },
  verify: { icon: "flask", label: "verify" },
  "to-review": { icon: "list check", label: "toReview" }
} as const

/** A field's `name`. */
type FieldName = keyof typeof FIELD_LOOKS

/** One of `FIELD_LOOKS`. */
type FieldLook = (typeof FIELD_LOOKS)[FieldName]

/** Class word of its box. */
const FIELD = "field"

/** Class word of a labelled block's box:  no icon column. */
const LABELLED = "labelled"

/** A request's parent:  a phase's Requests field. */
const REQUESTS = 'epic-field[name="requests"]'

/** Name of the page sheet that draws a request's screenshots as thumbnails. */
const REQUESTS_PAGE_SHEET = "epic-field-requests"

/** Classes of a request's shadow markup:  its box, the title row, its prose. */
const REQUEST = "request"
const HEAD = "head"
const BODY = "body"

/** Ids of a request's and a named field's shadow markup:  its label (the fold button's name), the box it folds. */
const LABEL_ID = "label"
const BODY_ID = "body"

/** Class words of a named field's box (I167):  it folds;  it's folded. */
const FOLDING = "folding"
const FOLDED = "folded"

/** Class of a named field's chevron cell. */
const FOLD_CELL = "fold-cell"

/** Class of a folded field's taste of its text. */
const TASTE = "taste"

/** A phase's Requests field's `name`. */
const REQUESTS_NAME = "requests"

/** A request, right inside a Requests field. */
const REQUEST_CHILD = "epic-field[label]:not([name])"

/** Lists:  a field that's only these tastes as a count. */
const LISTS = "ul, ol"

/** Blocks in a field's prose:  a space between their words and the next's, in its taste. */
const BLOCKS = "p, li, ul, ol, blockquote, div, pre, table, tr, td, th, dt, dd, epic-field"

/** An item's chip in prose:  read as its item's id. */
const MARK = "epic-mark"

/** What the docs runtime adds in a field (a comment's threads):  not its words. */
const ADDED = "[data-spell-added]"

/** What a field's fold is remembered under:  the nearest of these with an id. */
const FOLD_CONTAINERS = "epic-phase[id], epic-item[id], epic-section[id], epic-overview[id]"

/** `localStorage` key prefix of a page's folded fields (`{ [foldKey]: true }`), then the page's path. */
const FIELD_FOLDS_KEY_PREFIX = "spell-field-folds:"

/****************
 * ### `FieldFolds`
 * The named fields this page's reader folded (I167), in this browser:  `spell-field-folds:<path>`,
 * `{ "<phase id>#goal": true }`.
 * - only the folded ones:  a field starts open
 * - its own key, not the docs runtime's `spell-folds:<path>`:  the runtime holds that one in memory and writes it whole,
 *   so a field's entry there would be lost on the next section's fold
 * - read afresh each time:  another tab's folds, and no stale copy
 ****************/
class FieldFolds {
  /** Did the reader fold the field at `key`? */
  static isFolded(key: string): boolean {
    return FieldFolds.saved()[key] === true
  }

  /** Remember the field at `key` folded, or forget it (open, the default). */
  static remember(key: string, isFolded: boolean) {
    const saved = FieldFolds.saved()
    if (isFolded) saved[key] = true
    else delete saved[key]
    PrefStore.setAt(FieldFolds.key, Object.keys(saved).length ? saved : undefined)
  }

  /** This page's folded fields. */
  private static saved(): Record<string, boolean> {
    const saved = PrefStore.getAt(FieldFolds.key)
    return saved && typeof saved === "object" ? { ...(saved as Record<string, boolean>) } : {}
  }

  /** This page's key. */
  private static get key(): string {
    return `${FIELD_FOLDS_KEY_PREFIX}${location.pathname}`
  }
}
