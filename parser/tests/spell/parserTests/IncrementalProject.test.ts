import { describe, test, expect } from "vite-plus/test"

import {
  incrementalSpellProject,
  parseSpellProject,
  summarize,
  summarizeIncremental,
  type SpellSourceFile
} from "spell-lang/spell/test"

/**
 * `P.IncrementalProject` MUST give exactly what a full parse gives:
 * same compiled output, errors and warnings, for every file -- here over projects written inline.
 * - Every edit of every line of the frozen Solitaire, and `keepLastGood`:  spell-app's `IncrementalProject.test.ts`,
 *   beside the projects.
 */
describe("incremental parsing ~== full parse", () => {
  test("a method added below a line that calls it:  that line parses;  deleted, it doesn't (P22)", () => {
    const call = "greet everybody\n"
    const method = "to greet everybody\n\tprint 1\n"
    for (const keepLastGood of [false, true]) {
      const project = incrementalSpellProject([{ path: "/A.spell", contents: call }], keepLastGood)
      const errors = () => summarizeIncremental(project)[0]!.errors
      expect(errors(), `keepLastGood ${keepLastGood}`).toHaveLength(1)
      project.update("/A.spell", call + method)
      expect(errors(), `keepLastGood ${keepLastGood}, added`).toEqual([])
      project.update("/A.spell", call)
      expect(errors(), `keepLastGood ${keepLastGood}, deleted`).toHaveLength(1)
    }
  })

  test("a type declared further down counts -- and an edit adding or removing one re-parses what's above it", () => {
    const typeFiles: SpellSourceFile[] = [
      { path: "/A.spell", contents: "set x to 1\nprint x is a widget" },
      { path: "/B.spell", contents: "a widget is a thing" }
    ]
    const project = incrementalSpellProject(typeFiles)
    expect(summarizeIncremental(project)).toEqual(summarize(parseSpellProject(typeFiles)))
    expect(summarizeIncremental(project).flatMap((file) => file.errors)).toEqual([])
    const edits: Array<[path: string, contents: string]> = [
      ["/B.spell", "a gadget is a thing"],
      ["/A.spell", "set x to 1\nprint x is a widget\na widget is a thing"],
      ["/A.spell", "set x to 1\nprint x is a widget"],
      ["/B.spell", "a widget is a thing\na gadget is a thing"],
      ["/B.spell", "// nothing"],
      ["/B.spell", "a widget is a thing"]
    ]
    for (const [path, contents] of edits) {
      typeFiles.splice(
        typeFiles.findIndex((it) => it.path === path),
        1,
        { path, contents }
      )
      project.update(path, contents)
      expect(summarizeIncremental(project), `${path}: ${contents}`).toEqual(summarize(parseSpellProject(typeFiles)))
    }
  })

  test("a body edit which changes what a method returns re-parses what follows", () => {
    const text = (returned: string) =>
      ["to check (n as number): print 1", "to pick (n)", `\treturn ${returned}`, "check pick 2"].join("\n")
    const project = incrementalSpellProject([{ path: "/A.spell", contents: text("1") }])
    expect(summarizeIncremental(project)[0]!.errors).toEqual([])
    for (const returned of ['"a"', "2", "3"]) {
      project.update("/A.spell", text(returned))
      const full = summarize(parseSpellProject([{ path: "/A.spell", contents: text(returned) }]))
      expect(summarizeIncremental(project), returned).toEqual(full)
      // text isn't a number:  `check` doesn't take it
      expect(full[0]!.errors, returned).toHaveLength(returned === '"a"' ? 1 : 0)
    }
    // a number => a number:  just the body
    expect(project.getFile("/A.spell")!.lastUpdate).toBe("body")
  })
})
