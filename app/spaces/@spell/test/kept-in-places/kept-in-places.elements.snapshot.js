import { core, Thing, App, Place, h, sendCall } from "@spell/core"

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
  static savedIn = {
    place: "this_device",
    collection: "device_notes",
    times: ["created", "modified"], select: [] }

  // - it lives in this device
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/KeptInPlaces.spell", start: 752, end: 775 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in this device
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/KeptInPlaces.spell", start: 752, end: 775 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class FolderNote extends Note {
  static savedIn = {
    place: "note_folder",
    collection: "folder_notes",
    times: ["created", "modified"], select: [] }

  // - it lives in note folder
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/KeptInPlaces.spell", start: 807, end: 830 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in note folder
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/KeptInPlaces.spell", start: 807, end: 830 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class SheetNote extends Note {
  static savedIn = {
    place: "note_sheet",
    collection: "sheet_notes",
    times: ["created", "modified"], select: [] }

  // - it lives in note sheet
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/KeptInPlaces.spell", start: 861, end: 883 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in note sheet
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/KeptInPlaces.spell", start: 861, end: 883 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

/**
 * A note kept in each kind of place a Python program keeps things in (epic `data` P40):
 * - a database on this device:  in a browser, its own storage;  in Python, a file beside the program
 * - a data folder on the server:  each note a JSON file, in this project's `__data/notes`
 * - a CSV file on the server:  this project's `__data/notes.csv`, a row each
 * The restart test keeps a note in each, stops the program, runs it again, and reads them back.
 */
export class ThisDevice extends Place {}
export let thisDevice

export class NoteFolder extends Place {}
export let noteFolder

export class NoteSheet extends Place {}
export let noteSheet

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
          onClick: () => sendCall("keep_the_draft", [], this),
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
export let noteKeeper

///////////
// ## Start
///////////
// only this device's notes:  the server's need a page server, which a plain run has none of

/** Binds each thing the program keeps, from Python's state. */
export function adopt(state) {
  thisDevice = state["this_device"]
  noteFolder = state["note_folder"]
  noteSheet = state["note_sheet"]
  noteKeeper = state["note_keeper"]
}

