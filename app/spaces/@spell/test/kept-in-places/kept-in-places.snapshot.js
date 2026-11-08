import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Kept in places")
////////////////////
// ## Kept in places
////////////////////

export class Note extends Thing {
  // - its "text" is text
  static { this.declareProp("text", { type: "text" }) }
  get text() { return this.getProp("text") }
  set text(value) { this.setProp("text", value) }
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
  static { this.declareProp("draft", { type: "text" }) }
  get draft() { return this.getProp("draft") }
  set draft(value) { this.setProp("draft", value) }

  // - its "device count" is a number
  static { this.declareProp("deviceCount", { type: "number" }) }
  get deviceCount() { return this.getProp("deviceCount") }
  set deviceCount(value) { this.setProp("deviceCount", value) }

  // - its "folder count" is a number
  static { this.declareProp("folderCount", { type: "number" }) }
  get folderCount() { return this.getProp("folderCount") }
  set folderCount(value) { this.setProp("folderCount", value) }

  // - its "sheet count" is a number
  static { this.declareProp("sheetCount", { type: "number" }) }
  get sheetCount() { return this.getProp("sheetCount") }
  set sheetCount(value) { this.setProp("sheetCount", value) }

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

  draw() {
    return h("ui-stack",
      h("ui-form", { value: this },
        h("ui-input", { name: "draft", "aria-label": "Note" }),
        h("ui-button", {
          class: "keep",
          onClick: core.pressed(this, () => this.keepTheDraft()),
          style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
        }, "Keep")
      ),
      h("ui-text", { class: "counts" },
        () => this.deviceCount,
        " on this device, ",
        () => this.folderCount,
        " in the folder, ",
        () => this.sheetCount,
        " in the sheet"
      )
    )
  }
}
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
