import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"

import { DraftSaver } from "spell/epic/answers"
import { DRAFT_SAVE_MS, KICKOFF_ID, Pictures, clockOf, type PictureSaver } from "spell/epic/review"
import { PictureWords } from "spell/epic/components/epic-picture/PictureWords"
// the page's view of the review inbox, as the review controls': its file, not `epic-review`'s barrel
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"
import type { DOMTextBoxElement } from "spell/epic/components/epic-text-box/EpicTextBox"

import { epicKickoffVocabulary } from "./EpicKickoff.en"

import kickoffCSS from "./EpicKickoff.css?inline"

/****************
 * ### `<epic-kickoff>`
 * The KICKOFF BOX at the top of a new epic's Overview (epic `epic-engine` P75;  Owen, 2026-11-17:  "start with an
 * empty-ish epic doc and a field where I can type in what i want to do, rather than typing it in chat.  I should be
 * able to paste in/drop multiple pictures there").
 * - Who draws it:  `<epic-overview>`, while the epic has no kickoff prompt and no phases, and the page is reviewed
 *   and an EPIC page in its Overview stage (`PageStages.takesKickoff()`:  never a saga page, epic `epic-engine` I349);
 *   once `epic inbox apply` writes the Kickoff prompt, the Overview draws that instead
 * - In a person's violet (their voice), in its order:
 *   - its lead line, "What should this epic do?"
 *   - ONE box that grows as it's typed (`<epic-text-box type="note">`, a third of the window at most)
 *   - the strip of its pictures, each labelled, with its x (`PictureWords.stripOf()`)
 *   - the hint (how pictures are named, what Send does), its picture button, and when it was saved
 * - Pictures:  every one pasted, dropped or chosen is saved beside the page, in its `pictures/`
 *   (`ReviewClient.saveShot("kickoff")`), and written into the words labelled, `![IMG2](<path>)`
 *   (`Pictures.intoWords()`);  taking one out (its x, or its whole link deleted by hand) renumbers the later ones
 *   while it's typed (P75's choice B:  nothing sent yet)
 * - SAVED as typed, as a note box is:  `DRAFT_SAVE_MS` after the last key, at once when it loses the focus or the page
 *   goes (`DraftSaver`), as the inbox's `kickoff` mark, `{ action: "kickoff", note }` (`ReviewClient.save()`);  an
 *   emptied box takes the mark away
 *   - the header's Send hands it over;  `epic inbox apply` makes it the Kickoff prompt, and the session plans from it
 * - SIDE EFFECT:  follows the review inbox while connected
 * - Position in the import graph:  the review client, `Pictures`' words and `<epic-picture>`'s drawer, the text box's
 *   DOM element (a type);  never the Overview, which draws it
 ****************/
export class EpicKickoff extends E.UIComponent<typeof epicKickoffVocabulary> {
  @E.proto static vocabulary = epicKickoffVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-kickoff": kickoffCSS },
    // its box takes the focus itself
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The page's view of the review inbox, under the kickoff box's key. */
  readonly review = new ReviewState(() => KICKOFF_ID)

  /** The box's words as typed:  what the strip of pictures follows. */
  @E.state accessor words = ""

  /** How many pictures are being saved. */
  @E.state accessor savingCount = 0

  /** Its words' last save:  when (`at`), or why not (`ok: false`);  none until the first. */
  @E.state accessor saved: { ok: true; at: string } | { ok: false; why: string } | undefined = undefined

  /** A picture is being saved. */
  @E.cssState("saving")
  get isSaving(): boolean {
    return this.savingCount > 0
  }

  /** The box, as drawn. */
  private wordsBox: DOMTextBoxElement | undefined

  /** Its saves:  `DRAFT_SAVE_MS` after the last key, one at a time, retried after a failure, sent as the page goes. */
  private readonly drafts = new DraftSaver({
    save: (options) => this.saveWords(options),
    wait: DRAFT_SAVE_MS,
    onChange: () => this.showSave()
  })

  /** Follow the inbox while connected. */
  @E.whileConnected
  protected followReviews() {
    return this.review.connect()
  }

  /**
   * While connected:  pictures pasted or dropped go into its words (heard on the element:  both cross shadow roots),
   * renumbering as it's typed;  the page going away saves at once (every key saves later:  `onTyped()`).
   */
  @E.whileConnected
  protected startBox() {
    const stopPictures = Pictures.intoWords(this.domElement, this.pictureSaver, { renumber: true })
    const stopWatch = this.drafts.watch(window)
    return () => {
      stopPictures()
      stopWatch()
      void this.drafts.save({ keepalive: false })
    }
  }

  render(): JSX.Element {
    return (
      <div class="kickoff" part={this.partForName("base")}>
        <p class="lead" part={this.partForName("lead")}>
          {this.translationForKey("lead")}
        </p>
        <epic-text-box
          ref={(element: HTMLElement) => this.onBoxDrawn(element as DOMTextBoxElement)}
          part={this.partForName("words")}
          type="note"
          placeholder={this.translationForKey("placeholder")}
          label={this.translationForKey("label")}
          onFocusOut={() => void this.drafts.save({ keepalive: false })}
        />
        {PictureWords.stripOf(
          () => this.words,
          (label) => this.removePicture(label)
        )}
        <div class="foot">
          <p class="hint" part={this.partForName("hint")}>
            {this.translationForKey("hint")}
            <Show when={this.savedWords}>
              {(words) => (
                <span class="saved" part={this.partForName("saved")} data-failed={this.saved?.ok ? undefined : ""}>
                  {" "}
                  {words()}
                </span>
              )}
            </Show>
          </p>
          <button
            type="button"
            class="choose"
            part={this.partForName("choose")}
            title={this.translationForKey("choose")}
            aria-label={this.translationForKey("choose")}
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
            multiple
            hidden
            onChange={(event: Event) => this.onChoose(event.currentTarget as HTMLInputElement)}
          />
        </div>
      </div>
    )
  }

  /** What the line after the hint says:  `Saved 23:14`, or why not;  nothing until a save. */
  get savedWords(): string | undefined {
    const saved = this.saved
    if (!saved) return undefined
    return saved.ok
      ? this.translationForKey("saved", { time: clockOf(saved.at) })
      : this.translationForKey("notSaved", { why: saved.why })
  }

  ////////////////
  // ## Typing
  ////////////////

  /** The box as drawn:  kept, and given the words saved before (its mark's). */
  @E.untracked
  private onBoxDrawn(box: DOMTextBoxElement) {
    this.wordsBox = box
    const start = this.review.client?.markOf(KICKOFF_ID)?.note ?? ""
    box.value = start
    this.words = start
  }

  /** The box's words now:  its native field's, which every key and picture changes first. */
  private get typedWords(): string {
    return this.wordsBox?.textarea?.value ?? this.wordsBox?.value ?? ""
  }

  /**
   * A key typed, or a picture put in:  the strip follows, and the words save later;  a picture in or out saves now,
   * a decision rather than a key.
   */
  @E.on("input")
  protected onTyped() {
    const before = Pictures.picturesOf(this.words).length
    this.words = this.typedWords
    this.drafts.changed({ now: Pictures.picturesOf(this.words).length !== before })
  }

  /** A picture's x in the strip:  its words taken out, the later labels moved down one (nothing sent yet). */
  @E.untracked
  private removePicture(label: string) {
    const textarea = this.wordsBox?.textarea
    if (!textarea) return
    textarea.value = Pictures.without(textarea.value, label, { renumber: true })
    textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
  }

  /** Files chosen with the picture button:  saved, their words where the box's cursor is, in order. */
  @E.untracked
  private onChoose(input: HTMLInputElement) {
    const files = Array.from(input.files ?? [])
    input.value = ""
    const textarea = this.wordsBox?.textarea
    if (files.length && textarea) void Pictures.putAllInto(textarea, files, this.pictureSaver)
  }

  ////////////////
  // ## Saving
  ////////////////

  /**
   * `DraftSaver`'s save:  the words as the inbox's `kickoff` mark;  emptied, the mark taken away.
   * - throws the client's last write error when it didn't go through
   */
  private async saveWords({ keepalive }: { keepalive: boolean }): Promise<undefined> {
    const client = this.review.client
    if (!client || !this.wordsBox) return undefined
    const note = this.typedWords.trim()
    const now = client.markOf(KICKOFF_ID)?.note ?? ""
    if (note === now) return undefined
    const ok = await client.save(KICKOFF_ID, note ? { action: "kickoff", note } : null, { keepalive })
    if (!ok) throw new Error(client.lastWriteError || "not saved")
    return undefined
  }

  /** The line after the hint, as the saves stand:  nothing while typing;  Saved (when) once through;  why not. */
  private showSave() {
    const state = this.drafts.state
    if (state.kind === "saved") this.saved = { ok: true, at: state.at }
    else if (this.drafts.isError) this.saved = { ok: false, why: this.review.client?.lastWriteError ?? "" }
    else if (state.kind === "unsaved") this.saved = undefined
  }

  /** How its pictures are saved:  beside the epic page, in `pictures/`, under the kickoff box's key (`POST shot`). */
  private readonly pictureSaver: PictureSaver = {
    save: async (png) => {
      this.savingCount++
      try {
        return await this.review.client?.saveShot(KICKOFF_ID, png)
      } finally {
        this.savingCount--
      }
    },
    notify: (problem) => this.review.client?.notify(this.translationForKey(problem))
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicKickoff extends E.AttributeValues<typeof epicKickoffVocabulary> {}
