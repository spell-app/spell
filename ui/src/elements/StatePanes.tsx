import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

/****************
 * ### `StatePanes`
 * What a PANE shows in place of its content while it loads, or once it failed:  its `loading` and `error` slots.
 * - The panes:  `<ui-segment>`, `<ui-segments>`, `<ui-card>`, `<ui-section>`, `<ui-tab>`, `<ui-form>`, `<ui-popup>`.
 * - `loading`, with something in `slot="loading"` (a skeleton, its own words):  that, in place of the content,
 *   and the pane's own veil goes (`:state(state-pane)`, `reset.css`).  An empty slot:  the pane's own veil, as ever.
 * - `error` (the shared attribute, `elementSetup.error` `"its own"`):  `slot="error"` in place of the content;
 *   empty, its error message, the error's words or "Couldn't load this.", and a Try again button,
 *   in the error colours a field and a message in error use (`StatePanes.css`).  `role="alert"`.
 * - Try again dispatches `ui-retry` (bubbling, composed):  whoever filled it reads it again (Spell's failed reads do).
 * - A component holds one as a field, handed what differs, and draws `content()` where its default slot goes and
 *   `draw()` beside it:
 *   ```ts
 *   readonly panes = new E.StatePanes({ owner: this, part: (name) => this.partForName(name) })
 *   ```
 * - MUST be created under the element's owner, as a field:  it watches the element's slots (`SlotContent`).
 ****************/
export class StatePanes {
  /** What differs from pane to pane. */
  private readonly props: StatePanesProps

  /** Which of its slots have content. */
  private readonly slots: E.SlotContent

  constructor(props: StatePanesProps) {
    this.props = props
    this.slots = new E.SlotContent(props.owner.domElement)
  }

  /** The pane showing in place of the content, if one is:  `error` first.  Tracked. */
  get showing(): StatePane | undefined {
    const { owner } = this.props
    if (owner.isMarkedFailed) return "error"
    if (owner.isMarkedLoading && this.slots.hasContent(LOADING)) return "loading"
    return undefined
  }

  /** The default slot, hidden while a pane stands in for the content. */
  content(): JSX.Element {
    return <slot hidden={!!this.showing} />
  }

  /** The pane showing, if one is:  its slot, else (an error) its message and Try again. */
  draw(): JSX.Element {
    const { owner, part } = this.props
    return (
      <>
        <Show when={this.showing === "loading"}>
          <div class="state-pane" part={part(LOADING_PANE)} role="status" aria-busy="true">
            <slot name={owner.slotForName(LOADING)} />
          </div>
        </Show>
        <Show when={this.showing === "error"}>
          <div class="state-pane" part={part(ERROR_PANE)} role="alert">
            <slot name={owner.slotForName(ERROR)}>
              <div class="error-pane">
                <span class="error-words">{owner.sharedErrorText ?? owner.translationForKey("failed")}</span>
                <button type="button" class="retry" onClick={() => this.retry()}>
                  {owner.translationForKey("retry")}
                </button>
              </div>
            </slot>
          </div>
        </Show>
      </>
    )
  }

  /** Try again:  `ui-retry`, for whoever filled the pane to read it again. */
  private retry(): void {
    this.props.owner.domElement.dispatchEvent(new CustomEvent(RETRY_EVENT, { bubbles: true, composed: true }))
  }
}

/** A state pane:  what stands in for a pane's content. */
export type StatePane = "loading" | "error"

/** The pane a `StatePanes` stands in for. */
export type StatePanesOwner = {
  readonly domElement: HTMLElement
  readonly isMarkedLoading: boolean
  readonly isMarkedFailed: boolean
  readonly sharedErrorText: string | undefined
  translationForKey(key: string): string
  slotForName(name: string): string
}

/** What a `StatePanes` is made from. */
export type StatePanesProps = {
  /** the pane drawing it */
  owner: StatePanesOwner
  /** a part's name, translated on a translated tag (`partForName()`) */
  part: (name: string) => string
}

/** The event Try again dispatches. */
export const RETRY_EVENT = "ui-retry"

/** The loading slot. */
const LOADING = "loading"

/** The error slot. */
const ERROR = "error"

/** The parts round the panes. */
const LOADING_PANE = "loading-pane"
const ERROR_PANE = "error-pane"
