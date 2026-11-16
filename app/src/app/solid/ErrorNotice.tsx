import { For, Show, createEffect, createMemo } from "solid-js"
import type { JSX } from "@solidjs/web"

import { CustomError } from "spell/util"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { on, tracked } from "spell/app/app/solid"

/****************
 * ### `<ErrorDisplay>`
 * One `error` as an error `<ui-message>`:  its header, message, and a `CustomError`'s context and params.
 * Inline, stacked, wherever;  see also `<ErrorNotice>`, and `<ErrorBoundary>`'s default fallback.
 * - `onDismiss` given:  a close button, which calls it.  The message never hides itself:  the caller drops it.
 * - `autoHide`:  calls `onDismiss` after `autoHideDelay` ms, restarted when `error` changes.
 ****************/
export function ErrorDisplay(props: ErrorDisplayProps) {
  const info = createMemo(() => (props.error ? describeError(props.error) : undefined))

  createEffect(
    () => [props.error, props.autoHide, props.autoHideDelay ?? 3000, props.onDismiss] as const,
    ([error, autoHide, delay, onDismiss]) => {
      if (!error || !autoHide || !onDismiss) return
      const timer = setTimeout(() => onDismiss(), delay)
      return () => clearTimeout(timer)
    }
  )

  return (
    <Show when={info()}>
      {(info) => (
        <ui-message
          state="error"
          heading={info().header}
          dismissible={!!props.onDismiss}
          id={props.id}
          class={props.class}
          style={props.style}
          ref={on("ui-closing", dismiss)}
        >
          <Show when={info().message}>
            <p>{info().message}</p>
          </Show>
          <Show when={info().context}>
            <p>
              {appTexts.text("errorContext")} {info().context}
            </p>
          </Show>
          <Show when={info().params}>
            {(params) => (
              <>
                <p>{appTexts.text("errorParams")}</p>
                <ul>
                  <For each={params()}>{(param) => <li>{param}</li>}</For>
                </ul>
              </>
            )}
          </Show>
        </ui-message>
      )}
    </Show>
  )

  /** The close button:  keep the message (the caller removes it), tell `onDismiss`. */
  function dismiss(event: Event) {
    event.preventDefault()
    props.onDismiss?.()
  }
}

/** Props for `<ErrorDisplay>`. */
export type ErrorDisplayProps = {
  /** `Error` to show;  nothing while `undefined`. */
  error?: Error
  /** Close button clicked, or `autoHide` ran out.  No close button without it. */
  onDismiss?: () => void
  /** Call `onDismiss` after `autoHideDelay`. */
  autoHide?: boolean
  /** Auto-hide delay, ms.  Default:  `3000`. */
  autoHideDelay?: number
  /** Id of the message. */
  id?: string
  /** Class of the message. */
  class?: string
  /** Style of the message host.  NOTE: the host is `display: contents`:  position a wrapper instead. */
  style?: JSX.CSSProperties
}

/** What `<ErrorDisplay>` shows of an error. */
type ErrorInfo = {
  /** Its heading:  a `CustomError`'s first line, else its class name -- see `describeError()`. */
  header: string
  /** The rest of `error.message`, its line breaks kept (`chrome.css`);  `""`:  the heading said it all. */
  message: string
  /** `CustomError`'s `props.context`, as text. */
  context?: string
  /** `CustomError`'s `props.params`, as `key: value` lines;  `undefined` when none. */
  params?: string[]
}

/**
 * `error`, as `<ErrorDisplay>` shows it.  `CustomError` keeps its extras in `props` (`spell/util`'s `CustomError`).
 * - One the editor raises for people (`UIError`, `$fetch()`'s `AuthenticationError` ...):  its first line is the
 *   heading, the rest under it, never its class name (Owen, epic `editor` I124:  "AuthenticationError" said nothing).
 * - Any other (a `TypeError` from a bug):  its class name heads it, for whoever reports it.
 */
function describeError(error: Error): ErrorInfo {
  const custom = error instanceof CustomError ? error : undefined
  const params = custom?.props?.params
  const context = custom?.props?.context
  const entries = params ? Object.entries(params) : []
  const [first = "", ...rest] = error.message.split("\n")
  const ownWords = custom && first.trim()
  return {
    header: ownWords ? first : error.constructor.name || appTexts.text("error"),
    message: ownWords ? rest.join("\n") : error.message,
    context: context ? `${context}` : undefined,
    params: entries.length ? entries.map(([key, value]) => `${key}: ${value}`) : undefined
  }
}

/**
 * Where a floating message sits:  fixed, centered near the top of the page, 500px wide.
 * - Every notice, error and "takes effect on restart" message the editor floats over the page.
 * - On a WRAPPER:  hosts are `contents`.
 * - Drawn over EVERYTHING else the editor puts over the page (Owen, 2026-11-15, epic `editor` I163:
 *   "It should also appear on the top, above selection ants"):
 *   - the Inspector's boxes, the selection's marching ants among them (`Inspector.css`, 2147483000)
 *   - the palette (`Palette.css`, 2147483646)
 *   - only a dialog draws over it:  the top layer is above every z-index
 */
export const FLOATING_MESSAGE_STYLE: JSX.CSSProperties = {
  position: "fixed",
  top: "60px",
  left: "50%",
  translate: "-50% 0",
  width: "500px",
  "max-width": "calc(100vw - 32px)",
  "z-index": 2147483647
}

/****************
 * ### `<ErrorNotice>`
 * `editor.error` over the page content, through `<ErrorDisplay>`;  closing it calls `editor.hideError()`.
 * - SEE:  its App UI components page, `app/docs/ErrorNotice.html` (`/components/app/ErrorNotice.html`).
 ****************/
export function ErrorNotice() {
  const error = tracked(() => editor.error)
  return (
    <Show when={error()}>
      {(error) => (
        <div class="ErrorNotice" style={FLOATING_MESSAGE_STYLE}>
          <ErrorDisplay error={error()} onDismiss={() => editor.hideError()} />
        </div>
      )}
    </Show>
  )
}
