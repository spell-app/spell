import { describe, expect, test } from "vite-plus/test"
import { Text } from "@codemirror/state"

import { CodeMirrorPinned } from "spell/app/app/ui/codemirror/CodeMirrorPinned"

/**
 * `CodeMirrorPinned`, the lines pinned over the code's top (epic `codemirror` T8):  which lines open the blocks a line
 * is inside, by indent.
 */
describe("CodeMirrorPinned.openersOf()", () => {
  const doc = Text.of([
    'a "card" is a view', // 1
    "\tits rank is 1", // 2
    "\tto flip it", // 3
    "\t\tif it is face up", // 4
    "", // 5
    "\t\t\tturn it over", // 6
    "\t\tsay it", // 7
    'a "pile" is a list' // 8
  ])

  test("each block a line is inside, outermost first", () => {
    expect(CodeMirrorPinned.openersOf(doc, 6)).toEqual([1, 3, 4])
    expect(CodeMirrorPinned.openersOf(doc, 7)).toEqual([1, 3])
    expect(CodeMirrorPinned.openersOf(doc, 2)).toEqual([1])
  })

  test("a blank line is inside what the next line with words is", () => {
    expect(CodeMirrorPinned.openersOf(doc, 5)).toEqual([1, 3, 4])
  })

  test("none at the top level;  only the innermost `most`", () => {
    expect(CodeMirrorPinned.openersOf(doc, 8)).toEqual([])
    expect(CodeMirrorPinned.openersOf(doc, 1)).toEqual([])
    expect(CodeMirrorPinned.openersOf(doc, 6, 2)).toEqual([3, 4])
  })
})
