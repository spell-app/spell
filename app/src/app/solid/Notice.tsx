import { Show, createEffect } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { FLOATING_MESSAGE_STYLE, on, tracked } from "spell/app/app/solid"

import "./Notice.css"

/****************
 * ### `<Notice>`
 * `editor.notice` as a success `<ui-message>`, fixed near the top of the page;  closing it calls
 * `editor.hideNotice()`.
 * - Its first line is the heading, any more under it, each on its own line.
 * - Each line on ONE line, never wrapped
 *   (Owen, 2026-11-15, epic `editor` I163:  "Published message shouldn't line wrap"):
 *   the box grows past its 500px to fit, up to the window's width,
 *   then cuts the line short with "…" (`Notice.css`).
 * - Over everything else the editor floats over the page, the selection's marching ants too
 *   (`FLOATING_MESSAGE_STYLE`).
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
        <div class="Notice" style={NOTICE_STYLE}>
          {/* its first line the heading, the rest under it, a line each (epic `editor` I124) */}
          <ui-message state="success" heading={notice().split("\n")[0]} dismissible="" ref={on("ui-closing", dismiss)}>
            <Show when={notice().split("\n").slice(1).join("\n")}>{(rest) => <p>{rest()}</p>}</Show>
          </ui-message>
        </div>
      )}
    </Show>
  )
}

/****************
 * ### `<RestartNeeded>`
 * Says the program's last edit takes effect on restart:  the app keeps running as it was.
 * - One compact row, low in the middle of the window, over the page:
 *   a restart icon, the message, a primary Restart button, and a close button
 *   (Owen, 2026-11-16, epic `editor` I181:  the wide pale box with a bare grey Restart "is ugly").
 * - Low, not near the top as the other floating messages:  it stays till Restart or a close,
 *   so it keeps clear of the top bar and the file tabs.
 * - While `editor.restartNeededBecause` is set:  it clears as the program restarts, or the edit's taken back.
 * - Closing it hides it till the next edit that needs a restart (`editor.dismissRestartNeeded()`).
 * - The reason is on the console, and in the tooltip, for whoever wants to know.
 * - Its look:  `Notice.css`.
 ****************/
export function RestartNeeded() {
  const reason = tracked(() => (editor.isRestartNoticeDismissed ? undefined : editor.restartNeededBecause))
  return (
    <Show when={reason()}>
      {(why) => (
        <div class="RestartNeeded" role="status" style={RESTART_NEEDED_STYLE}>
          <div class="RestartNeededBar" title={why()}>
            <ui-icon name="redo" />
            <span class="RestartNeededText">{appTexts.text("takesEffectOnRestart")}</span>
            <ui-button
              class="RestartNeededButton"
              size="small"
              color="primary"
              onClick={() => void editor.restartApp().catch(editor.showError)}
            >
              {appTexts.text("restart")}
            </ui-button>
            <ui-button
              class="RestartNeededClose"
              appearance="circular basic"
              size="mini"
              icon="close"
              aria-label={appTexts.text("restartNoticeClose")}
              title={appTexts.text("restartNoticeClose")}
              onClick={() => editor.dismissRestartNeeded()}
            />
          </div>
        </div>
      )}
    </Show>
  )
}

/****************
 * ### `<BackToSite>`
 * A small "Back to the site" button, low on the left, while Edit shows a page the site editor opened
 * (`editor.cameFromSite`, epic `mockup` P4):  it goes back to the site editor.
 * - Gone once another project shows.
 ****************/
export function BackToSite() {
  const site = tracked(() =>
    editor.projectPage === "editor" && editor.cameFromSite === editor.project?.path ? editor.cameFromSite : undefined
  )
  return (
    <Show when={site()}>
      {(path) => (
        <div class="BackToSite" style={BACK_TO_SITE_STYLE}>
          <ui-button size="small" icon="arrow left" onClick={() => editor.showSiteEditor(path())}>
            {appTexts.text("siteBackToSite")}
          </ui-button>
        </div>
      )}
    </Show>
  )
}

/**
 * Where `<RestartNeeded>` sits:  centred, 24px above the window's bottom, as wide as what it holds.
 * - Over everything else, as every floating message (`FLOATING_MESSAGE_STYLE`'s z-index).
 */
const RESTART_NEEDED_STYLE: JSX.CSSProperties = {
  position: "fixed",
  bottom: "24px",
  left: "50%",
  translate: "-50% 0",
  "max-width": "calc(100vw - 32px)",
  "z-index": FLOATING_MESSAGE_STYLE["z-index"]
}

/** Where `<BackToSite>` sits:  low on the left, over the page, out of the code's way. */
const BACK_TO_SITE_STYLE = "position: fixed; left: 16px; bottom: 16px; z-index: 1000"

/** Props for `<Notice>`. */
export type NoticeProps = {
  /** Hide after 3s.  Default:  `true`. */
  // TODO: boolean | number in seconds?
  autoHide?: boolean
}

/** Where `<Notice>` sits:  a floating message, as wide as its longest line, 500px at least. */
const NOTICE_STYLE: JSX.CSSProperties = {
  ...FLOATING_MESSAGE_STYLE,
  width: "max-content",
  "min-width": "min(500px, calc(100vw - 32px))"
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
