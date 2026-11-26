import { afterEach, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"

/**
 * Which builds on the page server the editor's loading screen waits on (`editor.waitsOnBuildOf()`, epic `editor`
 * P45, T176):  the project being opened, and every project it imports, through other projects too.
 * - The projects are stand-ins, their project files set by hand:  nothing's loaded.
 */
describe("editor.waitsOnBuildOf()", () => {
  const before = { opening: editor.opening, project: editor.project }

  afterEach(() => {
    editor.opening = before.opening
    editor.project = before.project
  })

  /** A stand-in project `projectId`, importing `imports`. */
  const projectFor = (projectId: string, imports: string[] = []) => {
    const project = new SP.SpellProject(projectId)
    project.contents = { imports: imports.map((path) => ({ path })) } as unknown as typeof project.contents
    return project
  }

  test("the project opened, and what it imports, through another project too;  never another's", () => {
    const opened = projectFor("@spell/test/opening-app", ["@spell/test/opening-cards"])
    projectFor("@spell/test/opening-cards", ["@spell/test/opening-games"])
    projectFor("@spell/test/opening-games")
    projectFor("@spell/test/opening-other")
    editor.project = undefined
    editor.noteOpening(opened, "opening")
    expect(editor.waitsOnBuildOf("@spell/test/opening-app")).toBe(true)
    expect(editor.waitsOnBuildOf("@spell/test/opening-cards")).toBe(true)
    expect(editor.waitsOnBuildOf("@spell/test/opening-games")).toBe(true)
    expect(editor.waitsOnBuildOf("@spell/test/opening-other")).toBe(false)
    // done opening:  the project open still counts
    editor.project = opened
    editor.openingDone(opened)
    expect(editor.opening).toBeUndefined()
    expect(editor.waitsOnBuildOf("@spell/test/opening-games")).toBe(true)
    // nothing open, nothing being opened:  none
    editor.project = undefined
    expect(editor.waitsOnBuildOf("@spell/test/opening-app")).toBe(false)
  })
})
