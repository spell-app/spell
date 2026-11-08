import { core, Thing, App, Place, prop, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Kept in places")
////////////////////
// ## Kept in places
////////////////////

export class Note extends Thing {
  // - its "text" is text
  @prop({ type: "text" })
  accessor text!: string
}

export class DeviceNote extends Note {
  static savedIn = { place: "this_device", collection: "device_notes", select: [] }
}

export class FolderNote extends Note {
  static savedIn = { place: "note_folder", collection: "folder_notes", select: [] }
}

export class SheetNote extends Note {
  static savedIn = { place: "note_sheet", collection: "sheet_notes", select: [] }
}

/**
 * A note kept in each kind of place a Python program keeps things in (epic `data` P40):
 * - a database on this device:  in a browser, its own storage;  in Python, a file beside the program
 * - a data folder on the server:  each note a JSON file, in this project's `__data/notes`
 * - a CSV file on the server:  this project's `__data/notes.csv`, a row each
 * The restart test keeps a note in each, stops the program, runs it again, and reads them back.
 */
export class ThisDevice extends Place {}
export const thisDevice = core.place(new ThisDevice(), { name: "this_device", kind: "database on this device" })

export class NoteFolder extends Place {}
export const noteFolder = core.place(new NoteFolder(), {
  name: "note_folder",
  kind: "data folder",
  at: "/api/places/spaces/@spell/test/kept-in-places/__data/notes",
  checkedEvery: 30
})

export class NoteSheet extends Place {}
export const noteSheet = core.place(new NoteSheet(), {
  name: "note_sheet",
  kind: "sheet",
  at: "/api/places/spaces/@spell/test/kept-in-places/__data/notes.csv",
  idColumn: "id",
  checkedEvery: 30
})

export class NoteKeeper extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "draft" is text
  @prop({ type: "text" })
  accessor draft!: string

  // - its "device count" is a number
  @prop({ type: "number" })
  accessor deviceCount!: number

  // - its "folder count" is a number
  @prop({ type: "number" })
  accessor folderCount!: number

  // - its "sheet count" is a number
  @prop({ type: "number" })
  accessor sheetCount!: number

  /** the draft, kept in each place */
  keepTheDraft() {
    if (this.draft === "") return
    core.saveThing(new DeviceNote({ text: this.draft }))
    core.saveThing(new FolderNote({ text: this.draft }))
    core.saveThing(new SheetNote({ text: this.draft }))
    this.draft = ""
  }

  /** how many each place keeps now */
  async countTheNotes() {
    this.deviceCount = core.itemCountOf(await core.savedThings(DeviceNote))
    this.folderCount = core.itemCountOf(await core.savedThings(FolderNote))
    this.sheetCount = core.itemCountOf(await core.savedThings(SheetNote))
  }

  @drawn draw() {
    return (
      <ui-stack>
        <ui-form value={this}>
          <ui-input name="draft" aria-label="Note" />
          <ui-button class="keep" onClick={core.pressed(this, () => this.keepTheDraft())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Keep
          </ui-button>
        </ui-form>
        <ui-text class="counts">
          {this.deviceCount}
          {" on this device, "}
          {this.folderCount}
          {" in the folder, "}
          {this.sheetCount}
          {" in the sheet"}
        </ui-text>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-app>`:  a note keeper, drawn in its own element, e.g. by `draw the note keeper`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its note keeper's properties;  its methods call its note keeper's.
 * - What every view's element does, e.g. drawing its note keeper, is `SpellElement`'s.
 */
export class NoteKeeperElement extends SpellElement<NoteKeeper> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "note keeper", [
    { name: "draft", kind: "string", description: "Its draft." },
    { name: "device-count", kind: "number", description: "Its deviceCount." },
    { name: "folder-count", kind: "number", description: "Its folderCount." },
    { name: "sheet-count", kind: "number", description: "Its sheetCount." }
  ])

  keepTheDraft() {
    return this.currentThing?.keepTheDraft()
  }

  countTheNotes() {
    return this.currentThing?.countTheNotes()
  }
}
core.useElement(NoteKeeper, NoteKeeperElement)
export const noteKeeper = new NoteKeeper()

core.heading("Start")
///////////
// ## Start
///////////
// only this device's notes:  the server's need a page server, which a plain run has none of
core.console.log(core.itemCountOf(await core.savedThings(DeviceNote)))
core.saveThing(new DeviceNote({ text: "a run" }))
core.console.log(core.itemCountOf(await core.savedThings(DeviceNote)))
if (!core.isCarryingOver) noteKeeper.start()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `NoteKeeperElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
