import { describe, expect, test } from "vite-plus/test"

import { EDITOR_AT_KEY, keepEditorOnReload, leaveEditor } from "spell/app/app/editorTab"

/** The page going, as the browser says it as a tab reloads. */
const goes = () => dispatchEvent(new PageTransitionEvent("pagehide"))

/**
 * A tab showing the editor stays the editor when it's loaded again (epic `editor` I364):
 * the editor notes its address as its page goes, for `run.html`'s first script to send the tab back to it.
 */
describe("editorTab", () => {
  test("takes ?editor off the address, forgets the last note, and notes the address as the page goes", () => {
    const before = location.pathname + location.search
    sessionStorage.setItem(EDITOR_AT_KEY, "/run/old")
    history.replaceState(history.state, "", `${location.pathname}?x=1&editor`)
    keepEditorOnReload()
    expect(location.search).toBe("?x=1")
    expect(sessionStorage.getItem(EDITOR_AT_KEY)).toBeNull()
    goes()
    expect(sessionStorage.getItem(EDITOR_AT_KEY)).toBe(location.pathname)
    history.replaceState(history.state, "", before)
  })

  test("leaving on purpose (a group's own page) notes nothing", () => {
    leaveEditor()
    goes()
    expect(sessionStorage.getItem(EDITOR_AT_KEY)).toBeNull()
  })
})
