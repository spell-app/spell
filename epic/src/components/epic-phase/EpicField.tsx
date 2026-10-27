import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"

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

  /** Its fold, when it's a request:  collapse-all and expand-all reach it here (`foldAllUnder()`). */
  get fold(): Fold | undefined {
    return this.isRequest ? this.requestFold : undefined
  }

  /** A request, unfolded. */
  @E.cssState("open")
  get isOpen(): boolean {
    return this.isRequest && this.requestFold.isOpen()
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
      <Show when={this.isRequest} fallback={this.field()}>
        {this.request()}
      </Show>
    )
  }

  /** Every field but a request:  its icon (or none, labelled), its label, its prose. */
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
            {this.isLabelled
              ? this.translationForKey("labelled", { label: this.label ?? "" })
              : this.translationForKey(this.name === PLAN && this.accepted ? "planAccepted" : this.look.label)}
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

/** Ids of a request's shadow markup:  its label (the fold button's name), the box it folds. */
const LABEL_ID = "label"
const BODY_ID = "body"
