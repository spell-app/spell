import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { Pictures, ReviewClient } from "spell/epic/review"
import type { DOMTextBoxElement } from "spell/epic/components/epic-text-box/EpicTextBox"

import { epicOptionFormVocabulary } from "./EpicOptionForm.en"

import formCSS from "./EpicOptionForm.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `<epic-option-form>`
 * The form for ONE option of a set (epic `epic-engine` P50):  Add choice's new card, or an option edited in place.
 * - Who draws it:  `<epic-choices>` (Add choice, an added option changed before it's sent) and `<epic-option>` (its
 *   pencil), in their shadow roots, while the page is reviewed.
 * - In Owen's ivory (his voice), in its order:
 *   - its heading (`New choice`, `Edit B`)
 *   - the title, which takes the focus as it's drawn
 *   - a note that grows as it's typed (`<epic-text-box type="note">`)
 *   - a picture:  pasted while the form has the focus, dropped on its area, or chosen;  saved through the page server
 *     at once (`ReviewClient.saveShot()`, `POST shot`, under the set's mark id `for`), shown meanwhile
 *   - Save (Ctrl / Cmd + Enter, or Enter in the title) and Cancel (Escape)
 * - It saves nothing itself:  `epic-option-saved` hands the element drawing it the title, note and picture's path,
 *   which go into the set's mark (`SetChange`);  `epic-option-canceled` closes it.
 * - Position in the import graph:  the review client and `<epic-text-box>`'s DOM element (a type);  never the choices
 *   family, which draws it.
 ****************/
export class EpicOptionForm extends E.UIComponent<typeof epicOptionFormVocabulary> {
  @E.proto static vocabulary = epicOptionFormVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-option-form": formCSS },
    // the form's fields take the focus themselves
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The picture shown:  a pasted one's data URL while it saves, else its saved path (`shot` to start). */
  @E.state accessor shown: string | undefined = undefined

  /** The picture's saved path, from the epic page's folder;  `undefined` while none is (or it's saving). */
  @E.state accessor savedShot: string | undefined = undefined

  /** A picture is being saved:  Save waits. */
  @E.cssState("saving")
  @E.state
  accessor isSaving = false

  /** The form's fields, as drawn. */
  private titleInput: HTMLInputElement | undefined
  private noteInput: DOMTextBoxElement | undefined

  /** While connected:  the picture it starts with, and pastes on the page while the form has the focus. */
  @E.whileConnected
  protected startForm() {
    this.savedShot ??= this.shot || undefined
    this.shown ??= this.savedShot
    const listeners = new AbortController()
    document.addEventListener("paste", this.onPaste, { signal: listeners.signal })
    E.afterSolidUpdate(() => this.titleInput?.focus({ preventScroll: true }))
    return () => listeners.abort()
  }

  render(): JSX.Element {
    return (
      <form
        class="option-form"
        part={this.partForName("base")}
        aria-label={this.heading ?? this.translationForKey("title")}
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
        <input
          ref={(element) => {
            this.titleInput = element
            element.value = this.optionTitle ?? ""
          }}
          class="title-input"
          part={this.partForName("title")}
          type="text"
          maxlength="300"
          placeholder={this.translationForKey("title")}
          aria-label={this.translationForKey("title")}
        />
        <epic-text-box
          ref={(element: HTMLElement) => {
            this.noteInput = element as DOMTextBoxElement
            this.noteInput.value = this.note ?? ""
          }}
          part={this.partForName("note")}
          type="note"
          max-height="40vh"
          placeholder={this.translationForKey("note")}
          label={this.translationForKey("note")}
        />
        {this.picture()}
        <span class="actions" part={this.partForName("actions")}>
          <button type="submit" data-color="green" disabled={this.isSaving} title={this.translationForKey("saveTip")}>
            <ui-icon name="check" />
            {this.submit ?? this.translationForKey("save")}
          </button>
          <button type="button" title={this.translationForKey("cancelTip")} onClick={() => this.cancel()}>
            {this.translationForKey("cancel")}
          </button>
        </span>
      </form>
    )
  }

  /** The picture's area:  where to paste, drop or choose one;  its thumbnail once there is one, with a ×. */
  private picture(): JSX.Element {
    return (
      <div
        class="picture"
        part={this.partForName("picture")}
        role="group"
        aria-label={this.translationForKey("paste")}
        onDragOver={(event: DragEvent) => event.preventDefault()}
        onDrop={(event: DragEvent) => this.onDrop(event)}
      >
        <Show
          when={this.shown}
          fallback={
            <>
              <span class="words">{this.translationForKey("paste")}</span>
              {/* VS Code's side bar never lets a dragged file reach the page:  a chooser does */}
              <ui-button
                appearance="basic"
                size="mini"
                icon="file image"
                onClick={(event: MouseEvent) =>
                  (event.currentTarget as HTMLElement).parentElement?.querySelector("input")?.click()
                }
              >
                {this.translationForKey("choose")}
              </ui-button>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event: Event) => this.onChoose(event.currentTarget as HTMLInputElement)}
              />
            </>
          }
        >
          {(src) => (
            <>
              <img class="thumb" src={src()} alt="" />
              <Show when={this.isSaving}>
                <span class="words">{this.translationForKey("saving")}</span>
              </Show>
              <ui-button
                appearance="circular basic"
                size="mini"
                icon="xmark"
                aria-label={this.translationForKey("removeShot")}
                title={this.translationForKey("removeShot")}
                onClick={() => this.removeShot()}
              />
            </>
          )}
        </Show>
      </div>
    )
  }

  ////////////////
  // ## Events
  ////////////////

  /** Enter in the title, or Ctrl / Cmd + Enter:  save;  Escape:  cancel. */
  @E.untracked
  private onKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.stopPropagation()
      this.cancel()
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey || event.target === this.titleInput)) {
      event.preventDefault()
      this.save()
    }
  }

  /** Save:  a title is needed;  `epic-option-saved` hands over what's typed. */
  @E.untracked
  private save() {
    if (this.isSaving) return
    const title = this.titleInput?.value.trim() ?? ""
    if (!title) {
      this.titleInput?.focus()
      ReviewClient.forPage().notify(this.translationForKey("needsTitle"))
      return
    }
    const note = this.noteInput?.value.trim() ?? ""
    this.send("epic-option-saved", { title, note, ...(this.savedShot && { shot: this.savedShot }) })
  }

  /** Cancel:  `epic-option-canceled`;  the element drawing it closes it. */
  @E.untracked
  private cancel() {
    this.send("epic-option-canceled", {})
  }

  /** A paste on the page while the form has the focus:  an image in it is the option's picture. */
  private readonly onPaste = (event: ClipboardEvent) => {
    if (!this.domElement.matches(":focus-within")) return
    const file = Pictures.fileOf(event)
    if (!file) return
    event.preventDefault()
    void this.takeShot(file)
  }

  /** A file chosen with the picture's chooser. */
  @E.untracked
  private onChoose(input: HTMLInputElement) {
    const file = input.files?.[0]
    input.value = ""
    if (file) void this.takeShot(file)
  }

  /** A file dropped on the picture's area. */
  @E.untracked
  private onDrop(event: DragEvent) {
    event.preventDefault()
    const file = Pictures.fileOf(event)
    if (file) void this.takeShot(file)
  }

  /**
   * Take `file` as the option's picture:  shown at once, saved through the page server (`POST shot`);  its path is
   * what Save hands over.
   * - not an image, or over 8 MB:  a notice says so
   * - NEVER throws:  a failed save is the client's own notice, and the picture goes
   */
  @E.untracked
  private async takeShot(file: File) {
    const client = ReviewClient.forPage()
    const problem = Pictures.problemOf(file)
    if (problem) return client.notify(this.translationForKey(problem))
    const png = await Pictures.pngOf(file).catch(() => undefined)
    if (!png) return
    this.shown = png
    this.savedShot = undefined
    this.isSaving = true
    const shot = await client.saveShot(this.for ?? "", png)
    this.isSaving = false
    if (this.shown !== png) return
    this.savedShot = shot
    if (!shot) this.shown = undefined
  }

  /** The picture's ×:  no picture. */
  @E.untracked
  private removeShot() {
    this.shown = undefined
    this.savedShot = undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicOptionForm extends E.AttributeValues<typeof epicOptionFormVocabulary> {}

/** What `epic-option-saved` hands over. */
export type OptionFormSaved = { title: string; note: string; shot?: string }
