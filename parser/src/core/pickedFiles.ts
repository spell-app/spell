/**
 * What the page shows for a file a person picks (epic `editor` P41):  `family cookbook is a json file you pick`.
 * - One line at a time, a Spell UI toast that stays until it's answered or no longer true, for the place's `status`:
 *   - no file yet:  "Open a file", with its button
 *   - after a reload the browser forgot it may save there:  "Reopen recipes.json to save to it", Reopen (Q70)
 *   - moved, renamed or deleted:  "Can't find recipes.json ...", Find it and Save as new file (Q73)
 *   - changed by someone else, nothing unsaved here:  "recipes.json changed.  Read it again?" (Q74)
 *   - the first download, where the browser can't save back to a file:  where it went, and why (Q71)
 * - A save that finds someone else's change asks in a dialog:  keep theirs, keep yours, or keep both (Q72).
 * - Every word is the core's messages (`file-*`), in the program's language.
 * - Core never imports Spell UI:  it reaches the page's runtime where Spell UI keeps it, as `ui.ts` does.
 * - Imports `spell/places` as a TYPE only:  `placeKinds.ts` hands the place in.
 */
import type { PickedFilePlace, PickedFileStatus } from "spell/places/PickedFilePlace"

import { core } from "./core"

/**
 * SIDE EFFECT:  `place`'s lines show on the page from now on, as its status changes;  its file is opened at once,
 * so the first line shows as the program starts.
 * - No Spell UI on the page (`spell run`, a test):  nothing shows.
 */
export function showPickedFileLines(place: PickedFilePlace): void {
  const lines = new PickedFileLines(place)
  place.onStatus((status) => void lines.show(status))
  void place.list("").then(() => lines.show(place.status))
}

/****************
 * ### `PickedFileLines`
 * The one line a picked file's place shows, and its conflict dialog.
 * - A new status takes the line before it away.
 ****************/
class PickedFileLines {
  /** The line showing, to take away:  its toast's id. */
  private showing: string | undefined
  /** The conflict dialog is up:  a second conflict waits for its answer. */
  private isAsking = false

  constructor(private readonly place: PickedFilePlace) {}

  /**
   * Show what `status` says, in place of the line before.
   * - NEVER throws:  a line that can't show says so on the console.
   */
  async show(status: PickedFileStatus): Promise<void> {
    const ui = pageUI()
    if (!ui) return
    try {
      const page = await ui.load()
      if (this.showing !== undefined) page.toasts.dismiss(this.showing)
      this.showing = undefined
      if (status === "conflict") return await this.askWhichToKeep(page)
      const line = this.lineFor(status)
      if (!line) return
      await page.toasts.ready()
      this.showing = page.toast({ ...line, markdown: false, displayTime: line.actions ? 0 : "auto" }).id
    } catch (error) {
      core.console.error("a picked file's line can't show", error)
    }
  }

  /** What `status` shows:  its words, its look and its buttons;  `undefined` for none. */
  private lineFor(status: PickedFileStatus): PageLine | undefined {
    const { place } = this
    const file = place.fileName ?? ""
    const button = (key: Parameters<typeof core.message>[0], click: () => unknown) => ({
      text: core.message(key),
      click: () => void click()
    })
    if (status === "no file") {
      return { message: core.message("file-none"), class: "info", actions: [button("file-open", () => place.pick())] }
    }
    if (status === "needs permission") {
      return {
        message: core.message("file-reopen", { file }),
        class: "info",
        actions: [button("file-reopen-button", () => place.reopen())]
      }
    }
    if (status === "not found") {
      return {
        message: core.message("file-missing", { file }),
        class: "warning",
        actions: [button("file-find", () => place.pick()), button("file-save-new", () => place.saveAsNew())]
      }
    }
    if (status === "changed") {
      return {
        message: core.message("file-changed", { file }),
        class: "info",
        actions: [button("file-read-again", () => place.readAgain())]
      }
    }
    if (status === "downloaded") return { message: core.message("file-downloaded", { file }), class: "info" }
    return undefined
  }

  /**
   * Someone else changed the file under changes made here:  keep theirs, keep yours, or keep both (Q72).
   * - Cancel, the close ✕ or Escape:  nothing is written, and the next save asks again.
   */
  private async askWhichToKeep(page: PageUI): Promise<void> {
    if (this.isAsking) return
    this.isAsking = true
    try {
      const file = this.place.fileName ?? ""
      const choice = await page.modals.choose({
        title: core.message("file-conflict-title", { file }),
        message: core.message("file-conflict", { file }),
        choices: [
          { value: "theirs", text: core.message("file-keep-theirs") },
          { value: "both", text: core.message("file-keep-both") },
          { value: "yours", text: core.message("file-keep-yours"), color: "primary" }
        ]
      })
      if (choice === "theirs") await this.place.keepTheirs()
      else if (choice === "yours") await this.place.keepYours()
      else if (choice === "both") await this.place.saveAsNew()
    } finally {
      this.isAsking = false
    }
  }
}

/** One line:  a Spell UI toast's options, the part used here. */
type PageLine = {
  message: string
  class: string
  actions?: { text: string; click: () => void }[]
}

/**
 * What this file uses of the page's Spell UI runtime (`UI`):  typed here, as core never imports `ui`.
 * - `ui.ts`' `PageUI` is the rest of it.
 */
type PageUI = {
  /** resolves with the runtime once its services are in */
  load(): Promise<PageUI>
  /** a toast:  `UI.toast()` */
  toast(options: PageLine & { markdown: boolean; displayTime: number | "auto" }): { id: string }
  /** toasts:  `ready()` once one can show;  `dismiss()` takes one away */
  toasts: { ready(): Promise<void>; dismiss(id: string): void }
  /** `UI.modals.choose()`:  the picked choice's value, `undefined` for Cancel */
  modals: {
    choose<T extends string>(options: {
      title: string
      message: string
      choices: { value: T; text: string; color?: string }[]
    }): Promise<T | undefined>
  }
}

/** Where Spell UI keeps its runtime, so every bundle on the page shares it (`ui`'s `RUNTIME_KEY`). */
const UI_RUNTIME_KEY = Symbol.for("spell-ui:runtime")

/** The page's Spell UI runtime, if there is one. */
function pageUI(): PageUI | undefined {
  return (globalThis as Record<symbol, PageUI | undefined>)[UI_RUNTIME_KEY]
}
