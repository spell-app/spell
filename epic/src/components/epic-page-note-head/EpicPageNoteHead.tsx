import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "$/spell-solid"

import { ThreadFacts } from "$/epics/comments"

import { epicPageNoteHeadVocabulary } from "./EpicPageNoteHead.en"

import headCSS from "./EpicPageNoteHead.css?inline"

/****************
 * ### `EpicPageNoteHead`
 * The component behind `<epic-page-note-head>`:  the head line of an old PAGE NOTE (`<spell-note>`, epic `airplane`
 * P3), drawn by the docs runtime first in each note (`wireNotes()`;  a hand-built button row until epic `epic-engine`
 * P3).
 * - "Owen · 10/10 14:02", the note's first line while it's folded (`preview`), its status, how many replies.
 * - The whole line is ONE button:  a click flips `open`, and says so (`epic-page-note-fold`);  the runtime opens or
 *   folds the note (its `open`, which a live patch keeps).
 * - Its look is the note card's head line, as it was (`spell-doc.css` before).
 ****************/
export class EpicPageNoteHead extends E.UIComponent<typeof epicPageNoteHeadVocabulary> {
  @E.proto static vocabulary = epicPageNoteHeadVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-page-note-head": headCSS }
  } satisfies Partial<E.ElementSetup>

  /** The status, and how many replies:  `answered · 1 reply`. */
  get statusWords(): string {
    const count = this.replies ?? 0
    if (!count) return this.status ?? "new"
    const replies = count === 1 ? this.translationForKey("reply") : this.translationForKey("replies", { count })
    return `${this.status ?? "new"} · ${replies}`
  }

  render(): JSX.Element {
    return (
      <button
        type="button"
        class={FOLD}
        part={this.partForName("base")}
        aria-expanded={this.open ? "true" : "false"}
        onClick={this.onFold}
      >
        <span class={ICON}>
          <ui-icon name="comment" />
        </span>
        <span class={WHO}>
          <b>{this.translationForKey("who")}</b> · {ThreadFacts.shortStamp(this.at)}
        </span>
        <span class={PREVIEW}>{this.preview}</span>
        <Show when={this.status ?? "new"}>
          {(status) => (
            <span class={STATUS} part={this.partForName("status")} data-status={status()}>
              {this.statusWords}
            </span>
          )}
        </Show>
      </button>
    )
  }

  /** A click:  `open` flips, and it says so. */
  @E.untracked
  private readonly onFold = () => {
    const open = !this.open
    this.open = open
    this.send("epic-page-note-fold", { open })
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicPageNoteHead extends E.AttributeValues<typeof epicPageNoteHeadVocabulary> {}

/** Classes of its shadow markup (`EpicPageNoteHead.css`). */
const FOLD = "fold"
const ICON = "icon"
const WHO = "who"
const PREVIEW = "preview"
const STATUS = "status"
