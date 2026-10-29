/****************
 * ### `PageNotices`
 * The ONE stack of notices at the bottom of the window, on every page:  what a Send did ("Sent 2 marks to Claude"),
 * a failed save, a comment deleted with its Undo.
 * - Owen, 2026-10-29:  "'Sent 2 marks to Claude' toast looks good.  'Comment removed (undo)' does not ... Make the
 *   latter look like the former, but green, and put it in the same toast stack"
 * - each notice a pill of reversed ink and paper;  a `success` one green, an `error` one red, a `warning` one orange
 * - newest at the bottom;  a plain notice replaces the plain one before it (a Send's words never pile up)
 * - its buttons (Undo) at its end, outlined on its own colour:  Spell UI's `<ui-button>`, upgraded wherever the page
 *   has Spell UI
 * - plain DOM, no Solid, no `spell/element`:  the epics pack (`ReviewState`) and the docs bundles (`noteToast()`) both
 *   carry a copy, and both find the same stack in `document.body` by its attribute, so a page has one
 * - drawn in a shadow root of its own:  no page stylesheet needed
 * - `role="status"`:  read out as it changes
 * - plain timers:  the kit's `after()` isn't allowed in the docs bundles
 ****************/
export class PageNotices {
  /**
   * Say `message` for `ms` (6s unless given), at the bottom of the stack.
   * - SIDE EFFECT:  adds the stack to `document.body` on the first notice
   * - NEVER throws:  with no `document` (node), nothing happens
   */
  static show(message: string, { tone = "plain", ms = NOTICE_SHOWN_MS, actions = [] }: NoticeOptions = {}): void {
    if (typeof document === "undefined") return
    const list = PageNotices.list()
    if (tone === "plain") for (const old of list.querySelectorAll('[data-tone="plain"]')) old.remove()
    const notice = document.createElement("div")
    notice.className = "notice"
    notice.dataset.tone = tone
    const words = document.createElement("p")
    words.textContent = message
    notice.append(words)
    for (const action of actions) {
      const button = document.createElement("ui-button")
      button.setAttribute("appearance", "basic inverted compact")
      button.setAttribute("size", "mini")
      if (action.icon) button.setAttribute("icon", action.icon)
      button.textContent = action.text
      button.addEventListener("click", () => {
        notice.remove()
        action.click()
      })
      notice.append(button)
    }
    list.append(notice)
    setTimeout(() => notice.remove(), ms)
  }

  /** The stack's list, in its host's shadow root:  found by its attribute, else made and added to `document.body`. */
  private static list(): HTMLElement {
    let host = document.querySelector<HTMLElement>(`[${STACK_ATTRIBUTE}]`)
    if (!host) {
      host = document.createElement("div")
      host.setAttribute(STACK_ATTRIBUTE, "")
      host.setAttribute("role", "status")
      host.setAttribute("aria-live", "polite")
      host.attachShadow({ mode: "open" }).innerHTML = `<style>${NOTICES_CSS}</style><div class="list"></div>`
      document.body.append(host)
    }
    return host.shadowRoot!.querySelector<HTMLElement>(".list")!
  }
}

/** A notice's look and buttons:  `PageNotices.show()`'s options. */
export type NoticeOptions = {
  /** its colour:  `plain` (reversed ink and paper), `success` green, `error` red, `warning` orange */
  tone?: NoticeTone
  /** how long it shows, ms */
  ms?: number
  /** its buttons, at its end:  a click runs it and takes the notice away */
  actions?: NoticeAction[]
}

/** A notice's colour. */
export type NoticeTone = "plain" | "success" | "error" | "warning"

/** A notice's button:  its words, an optional icon, what a click does. */
export type NoticeAction = { text: string; icon?: string; click: () => void }

/** How long a notice stays up, unless told:  the review notices' own `NOTICE_MS`. */
const NOTICE_SHOWN_MS = 6000

/** The attribute the stack's host carries, so every copy of this code on the page finds the same one. */
const STACK_ATTRIBUTE = "data-spell-notices"

/** The stack's look:  pills of the page's ink and paper swapped;  green, red and orange ones in white. */
const NOTICES_CSS = `
:host { position: fixed; z-index: 1000; inset-inline: 12px; inset-block-end: 12px; display: block; pointer-events: none; }
.list { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.notice {
  box-sizing: border-box; display: flex; align-items: center; gap: 10px; max-width: 520px; padding: 8px 12px;
  border-radius: 8px; background: var(--ui-text-color, CanvasText); color: var(--ui-background, Canvas);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.2); font: 14px/1.4 var(--ui-font-family, system-ui, sans-serif);
  pointer-events: auto;
}
.notice[data-tone="success"] { background: var(--ui-green, #16a34a); color: #fff; }
.notice[data-tone="error"] { background: var(--ui-red, #db2828); color: #fff; }
.notice[data-tone="warning"] { background: var(--ui-orange, #f2711c); color: #fff; }
p { margin: 0; }
ui-button { flex: none; }`
