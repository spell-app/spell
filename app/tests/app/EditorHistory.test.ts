import { describe, expect, test, vi } from "vite-plus/test"

import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { EditorHistory, type EditedFile } from "spell/app/app/EditorHistory"

/** A history over one file's text, with no code editor:  what the Inspector's edits make. */
function setup(contents: string) {
  const file: EditedFile = { contents }
  const onGone = vi.fn()
  const history = new EditorHistory({
    applyEdits: (edited, edits) => {
      edited.contents = SourceEdits.applied(edited.contents ?? "", edits)
    },
    onGone
  })
  return { file, history, onGone }
}

const TAG = `<ui-text color="blue">x</ui-text>`
const SOURCE = `before\n${TAG}\nafter\n`

function changeColor({ history, file }: ReturnType<typeof setup>, from: string, to: string, target?: unknown) {
  history.change(
    {
      file,
      at: (file.contents ?? "").indexOf(`<ui-text color="${from}"`),
      before: `<ui-text color="${from}">`,
      after: `<ui-text color="${to}">`
    },
    { title: "Change Color", target }
  )
}

describe("EditorHistory", () => {
  test("a change goes into the text, undo and redo put it back and forth", () => {
    const setUp = setup(SOURCE)
    changeColor(setUp, "blue", "red")
    expect(setUp.file.contents).toBe(SOURCE.replace("blue", "red"))
    expect(setUp.history.undoTitle).toBe("Undo Change Color")
    setUp.history.undo()
    expect(setUp.file.contents).toBe(SOURCE)
    setUp.history.redo()
    expect(setUp.file.contents).toBe(SOURCE.replace("blue", "red"))
  })

  test("undo still works after typing elsewhere in the file", () => {
    const setUp = setup(SOURCE)
    changeColor(setUp, "blue", "red")
    setUp.file.contents = `typed a whole new line\n${setUp.file.contents}more at the end\n`
    setUp.history.undo()
    expect(setUp.file.contents).toBe(`typed a whole new line\n${SOURCE}more at the end\n`)
  })

  test("its text gone:  says so, and that step does nothing", () => {
    const setUp = setup(SOURCE)
    changeColor(setUp, "blue", "red")
    setUp.file.contents = "before\nafter\n"
    setUp.history.undo()
    expect(setUp.file.contents).toBe("before\nafter\n")
    expect(setUp.onGone).toHaveBeenCalledWith("Change Color")
  })

  test("of two the same, the one nearest where it was", () => {
    const twice = `${TAG}\n\n\n${TAG}\n`
    const setUp = setup(twice)
    const second = twice.lastIndexOf(TAG)
    setUp.history.change(
      { file: setUp.file, at: second, before: `<ui-text color="blue">`, after: `<ui-text color="red">` },
      { title: "Change Color" }
    )
    setUp.history.undo()
    expect(setUp.file.contents).toBe(twice)
    setUp.history.redo()
    expect(setUp.file.contents).toBe(`${TAG}\n\n\n${TAG.replace("blue", "red")}\n`)
  })

  test("a drag on one field folds into one step, by its target", () => {
    const setUp = setup(SOURCE)
    changeColor(setUp, "blue", "red", "color")
    changeColor(setUp, "red", "green", "color")
    changeColor(setUp, "green", "gold", "color")
    expect(setUp.history.steps).toHaveLength(1)
    setUp.history.undo()
    expect(setUp.file.contents).toBe(SOURCE)
  })

  test("a change to many things is one transaction:  one step", () => {
    const setUp = setup(`${TAG}\n${TAG.replace(">x<", ">y<")}\n`)
    setUp.history.transaction("Change Color", () => {
      changeColor(setUp, "blue", "red")
      changeColor(setUp, "blue", "red")
    })
    expect(setUp.history.steps).toHaveLength(1)
    expect(setUp.file.contents).not.toContain("blue")
    setUp.history.undo()
    expect(setUp.file.contents).toBe(`${TAG}\n${TAG.replace(">x<", ">y<")}\n`)
  })

  test("what goes with a change to the running app runs by way of undo and redo", () => {
    const setUp = setup(SOURCE)
    const live = vi.fn()
    setUp.history.change(
      {
        file: setUp.file,
        at: SOURCE.indexOf("<ui-text"),
        before: `<ui-text color="blue">`,
        after: `<ui-text color="red">`
      },
      { title: "Change Color", live }
    )
    setUp.history.undo()
    setUp.history.redo()
    expect(live.mock.calls).toEqual([["undo"], ["redo"]])
  })
})
