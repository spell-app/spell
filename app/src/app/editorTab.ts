/**
 * A tab showing the editor stays the editor when it's loaded again (epic `editor` I364).
 * - Why:  the editor's Run is at `/run/<project>`, the run page's address too.
 *   Opened straight, that address is the run page (`editorPageFor()`), so every reload of the editor in Run landed
 *   there:  vite's own reloads as code changed, the editor reloading as Spell restarted, the browser's Reload.
 * - How:
 *   - as the editor's page goes, it notes its address in the TAB's session storage (`EDITOR_AT_KEY`)
 *   - the run page, opened at that same address in that tab, asks for the editor instead, before it draws anything:
 *     the same address with `?editor` (`EDITOR_QUERY`;  `run.html`'s first script)
 *   - the editor's server sends the editor for an address with `?editor`, and the editor takes it off the address as
 *     it starts (`keepEditorOnReload()`)
 * - Per tab:  a `/run/` link opened in another tab, or typed, is still the run page.
 * - NEVER imports anything:  `index.tsx` calls it before the router reads the address.
 */

/** The session storage key the editor's address is noted under as its page goes;  `run.html` reads it too. */
export const EDITOR_AT_KEY = "spell:editor-at"

/** The query asking the editor's server for the editor at a `/run/` address;  `editorPageFor()` reads it too. */
export const EDITOR_QUERY = "editor"

/** Set by `leaveEditor()`:  the page goes on purpose to whatever the server sends, so nothing is noted. */
let isLeaving = false

/**
 * As the editor starts:  take `?editor` off the address, forget the note, and note the address again as the page goes.
 * - SIDE EFFECTS:  `history.replaceState()`;  listens to `pagehide` and `pageshow`.
 * - NEVER throws:  without session storage (a private window's), a reload in Run is the run page, as before.
 */
export function keepEditorOnReload(): void {
  const url = new URL(location.href)
  if (url.searchParams.has(EDITOR_QUERY)) {
    url.searchParams.delete(EDITOR_QUERY)
    history.replaceState(history.state, "", url.pathname + url.search + url.hash)
  }
  forget()
  addEventListener("pagehide", () => {
    if (isLeaving) return
    try {
      sessionStorage.setItem(EDITOR_AT_KEY, location.pathname)
    } catch {
      // no session storage:  a reload in Run is the run page
    }
  })
  // back from the browser's back-forward cache:  the editor again, so the note is stale
  addEventListener("pageshow", (event) => event.persisted && forget())
}

/**
 * The editor loads its address again ON PURPOSE to get whatever page the server sends for it:
 * a group that holds its own page (`GroupPage`'s `showsOwnPage()`).
 */
export function leaveEditor(): void {
  isLeaving = true
  forget()
}

/** Forget the note:  only a page going leaves one.  NEVER throws. */
function forget(): void {
  try {
    sessionStorage.removeItem(EDITOR_AT_KEY)
  } catch {
    // no session storage:  nothing noted
  }
}
