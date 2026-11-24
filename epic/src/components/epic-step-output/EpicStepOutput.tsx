import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { DraftSaver } from "spell/epic/answers"
// the page's view of the review inbox, as the review controls':  its file, not `epic-review`'s barrel
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
import type { DOMTextBoxElement } from "spell/epic/components/epic-text-box/EpicTextBox"

import { epicStepOutputVocabulary } from "./EpicStepOutput.en"

import stepOutputCSS from "./EpicStepOutput.css?inline"

/****************
 * ### `<epic-step-output>`
 * The box under a manual test's command where the person pastes what it printed (epic `epic-engine` T165;  Owen,
 * 2026-11-23:  "it should have a 'paste the output of this command here' comment for each step").
 * - Never written in a doc:  the test's Step field puts one under each step with a command (`StepOutputs`), as the
 *   page draws it, marked `data-spell-added` so the live patch, comments and the field's taste step around it.
 * - A `<epic-text-box type="note" code>`:  monospace, lines kept whole, growing with what's pasted
 *   (Owen, 2026-10-06:  every "tell me more" field grows).
 * - What's pasted goes in the test's MARK (`ReviewClient.saveOutput()`), the step's number with it:
 *   - his Approve, his Revisit note, his x:  it rides along, so Send hands it over with his answer
 *   - nothing marked yet:  a revisit with no words, as a picture alone makes one;  `wait` prints each step's paste
 *   - saved `OUTPUT_SAVE_MS` after the last key, at once when the box loses focus or the page goes
 *     (`DraftSaver`);  a reload shows it again, from the inbox
 * - Shown only while the page is reviewed (on the page server):  off it, there's nowhere to save to.
 * - Position in the import graph:  the review inbox's client (`spell/epic/review`) through `ReviewState`, and
 *   `<epic-text-box>`, whose family its barrel defines first.
 ****************/
export class EpicStepOutput extends E.UIComponent<typeof epicStepOutputVocabulary> {
  @E.proto static vocabulary = epicStepOutputVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-step-output": stepOutputCSS }
  } satisfies Partial<E.ElementSetup>

  /** Its test's view of the page's review inbox, keyed by the test's id. */
  readonly review = new ReviewState(() => this.item?.toLowerCase())

  /** Follow the inbox while connected (kept alive:  a removed one must stop listening). */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /** Send what's waiting as the page goes away, and when the box goes;  returns the undo. */
  @E.whileConnected
  protected watchPageHide() {
    const unwatch = this.saves.watch(window)
    return () => {
      unwatch()
      void this.saves.save()
    }
  }

  /** Its step's number, 1 first;  0 for none (it then saves nothing). */
  get stepNumber(): number {
    return Number(this.step) || 0
  }

  /** Shown:  the page is reviewed, and it knows its test and step. */
  get isShown(): boolean {
    return this.review.reviewing() && !!this.item && this.stepNumber > 0
  }

  /** What's saved for its step, in the test's mark (`""`:  nothing):  followed, so a reload or another tab shows it. */
  get savedText(): string {
    return this.review.outputOf(this.stepNumber)
  }

  /** The saves:  `OUTPUT_SAVE_MS` after the last key, one at a time, retried after a failure. */
  private readonly saves = new DraftSaver({
    save: (options) => this.saveNow(options),
    wait: OUTPUT_SAVE_MS
  })

  /** Its box, once drawn. */
  private box: DOMTextBoxElement | undefined

  /** Its box drawn:  given what's saved. */
  private holdBox(element: DOMTextBoxElement) {
    this.box = element
    element.value = this.savedText
  }

  /** What's saved changed (a reload's inbox, another tab, Claude taking it):  shown, unless he's typing in it. */
  @E.onChange("savedText")
  protected onSavedChanged(text: string) {
    if (this.box && !this.saves.isUnsaved && this.box.value !== text) this.box.value = text
  }

  /** A key typed or a paste:  saved once typing stops. */
  private readonly onInput = () => this.saves.changed()

  /** Save what's in the box as its step's output;  throws why not, so the saver tries again. */
  private async saveNow({ keepalive }: { keepalive: boolean }): Promise<undefined> {
    const client = this.review.client
    const id = this.item?.toLowerCase()
    if (!client || !id || !this.box || this.stepNumber < 1) return undefined
    const ok = await client.saveOutput(id, this.stepNumber, this.box.value, { keepalive })
    if (!ok) throw new Error(this.review.lastWriteError || "not saved")
    return undefined
  }

  render(): JSX.Element {
    const hint = this.translationForKey("placeholder")
    return (
      <Show when={this.isShown}>
        <div class={this.rootClass} part={this.partForName("base")}>
          <epic-text-box
            ref={(element: HTMLElement) => this.holdBox(element as DOMTextBoxElement)}
            part={this.partForName("box")}
            type="note"
            code=""
            max-height="40vh"
            placeholder={hint}
            label={this.translationForKey("label", { step: String(this.stepNumber) })}
            onInput={this.onInput}
            onFocusOut={() => void this.saves.save()}
          />
        </div>
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicStepOutput extends E.AttributeValues<typeof epicStepOutputVocabulary> {}

/** How long after the last key a paste is saved, ms:  a paste is one change, so soon. */
const OUTPUT_SAVE_MS = 1500
