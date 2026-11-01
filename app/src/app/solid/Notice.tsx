import { Show, createEffect } from "solid-js"

import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { FLOATING_MESSAGE_STYLE, on, tracked } from "spell/app/app/solid"

/****************
 * ### `<Notice>`
 * `editor.notice` as a success `<ui-message>`, fixed near the top of the page;  closing it calls
 * `editor.hideNotice()`.
 * - SIDE EFFECT:  hides it after 3s (`editor.hideNotice()`), unless `autoHide` is `false` -- only if
 *   `editor.notice` is still the one the timer was started for.
 * - SEE:  its App UI components page, `app/docs/Notice.html` (`/components/app/Notice.html`).
 ****************/
export function Notice(props: NoticeProps) {
  const notice = tracked(() => editor.notice)

  createEffect(
    () => [notice(), props.autoHide ?? true] as const,
    ([shown, autoHide]) => {
      if (!autoHide || !shown) return
      const timer = setTimeout(
        () => {
          if (editor.notice === shown) editor.hideNotice()
        },
        Math.max(NOTICE_DELAY, shown.length * NOTICE_PER_CHARACTER)
      )
      return () => clearTimeout(timer)
    }
  )

  return (
    <Show when={notice()}>
      {(notice) => (
        <div class="Notice" style={FLOATING_MESSAGE_STYLE}>
          <ui-message state="success" heading={notice()} dismissible="" ref={on("ui-closing", dismiss)} />
        </div>
      )}
    </Show>
  )
}

/****************
 * ### `<RestartNeeded>`
 * Says the program's last edit takes effect on restart, with a Restart button:  the app keeps running as it was.
 * - While `editor.restartNeededBecause` is set:  it clears as the program restarts, or the edit's taken back.
 * - The reason is on the console, and in the tooltip, for whoever wants to know.
 ****************/
export function RestartNeeded() {
  const reason = tracked(() => editor.restartNeededBecause)
  return (
    <Show when={reason()}>
      {(why) => (
        <div class="RestartNeeded" style={FLOATING_MESSAGE_STYLE}>
          <ui-message state="info" heading={appTexts.text("takesEffectOnRestart")} title={why()}>
            <ui-button size="small" onClick={() => void editor.restartApp().catch(editor.showError)}>
              {appTexts.text("restart")}
            </ui-button>
          </ui-message>
        </div>
      )}
    </Show>
  )
}

/** Props for `<Notice>`. */
export type NoticeProps = {
  /** Hide after 3s.  Default:  `true`. */
  // TODO: boolean | number in seconds?
  autoHide?: boolean
}

/** How long a notice shows, ms, at least. */
const NOTICE_DELAY = 3000

/** How long each character of a long notice keeps it up, ms:  so it can be read. */
const NOTICE_PER_CHARACTER = 70

/** The close button:  keep the message (`<Show>` removes it), clear `editor.notice`. */
function dismiss(event: Event) {
  event.preventDefault()
  editor.hideNotice()
}
