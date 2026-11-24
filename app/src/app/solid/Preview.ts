import { createSignal, onCleanup } from "solid-js"

import { setDebugGlobal } from "spell/util"
import { UI } from "spell/ui/core"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { AppAnatomy } from "./AppAnatomy"
import { EditorMode, type Mode } from "./EditorMode"
import { Inspector } from "./Inspector"

import "./Preview.css"

/****************
 * ### `Preview`
 * Preview:  the running app alone, filling the screen, with nothing of the editor round it (epic `editor` T172).
 * - For showing an app to someone:  Owen, "if I'm demoing to someone and don't want to show the spell stuff".
 * - ⌥⌘Enter, from anywhere in the editor (the code too), or View › Preview, goes in;  the same key comes back out.
 * - Going in:
 *   - remembers the mode the page was in (Edit, Design or Run), and whether Anatomy showed
 *   - switches to Run, which already hides the code, the Inspector, the Program panel and the add bar
 *     without forgetting them;  a switch the app keeps running through, the game in progress too
 *   - hides what Run still shows of the editor:  the top bar, the sample bar, the notices
 *     (`:root.spell-previewing`, `Preview.css`)
 *   - asks the browser for real full screen;  a browser that says no leaves the app filling the window
 *   - says how to get back out, in a toast that fades after a few seconds
 * - Coming out:  back to the mode it came from, its panes as they were (Run never closed them), Anatomy too.
 * - Leaving the browser's full screen (Escape, or the browser's own way) leaves Preview too.
 * - A reload leaves it:  the address is Run's, so the page comes back as the run page.
 * - The state is the page's, one Preview at a time:  STATIC and instance-free on purpose, as `AppAnatomy` is.
 * - Only on the editor page, which hands over its mode (`Preview.follow()`).
 ****************/
export class Preview {
  /** Is the app showing alone (reactive)? */
  static get isShowing(): boolean {
    return isShowing()
  }

  /** Go into Preview, or come back out. */
  static toggle(): void {
    if (isShowing()) Preview.leave()
    else Preview.enter()
  }

  /**
   * Show the running app alone:  see the class.
   * - Nothing off the editor page, which hands over its mode (`follow()`).
   * - Call from a key or a click:  the browser goes full screen only for one.
   */
  static enter(): void {
    if (isShowing() || !modeNow) return
    cameFrom = { mode: modeNow(), anatomy: AppAnatomy.isShowing }
    if (AppAnatomy.isShowing) AppAnatomy.hide()
    Inspector.stopInspecting()
    setShowing(true)
    document.documentElement.classList.add(PREVIEWING)
    if (cameFrom.mode !== "run") EditorMode.show("run")
    // the toast after full screen:  the page going full screen would cover one shown before
    void goFullScreen().then(sayHowToLeave)
  }

  /** Back to the editor as it was before `enter()`:  its mode, and Anatomy if it showed. */
  static leave(): void {
    if (!isShowing()) return
    const back = cameFrom
    stopShowing()
    if (back?.mode && back.mode !== "run") EditorMode.show(back.mode)
    if (back?.anatomy) AppAnatomy.show()
  }

  /**
   * The editor page's mode, for `enter()` to remember;  call in `<SpellEditor>`'s body.
   * - SIDE EFFECT:  while the page is up, leaving the browser's full screen leaves Preview.
   * - The page going (another page, the browser's Back) ends Preview with it, the mode left as it is then.
   */
  static follow(mode: () => Mode): void {
    modeNow = mode
    document.addEventListener("fullscreenchange", followFullScreen)
    onCleanup(() => {
      document.removeEventListener("fullscreenchange", followFullScreen)
      if (modeNow === mode) modeNow = undefined
      if (isShowing()) stopShowing()
    })
  }
}

/** Is Preview on? */
const [isShowing, setShowing] = createSignal(false)

/** What the page was before Preview:  its mode, and whether Anatomy showed. */
let cameFrom: { mode: Mode; anatomy: boolean } | undefined

/** The editor page's mode, while it's up:  `Preview.follow()`. */
let modeNow: (() => Mode) | undefined

/** Did Preview put the browser in full screen, so leaving it leaves Preview? */
let isFullScreen = false

/** The toast saying how to leave, while it shows. */
let howToLeave: { id: string } | undefined

/** The root's class while Preview is on:  `Preview.css` hides the editor round the app by it. */
const PREVIEWING = "spell-previewing"

/** How long the toast saying how to leave shows, msec. */
const HINT_TIME = 3000

/**
 * Turn Preview off:  the root's class, full screen and the toast;  the mode is the caller's.
 * - Full screen is let go before the browser tells us, so `followFullScreen()` doesn't leave twice.
 */
function stopShowing(): void {
  cameFrom = undefined
  setShowing(false)
  document.documentElement.classList.remove(PREVIEWING)
  if (howToLeave) UI.toasts.dismiss(howToLeave.id)
  howToLeave = undefined
  if (isFullScreen && document.fullscreenElement) {
    isFullScreen = false
    document.exitFullscreen().catch((error: unknown) => console.error("Preview:  couldn't leave full screen", error))
  }
  isFullScreen = false
}

/**
 * Ask the browser for full screen, the whole page, so toasts and dialogs shown after still show over it;
 * resolves once it has answered.
 * - NEVER rejects:  a browser that says no (no key or click just now, or a page in a frame) leaves the app
 *   filling the window, which is Preview all the same.
 */
async function goFullScreen(): Promise<void> {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    return
  }
  if (isShowing()) isFullScreen = true
  // left again before the browser said yes
  else await document.exitFullscreen().catch(() => undefined)
}

/** The browser left full screen (Escape, or its own menu):  so does Preview, when it put the browser there. */
function followFullScreen(): void {
  if (document.fullscreenElement || !isFullScreen) return
  isFullScreen = false
  Preview.leave()
}

/**
 * Say, for a few seconds, how to get back to the editor.
 * - NEVER throws:  a toast that can't show is only a hint lost, said on the console.
 */
async function sayHowToLeave(): Promise<void> {
  try {
    await UI.toasts.ready()
    if (!isShowing()) return
    // its first line the toast's title, the key under it
    const [title, message] = appTexts
      .text("previewHint", { key: UI.browser.isApple ? "⌥⌘Enter" : "Ctrl+Alt+Enter" })
      .split("\n")
    howToLeave = UI.toast({
      title,
      message,
      position: "bottom center",
      displayTime: HINT_TIME,
      showIcon: "expand",
      class: "PreviewHint"
    })
  } catch (error) {
    console.error("Preview:  couldn't say how to leave", error)
  }
}

setDebugGlobal({ Preview })
