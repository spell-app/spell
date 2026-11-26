import { render, type JSX } from "@solidjs/web"

import { UI as SpellUI } from "spell/ui"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { uiReady } from "spell/app/app/solid/loadUI"
import { editorSpellWithActions } from "spell/app/app/solid/MenuBar"
import type { EditorThing } from "spell/app/app/layout/editorNames"
import type { VersionRow, VersionsBoxProps } from "spell/app/app/solid/modals"

/****************
 * ### `openVersions()`
 * The project menu's Versions:  `SpellEditor.spell`'s `versions box`, a `<ui-modal>` drawn in `<body>`,
 * removed once it closes (epic `editor` I115, as About Spell is, I94).
 * - How it looks is the Spell's, to change there:  its heading, message, a radio per version, its buttons.
 * - What it says, and what its buttons do, is the editor's:
 *   - its words in the page's language (`appTexts`), handed to the box as it opens
 *   - a version clicked is the one chosen (`choose`);  Restore hands it to `props.restore`
 *   - Save Current Changes runs `props.keep`, saying "Keeping this version…" while it does (T179), shows the list it
 *     gives back, the choice where it was, and goes grey;  the box stays open.  A failure leaves it ready to try again:  `keep` shows what went wrong.
 * - Reached by `editor.showVersions()` through the dialogs' dynamic `import()`:  `editor.ts` stays free of Solid.
 ****************/
export async function openVersions(props: VersionsBoxProps): Promise<void> {
  await uiReady
  const spell = await editorSpellWithActions()
  const box = spell.editor.versionsBox as VersionsBoxThing
  const Version = spell.exports.Version as new () => VersionThing

  /** `rows` as the box's versions, `chosen` the one chosen. */
  const list = (rows: readonly VersionRow[], chosen: string | undefined) => {
    box.versions.items = rows.map((row) => {
      const version = new Version()
      version.name = row.name
      version.when = row.when
      version.place = row.name === chosen ? "chosen" : "other"
      version.choose = () => {
        for (const each of box.versions.getValues()) each.place = each === version ? "chosen" : "other"
      }
      return version
    })
    box.listing = rows.length ? "listed" : "empty"
  }
  const chosenName = () => box.versions.getValues().find((version) => version.place === "chosen")?.name

  box.heading = appTexts.text("versions")
  box.message = appTexts.text("versionsMessage")
  box.emptyWords = appTexts.text("noVersions")
  box.keepWords = appTexts.text("saveCurrentChanges")
  box.cancelWords = SpellUI.i18n.t("cancel")
  box.restoreWords = appTexts.text("restoreVersion")
  box.keeping = props.canKeep ? "offered" : "hidden"
  list(props.versions, props.chosen)
  box.restore = () => {
    const name = chosenName()
    if (name) void props.restore(name)
  }
  box.keepTheChanges = async () => {
    const chosen = chosenName()
    box.keeping = "busy"
    // the busy button says what it's doing (epic `editor` T179)
    box.keepWords = appTexts.text("waitKeeping")
    try {
      list(await props.keep(), chosen)
      box.keeping = "kept"
    } catch {
      // `keep` showed what went wrong:  the button stays, to try again
      box.keeping = "offered"
    } finally {
      box.keepWords = appTexts.text("saveCurrentChanges")
    }
  }

  const host = document.createElement("div")
  host.className = "VersionsBox"
  document.body.append(host)
  const dispose = render(() => spell.drawInPlace(box) as JSX.Element, host)
  host.addEventListener(
    "ui-closed",
    () => {
      dispose()
      host.remove()
    },
    { once: true }
  )
}

/** The Spell's `versions box`, as the editor fills it:  its names `EDITOR_NAMES`' `VersionsBox`. */
type VersionsBoxThing = EditorThing<
  "VersionsBox",
  {
    versions: { items: VersionThing[]; getValues(): VersionThing[] }
    heading: string
    message: string
    emptyWords: string
    keepWords: string
    cancelWords: string
    restoreWords: string
    listing: "listed" | "empty"
    keeping: "offered" | "busy" | "kept" | "hidden"
    restore: () => void
    keepTheChanges: () => Promise<void>
  }
>

/** The Spell's `version`, one row:  its names `EDITOR_NAMES`' `Version`. */
type VersionThing = EditorThing<
  "Version",
  {
    name: string
    when: string
    place: "chosen" | "other"
    choose: () => void
  }
>
