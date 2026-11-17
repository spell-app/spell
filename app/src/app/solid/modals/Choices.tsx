import { For, Show } from "solid-js"
import { render } from "@solidjs/web"

import { uiReady } from "spell/app/app/solid/loadUI"
import type { ChoicesModalProps, ModalChoice } from "spell/app/app/solid/modals"

/****************
 * ### `<Choices>`
 * Modal asking a question with a button per answer, in a row, when OK and Cancel aren't enough
 * (epic `mockup` T52:  "Keep your changes to Solitaire?").
 * - `onChoose()` gets, once the modal has HIDDEN:  the clicked button's `value`;
 *   Cancel, Escape or its close ✕ (on unless `closable` is `false`), `undefined`.
 * - An answer set `apart` (Discard) stands alone at the left;  Cancel and the rest are on the right.
 * - Like `UI.modals`' dialogs, `closedby="closerequest"`, so a stray click on the dimmer does nothing;
 *   one size wider (`small`), so four buttons sit on one row.
 * - The `primary` button has the focus at first, so Enter is the answer most people want, never one that throws
 *   something away.
 * - Every button is an `approve` one (`UIT.ModalActionSelectors`), so a click closes it;
 *   the button clicked says which answer it was (`data-choice`).
 * - Show one with `openChoices()`, which mounts it and cleans up.
 ****************/
export function Choices(props: ChoicesProps) {
  let chosen: string | undefined
  return (
    <ui-modal
      class="Choices"
      size="small"
      closedby="closerequest"
      closable={props.closable === false ? undefined : ""}
      heading={props.header}
      aria-label={props.header ? undefined : props.message}
      visible=""
      ref={(modal: HTMLElement) => {
        modal.addEventListener("ui-approving", choose)
        // the modal focuses its first button as it opens:  Discard, so Enter would throw the draft away
        modal.addEventListener("ui-opened", () =>
          modal.querySelector<HTMLElement>('ui-button[color="primary"]')?.focus()
        )
        modal.addEventListener("ui-closed", () => props.onChoose(chosen), { once: true })
      }}
    >
      <ui-content>
        <p style={{ "white-space": "pre-line" }}>{props.message}</p>
      </ui-content>
      <ui-actions>
        <For each={props.choices.filter((choice) => choice.apart)}>{answer}</For>
        <Show when={props.cancel}>
          <ui-button class="deny">{props.cancel}</ui-button>
        </Show>
        <For each={props.choices.filter((choice) => !choice.apart)}>{answer}</For>
      </ui-actions>
    </ui-modal>
  )

  /** An answer's button:  one set apart floats alone at the left, as Fomantic's `left floated` button in a modal. */
  function answer(choice: ModalChoice) {
    return (
      <ui-button
        class="approve"
        color={choice.color}
        data-choice={choice.value}
        style={choice.apart ? { float: "inline-start", "margin-inline-start": "0" } : undefined}
      >
        {choice.text}
      </ui-button>
    )
  }

  /** A button:  note its answer now, while it's still in the page. */
  function choose(event: Event) {
    const action = (event as CustomEvent<{ action?: Element }>).detail?.action
    chosen = action?.getAttribute("data-choice") ?? undefined
  }
}

/** Props for `<Choices>`. */
export type ChoicesProps = ChoicesModalProps & {
  /** Called once with the answer, after the modal has hidden. */
  onChoose: (value: string | undefined) => void
}

/**
 * Show a `<Choices>` for `props`;  resolves with its answer (see `<Choices>`).
 * - SIDE EFFECT:  a `<div class="ChoicesRoot">` in `<body>` holding the modal, until it has hidden.
 * - Waits for `uiReady`:  `<ui-modal>` and `<ui-button>` must be defined before it opens.
 */
export async function openChoices<Value extends string>(props: ChoicesModalProps<Value>): Promise<Value | undefined> {
  await uiReady
  const root = document.createElement("div")
  root.className = "ChoicesRoot"
  document.body.append(root)
  return new Promise((resolve) => {
    const dispose = render(() => <Choices {...props} onChoose={finish} />, root)

    /** Unmount, then resolve. */
    function finish(value: string | undefined) {
      dispose()
      root.remove()
      resolve(value as Value | undefined)
    }
  })
}
