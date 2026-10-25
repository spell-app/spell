import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { SUMMARY_ID } from "spell-epic/review"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell-epic/components/epic-review/ReviewState"
import { SHOW_NOTE, type ReviewShows } from "spell-epic/components/epic-review/EpicReview.types"

// Import directly:  the fold base, not the `epic-section` barrel (which defines `<epic-section>`)
import { EpicFold } from "spell-epic/components/epic-section/EpicFold"
import { RUN_ATTRIBUTES, type ContentsEntry } from "spell-epic/components/epic-section/EpicSection.types"

import { epicOverviewVocabulary } from "./EpicOverview.en"

import collapseAllCSS from "spell-epic/components/epic-item/CollapseAll.css?inline"
import foldCSS from "spell-epic/components/epic-section/EpicFold.css?inline"
import overviewCSS from "./EpicOverview.css?inline"
import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicOverview`
 * The component behind `<epic-overview>`:  an epic page's Overview --
 * `1. Overview`, a fold (`EpicFold`), its lightbulb icon.
 * - Inside, in order:
 *   - the summary (`<epic-summary>`, a lede)
 *   - the Kickoff prompt (`<epic-prompt>`, folded)
 *   - the estimate line (`estimate`)
 *   - then its sub-sections (`<epic-section kind="overview-part">`)
 * - Summary and prompt are its light children, in the default slot with the sub-sections:
 *   so the estimate drawn between them is put in its place by flex `order` (`EpicOverview.css`),
 *   not by a slot of its own.
 * - Older docs (until P14's second conversion pass) hold `<p slot="summary">` and `<blockquote slot="prompt">`:
 *   drawn in the same places;  the prompt folded in a `<details>` of its own here.
 *   TODO:  drop the two slots once every doc is migrated (`epic-components` P14, wave 2).
 * - REVIEWED, while the page is reviewed and it holds an `<epic-summary>`:  keyed `summary` in the inbox, as the
 *   summary was (`<epic-review buttons="part">`:  Revisit, Make Todo, Do Now)
 *   - its review buttons IN its title row, after the page's own buttons (the bullhorn), before expand-all,
 *     collapse-all and the fold, as an item's sit on its line (Owen, 2026-10-20:  "The buttons on the left should move
 *     into the 1. Overview header, as well as a bullhorn")
 *   - a marked note, then the note box once Revisit or Edit opens it, at the top of its body, under the title row
 *     (`under-line`:  leaving it empty closes it, as an item's under its line);  Revisit and Edit unfold it
 *   - before epic `epic-engine` I55 `<epic-summary>` drew them under its lede, the note box always there
 * - SIDE EFFECT:  follows the review inbox while connected.
 ****************/
export class EpicOverview extends EpicFold<typeof epicOverviewVocabulary> {
  @E.proto static vocabulary = epicOverviewVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: {
      "epic-tooltip": tooltipCSS,
      "epic-fold": foldCSS,
      "epic-collapse-all": collapseAllCSS,
      "epic-overview": overviewCSS
    }
  } satisfies Partial<E.ElementSetup>

  /** Its icons:  the title's, the prompt's chevron, the estimate's. */
  readonly icons = {
    title: new E.IconGlyph({ owner: this, name: () => TITLE_ICON }),
    chevron: new E.IconGlyph({ owner: this, name: () => "chevron right" }),
    estimate: new E.IconGlyph({ owner: this, name: () => "clock outline" })
  }

  /** Its view of the review inbox, keyed `summary`:  is the page reviewed?  Has it a marked note?  Is its box open? */
  readonly reviewState = new ReviewState(() => SUMMARY_ID)

  /** Follow the review inbox while connected (kept alive:  a removed Overview stops). */
  @E.whileConnected
  protected followReviews() {
    return this.reviewState.connect()
  }

  /**
   * Shows its review controls:  the page is reviewed, and it holds an `<epic-summary>` (the inbox takes `summary`
   * only then:  `ReviewInbox.itemIds()`).
   */
  get reviewed(): boolean {
    return this.reviewState.reviewing() && !!this.domElement.querySelector(SUMMARY_TAG)
  }

  /** Revisit or Edit, pressed on its own review controls:  unfolded, to show the note box. */
  @E.on(SHOW_NOTE, { target: "renderRoot" })
  protected onShowNote(event: Event) {
    // its own controls' only:  a nested element's come through here too
    if ((event.target as Node).getRootNode() !== event.currentTarget) return
    event.stopPropagation()
    void this.reveal()
  }

  /**
   * Its parts (`<epic-section kind="overview-part">`), read again whenever one folds, unfolds or hides:
   * their RUNS follow (`runEnds`).
   */
  @E.watches({ childList: true, subtree: true, attributeFilter: RUN_ATTRIBUTES })
  get parts(): readonly Element[] {
    if (isServer) return NO_PARTS
    return Array.from(this.domElement.querySelectorAll(PARTS))
  }

  /**
   * Where its parts' RUNS start and end, as the Phases section's phases (`EpicSection.runEnds`;  Owen, 2026-10-25:
   * "1.3 top and 1.4 bottom should be rounded"):  folded title rows touching are one card, square between them,
   * rounded at its ends;  an open part stands free, a drawer, so the rows either side of it round towards it.
   */
  get runEnds(): { tops: Element[]; bottoms: Element[] } {
    const shown = this.parts.filter((part) => !part.hasAttribute("hidden"))
    const isOpen = (part: Element | undefined) => !!part?.hasAttribute("open")
    return {
      tops: shown.filter((part, index) => index === 0 || isOpen(shown[index - 1]) || isOpen(part)),
      bottoms: shown.filter((part, index) => index === shown.length - 1 || isOpen(part) || isOpen(shown[index + 1]))
    }
  }

  /** The rules rounding its parts' runs:  `::slotted(#o3) { --epic-part-top-radius: ... }` (`EpicSection.css`). */
  private runRules(): string {
    if (isServer) return ""
    const { tops, bottoms } = this.runEnds
    const ruleFor = (parts: Element[], declarations: string) => {
      const selectors = parts.filter((part) => part.id).map((part) => `::slotted(#${CSS.escape(part.id)})`)
      return selectors.length ? `${selectors.join(", ")} { ${declarations} }` : ""
    }
    return [
      ruleFor(tops, `${PART_TOP_RADIUS}: var(--_epic-run-radius, 8px);`),
      ruleFor(bottoms, `${PART_BOTTOM_RADIUS}: var(--_epic-run-radius, 8px);`)
    ].join("\n")
  }

  /** Its number, by its place among the page's blocks (always the first:  `1`). */
  get number(): number {
    void this.layout
    return this.place(this.isConnected)
  }

  /** The contents entry (`EpicFold.contentsEntry()`):  `1. Overview`, its lightbulb;  its place as it is now. */
  contentsEntry(): ContentsEntry {
    return { label: `${this.place(this.domElement.isConnected)}. ${this.translationForKey("title")}`, icon: TITLE_ICON }
  }

  /** Its place among the page's blocks, from 1;  1 when it isn't `connected`. */
  private place(connected: boolean): number {
    const parent = connected ? this.domElement.parentElement : null
    const blocks = Array.from(parent?.querySelectorAll(":scope > epic-overview, :scope > epic-section") ?? [])
    return blocks.indexOf(this.domElement) + 1 || 1
  }

  render(): JSX.Element {
    return this.renderFold({
      title: () => `${this.number}. ${this.translationForKey("title")}`,
      icon: () => this.icons.title.svg,
      tools: () => <Show when={this.reviewed}>{this.reviewControl("buttons", "review-buttons")}</Show>,
      before: () => (
        <>
          <style>{this.runRules()}</style>
          {/* under the title row:  a marked note, then the note box once opened */}
          <Show when={this.reviewed}>
            <Show when={this.reviewState.noted()}>{this.reviewControl("said", "said")}</Show>
            <Show when={this.reviewState.boxOpen()}>{this.reviewControl("note", "note-box")}</Show>
          </Show>
          <slot name={this.slotForName("summary")} />
          <Show when={this.slots.hasContent(this.slotForName("prompt"))}>
            <details class={PROMPT} part={this.partForName("prompt")}>
              <summary title={this.translationForKey("promptTip")}>
                <span class="chevron" aria-hidden="true">
                  {this.icons.chevron.svg}
                </span>
                {this.translationForKey("prompt")}
              </summary>
              <slot name={this.slotForName("prompt")} />
            </details>
          </Show>
          <Show when={this.estimate}>
            <p class={ESTIMATE} part={this.partForName("estimate")}>
              <span class="icon" aria-hidden="true">
                {this.icons.estimate.svg}
              </span>
              <span>
                <b>{this.translationForKey("estimate")}</b> {this.estimate}
              </span>
            </p>
          </Show>
        </>
      )
    })
  }

  /** One of its review controls (`<epic-review>`, keyed `summary`):  what it `shows`, as its `part`. */
  private reviewControl(shows: ReviewShows, part: "review-buttons" | "note-box" | "said"): JSX.Element {
    return (
      <epic-review
        of={SUMMARY_ID}
        shows={shows}
        buttons="part"
        label={this.translationForKey("reviewLabel")}
        under-line={shows === "note" ? "" : undefined}
        part={this.partForName(part)}
      />
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicOverview extends E.AttributeValues<typeof epicOverviewVocabulary> {}

/** Classes of the shadow markup:  the folded prompt, the estimate line. */
const PROMPT = "prompt"
const ESTIMATE = "estimate"

/** Its parts, its own sub-sections;  none on a server (one list, so a re-read keeps it). */
const PARTS = ":scope > epic-section[kind='overview-part']"
const NO_PARTS: readonly Element[] = []

/** `<epic-section kind="overview-part">`'s tokens for its title row's corners, top and bottom (`runRules()`). */
const PART_TOP_RADIUS = "--epic-part-top-radius"
const PART_BOTTOM_RADIUS = "--epic-part-bottom-radius"

/** Its summary:  what its review controls are about (keyed `summary`). */
const SUMMARY_TAG = ":scope > epic-summary"

/** Its icon:  the title's, and its contents entry's. */
const TITLE_ICON = "lightbulb"
