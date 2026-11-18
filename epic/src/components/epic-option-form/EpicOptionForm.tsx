import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { Pictures, ReviewClient, type PictureSaver } from "spell/epic/review"
import type { DOMTextBoxElement } from "spell/epic/components/epic-text-box/EpicTextBox"

import { epicOptionFormVocabulary } from "./EpicOptionForm.en"

import formCSS from "./EpicOptionForm.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `<epic-option-form>`
 * The form for ONE option of a set (epic `epic-engine` P50):  Add choice's new card, or an option edited in place.
 * - Who draws it:  `<epic-choices>` (Add choice, an added option changed before it's sent) and `<epic-option>` (its
 *   pencil), in their shadow roots, while the page is reviewed.
 * - In a person's violet (their voice), in its order:
 *   - its heading (`New choice`, `Edit B`)
 *   - ONE box that grows as it's typed (`<epic-text-box type="note">`;  epic `epic-engine` I334, Owen:  "Change this to
 *     be a single textarea"), which takes the focus as it's drawn:
 *     - its first line is the option's title, the rest its note
 *     - a picture pasted or dropped in it is saved through the page server at once (`ReviewClient.saveShot()`,
 *       `POST shot`, under the set's mark id `for`), and its words go in at the cursor, `![picture](<path>)`
 *       (`Pictures.intoWords()`, as a comment's field takes one);  the note carries them from there
 *   - Save (Ctrl / Cmd + Enter), Cancel (Escape), and a small picture button, for a file the page can't be handed
 *     by a paste or a drop (VS Code's side bar never lets a dragged file reach the page)
 * - It saves nothing itself:  `epic-option-saved` hands the element drawing it the title and the note, which go into
 *   the set's mark (`SetChange`);  `epic-option-canceled` closes it.
 * - An added option from before I334 kept its picture apart (`shot`):  the form starts with its words at the note's
 *   end, so a save carries it in the note.
 * - Position in the import graph:  the review client and `<epic-text-box>`'s DOM element (a type);  never the choices
 *   family, which draws it.
 ****************/
export class EpicOptionForm extends E.UIComponent<typeof epicOptionFormVocabulary> {
  @E.proto static vocabulary = epicOptionFormVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-option-form": formCSS },
    // the form's box takes the focus itself
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** How many pictures are being saved:  Save waits for them. */
  @E.state accessor savingCount = 0

  /** A picture is being saved:  Save waits. */
  @E.cssState("saving")
  get isSaving(): boolean {
    return this.savingCount > 0
  }

  /** The form's one box, as drawn. */
  private wordsBox: DOMTextBoxElement | undefined

  /**
   * While connected:  a picture pasted or dropped in its box goes into its words (heard on the element:  both events
   * cross shadow roots);  the box takes the focus.
   */
  @E.whileConnected
  protected startForm() {
    const stop = Pictures.intoWords(this.domElement, this.pictureSaver)
    E.afterSolidUpdate(() => {
      if (this.wordsBox) void this.focusBox(this.wordsBox)
    })
    return stop
  }

  render(): JSX.Element {
    return (
      <form
        class="option-form"
        part={this.partForName("base")}
        aria-label={this.heading ?? this.translationForKey("words")}
        onSubmit={(event) => {
          event.preventDefault()
          this.save()
        }}
        onKeyDown={(event: KeyboardEvent) => this.onKey(event)}
      >
        <Show when={this.heading}>
          <span class="heading" part={this.partForName("heading")}>
            {this.heading}
          </span>
        </Show>
        <epic-text-box
          ref={(element: HTMLElement) => {
            this.wordsBox = element as DOMTextBoxElement
            this.wordsBox.value = this.startWords
          }}
          part={this.partForName("words")}
          type="note"
          max-height="40vh"
          placeholder={this.translationForKey("words")}
          label={this.translationForKey("wordsLabel")}
        />
        <span class="actions" part={this.partForName("actions")}>
          <button type="submit" data-color="green" disabled={this.isSaving} title={this.translationForKey("saveTip")}>
            <ui-icon name="check" />
            {this.submit ?? this.translationForKey("save")}
          </button>
          <button type="button" title={this.translationForKey("cancelTip")} onClick={() => this.cancel()}>
            {this.translationForKey("cancel")}
          </button>
          {/* VS Code's side bar never lets a dragged file reach the page:  a chooser does */}
          <button
            type="button"
            class="choose"
            part={this.partForName("choose")}
            aria-label={this.translationForKey("choose")}
            title={this.translationForKey("choose")}
            onClick={(event: MouseEvent) =>
              (event.currentTarget as HTMLElement).parentElement
                ?.querySelector<HTMLInputElement>("input[type=file]")
                ?.click()
            }
          >
            <ui-icon name="file image" />
          </button>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event: Event) => this.onChoose(event.currentTarget as HTMLInputElement)}
          />
        </span>
      </form>
    )
  }

  /**
   * What the box starts with:  the title, then the note on the lines under it;  an old added option's picture
   * (`shot`, from before I334) as its words at the end.
   */
  private get startWords(): string {
    const shot = this.shot ? Pictures.wordsFor(this.shot) : ""
    const note = [this.note?.trim(), shot].filter(Boolean).join("\n\n")
    return [this.optionTitle?.trim() ?? "", note].filter(Boolean).join("\n")
  }

  /** Its box's field takes the focus, once the box and its `<ui-textarea>` have drawn.  NEVER rejects. */
  private async focusBox(box: DOMTextBoxElement) {
    await box.ready.catch(() => undefined)
    const field = box.shadowRoot?.querySelector<HTMLElement & { ready?: Promise<void> }>(FIELD_TAG)
    await field?.ready?.catch(() => undefined)
    box.textarea?.focus({ preventScroll: true })
  }

  ////////////////
  // ## Events
  ////////////////

  /** Ctrl / Cmd + Enter:  save;  Escape:  cancel.  Enter alone types a new line:  the note's. */
  @E.untracked
  private onKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation()
      this.cancel()
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      this.save()
    }
  }

  /**
   * Save:  the box's first line is the title (one is needed, and not a picture), the rest the note;
   * `epic-option-saved` hands them over.
   */
  @E.untracked
  private save() {
    if (this.isSaving) return
    const [firstLine = "", ...rest] = (this.wordsBox?.value ?? "").trim().split("\n")
    const title = firstLine.trim()
    const problem =
      !title || Pictures.piecesOf(title).some((piece) => typeof piece !== "string")
        ? "needsTitle"
        : title.length > TITLE_MAX
          ? "titleTooLong"
          : undefined
    if (problem) {
      this.wordsBox?.textarea?.focus()
      ReviewClient.forPage().notify(this.translationForKey(problem))
      return
    }
    this.send("epic-option-saved", { title, note: rest.join("\n").trim() })
  }

  /** Cancel:  `epic-option-canceled`;  the element drawing it closes it. */
  @E.untracked
  private cancel() {
    this.send("epic-option-canceled", {})
  }

  /** A file chosen with the picture button:  saved, its words where the box's cursor is. */
  @E.untracked
  private onChoose(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ""
    const textarea = this.wordsBox?.textarea
    if (file && textarea) void Pictures.putInto(textarea, file, this.pictureSaver)
  }

  /**
   * How the box's pictures are saved:  beside the epic page, under the set's mark id (`POST shot`), so the path is an
   * option's picture (`tests/q52-20261029-1432.png`), what `inbox apply` takes;  Save waits meanwhile.
   * - NOTE:  epic `epic-engine` P75 moves every picture box to words labelled `![IMGn](<path>)`:  the label is
   *   `Pictures.wordsFor()`'s alone, so this form follows it with no change here
   */
  private readonly pictureSaver: PictureSaver = {
    save: async (png) => {
      this.savingCount++
      try {
        return await ReviewClient.forPage().saveShot(this.for ?? "", png)
      } finally {
        this.savingCount--
      }
    },
    notify: (problem) => ReviewClient.forPage().notify(this.translationForKey(problem))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicOptionForm extends E.AttributeValues<typeof epicOptionFormVocabulary> {}

/** What `epic-option-saved` hands over:  the box's first line, and the rest (a picture's words in it). */
export type OptionFormSaved = { title: string; note: string }

/** The longest title the inbox takes (`ReviewInbox`'s `MAX_TITLE`). */
const TITLE_MAX = 300

/** The tag of `<epic-text-box>`'s field. */
const FIELD_TAG = "ui-textarea"
