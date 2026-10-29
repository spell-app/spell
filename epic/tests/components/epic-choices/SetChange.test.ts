import { describe, expect, test } from "vite-plus/test"

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

  test("a mark for another set of the holder is set aside;  the set's index rides in every mark", () => {
    const second: SetState = { ...ONE, index: 1 }
    expect(SetChange.fieldsFor({ pick: "A", choices: 0 }, second)).toEqual({})
    expect(SetChange.fieldsFor({ pick: "A", choices: 1 }, second)).toEqual({ pick: "A", choices: 1 })
    expect(SetChange.toggle({}, second, "A")).toEqual({ pick: "A", choices: 1 })
  })
})
