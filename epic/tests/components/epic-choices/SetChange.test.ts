import { describe, expect, test } from "vite-plus/test"

import { parseSetLetter, pickLabel, setLetter, withSetPick } from "spell/epic/review"
import { SetChange, type SetState } from "spell/epic/components/epic-choices/SetChange"

/** A pick-one set, the item's first, nothing chosen;  a pick-any one with `A` chosen. */
const ONE: SetState = { index: 0, multiple: false, chosen: [] }
const ANY: SetState = { index: 0, multiple: true, chosen: ["A"] }

describe("SetChange", () => {
  test("pick one:  a pick replaces the last;  again, no pick, no mark", () => {
    const picked = SetChange.toggle({}, ONE, "B")
    expect(picked).toEqual({ pick: "B", choices: 0 })
    expect(SetChange.toggle(picked, ONE, "C")).toEqual({ pick: "C", choices: 0 })
    expect(SetChange.toggle(picked, ONE, "B")).toEqual({})
  })

  test("pick any:  starts from `chosen`, adds and takes off;  back to `chosen` is no pick to send", () => {
    const more = SetChange.toggle({}, ANY, "C")
    expect(more).toEqual({ pick: "A C", choices: 0 })
    expect(SetChange.toggle(more, ANY, "C")).toEqual({})
    expect(SetChange.toggle({}, ANY, "A")).toEqual({})
  })

  test("the flip:  to pick any;  back to one keeps the newest pick;  back to what the set says, no flip", () => {
    const any = SetChange.flip(SetChange.toggle({}, ONE, "B"), ONE)
    expect(any).toEqual({ pick: "B", multiple: true, choices: 0 })
    const two = SetChange.toggle(any, ONE, "A")
    expect(two).toEqual({ pick: "B A", multiple: true, choices: 0 })
    expect(SetChange.flip(two, ONE)).toEqual({ pick: "A", choices: 0 })
  })

  test("added options:  the next key, picked;  changed, dropped (out of the picks too)", () => {
    const one = SetChange.add({}, ONE, { title: "Both" })
    expect(one).toEqual({ pick: "+1", added: [{ key: "+1", title: "Both" }], choices: 0 })
    const two = SetChange.add(SetChange.flip(one, ONE), ONE, { title: "Neither", note: "why not" })
    expect(two.pick).toBe("+1 +2")
    expect(SetChange.editAdded(two, ONE, "+1", { title: "Both, B first" }).added![0]).toEqual({
      key: "+1",
      title: "Both, B first"
    })
    expect(SetChange.dropAdded(two, ONE, "+1")).toEqual({
      pick: "+2",
      multiple: true,
      added: [{ key: "+2", title: "Neither", note: "why not" }],
      choices: 0
    })
  })

  test("edits and removals, each undone;  a removal takes the option out of the picks", () => {
    const edited = SetChange.edit({}, ONE, "A", "Six colours", "short")
    expect(edited).toEqual({ edited: [{ letter: "A", title: "Six colours", note: "short" }], choices: 0 })
    expect(SetChange.undoEdit(edited, ONE, "A")).toEqual({})
    const removed = SetChange.remove(SetChange.toggle({}, ONE, "B"), ONE, "B")
    expect(removed).toEqual({ removed: ["B"], choices: 0 })
    expect(SetChange.undoRemove(removed, ONE, "B")).toEqual({})
  })

  test("a mark for another set of the holder isn't this set's;  the set's index rides in every mark", () => {
    const second: SetState = { ...ONE, index: 1 }
    expect(SetChange.fieldsFor({ pick: "A", choices: 0 }, second)).toEqual({})
    expect(SetChange.fieldsFor({ pick: "A", choices: 1 }, second)).toEqual({ pick: "A", choices: 1 })
    expect(SetChange.toggle({}, second, "A")).toEqual({ pick: "A", choices: 1 })
  })

  test("two sets of one holder:  both picks kept in its one mark, each read back by its set (I227)", () => {
    const second: SetState = { ...ONE, index: 1 }
    const first = SetChange.toggle({}, ONE, "B")
    const both = withSetPick(withSetPick({}, 0, first), 1, SetChange.toggle({}, second, "B"))
    expect(both).toEqual({ pick: "B", choices: 0, sets: [{ pick: "B", choices: 1 }] })
    expect(SetChange.fieldsFor(both, ONE)).toEqual({ pick: "B", choices: 0 })
    expect(SetChange.fieldsFor(both, second)).toEqual({ pick: "B", choices: 1 })
    // the 2nd set's pick changed:  the 1st's stays
    const changed = withSetPick(both, 1, SetChange.toggle(SetChange.fieldsFor(both, second), second, "C"))
    expect(changed).toEqual({ pick: "B", choices: 0, sets: [{ pick: "C", choices: 1 }] })
    // a mark from before I227 (one set, no `sets`):  read as before
    expect(SetChange.fieldsFor({ pick: "A" }, ONE)).toEqual({ pick: "A" })
    expect(pickLabel(both)).toBe("B, B2")
  })
})

describe("set letters (I227)", () => {
  test("the 1st set's letters as they are;  the 2nd's `A2`, the 3rd's `A3`;  an added key as it is", () => {
    expect(setLetter("A", 0)).toBe("A")
    expect(setLetter("A", undefined)).toBe("A")
    expect(setLetter("B", 1)).toBe("B2")
    expect(setLetter("C", 2)).toBe("C3")
    expect(setLetter("+1", 1)).toBe("+1")
  })

  test("a typed letter read back:  `B2` is `B` of the 2nd set;  `B` names no set", () => {
    expect(parseSetLetter("B2")).toEqual({ letter: "B", choices: 1 })
    expect(parseSetLetter("b")).toEqual({ letter: "B" })
    expect(parseSetLetter("B1")).toEqual({ letter: "B", choices: 0 })
    expect(parseSetLetter("+1")).toBe(undefined)
  })
})
