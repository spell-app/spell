import { describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject } from "spell/parser/spell/test"

/** `lines`, one file, as a Python program's drawing half:  `<Project>.elements.spell.js`. */
function drawingHalf(lines: string[]): string {
  const [file] = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }]).files
  if (file!.errors.length) throw new Error(`parse errors:\n${file!.errors.join("\n")}`)
  return String(PY.ElementsWriter.instance.writeMatch(file!.match))
}

describe("ElementsWriter", () => {
  test("keeps what describes the actions and menus:  the page fills its toolbars and runs its keys (epic `language` T51)", () => {
    const js = drawingHalf([
      "a game is an app where:",
      "\t- to deal:",
      '\t\t- titled "Deal"',
      "\t\t- shortcut D",
      "\t\tnotify 1",
      '\t- its "game menu" is a menu of "deal" and "undo"',
      "set the game to a new game",
      "deal the game"
    ])
    expect(js).toContain('core.describeAction(Game, "deal", { title: "Deal", shortcuts: ["D"] })')
    expect(js).toContain('core.describeMenu(Game, "gameMenu", { items: ["deal", "undo"] })')
    // its top-level steps are Python's
    expect(js).not.toMatch(/\bgame\.deal\(\)/)
  })
})
