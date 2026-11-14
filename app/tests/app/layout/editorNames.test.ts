import { afterAll, describe, expect, test, vi } from "vite-plus/test"
import { spawnSync } from "child_process"
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"

import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { EDITOR_NAMES, editorHostNames, missingEditorNames } from "spell/app/app/layout/editorNames"
import { APP_TEXTS } from "spell/app/app/ui/AppTexts.en"
import { editor } from "spell/app/app/editor"
import { editorNamesMissing } from "spell/app/app/layout/layoutSpell"

/**
 * The names the editor fills in its own Spell, `SpellEditor.spell` (epic `editor` I123):
 * renamed in a copy of the Spell's text, it's an error as it's edited, and missing as it loads.
 * - Each test works on a temp copy of the project:  the real file is Owen's, edited live, and never written.
 */
// each compiles the Spell with `spell compile`, a few seconds each
describe("the editor's names in its own Spell (epic `editor` I123)", { timeout: 60_000 }, () => {
  const folders: string[] = []
  afterAll(() => folders.forEach((folder) => rmSync(folder, { recursive: true, force: true })))

  /** A temp copy of the editor's Spell, `change` made to its text:  its folder and file. */
  function copyOfTheSpell(change: (text: string) => string = (text) => text) {
    const folder = mkdtempSync(resolve(tmpdir(), "spell-editor-names-"))
    folders.push(folder)
    const project = resolve(folder, "spell-editor")
    cpSync(SPELL_EDITOR_FOLDER, project, { recursive: true })
    const path = resolve(project, "SpellEditor.spell")
    writeFileSync(path, change(readFileSync(path, "utf8")))
    return { project, path }
  }

  /** The language service's errors about the editor's names, in `path`'s file, as the editor hands them over. */
  async function hostErrors(path: string) {
    const uri = pathToFileURL(path).href
    const workspace = new SpellDiskWorkspace()
    const service = new LSP.SpellLanguageService(workspace)
    await workspace.update(uri, readFileSync(path, "utf8"))
    const file = workspace.fileFor(uri)!
    const names = editorHostNames((name) => APP_TEXTS.editorNameNeeded.replace("{name}", name))
    // the temp copy's project, not `@spell/editor/spell-editor`
    service.hostNames = [{ ...names, project: file.project.path }]
    return service.diagnostics(file).filter((diagnostic) => diagnostic.source === LSP.HOST_NAMES_SOURCE)
  }

  /** `project` compiled (`spell compile`), and run on a stand-in for the runtime:  what it exports. */
  async function compiledExports(project: string): Promise<Record<string, unknown>> {
    const { status, stdout, stderr } = spawnSync(process.execPath, [SPELL_BIN, "compile", project, "--stdout"], {
      encoding: "utf8"
    })
    if (status !== 0) throw new Error(`spell compile failed:\n${stderr}`)
    const folder = resolve(project, "..")
    writeFileSync(resolve(folder, "core.mjs"), STAND_IN_CORE)
    writeFileSync(resolve(folder, "compiled.mjs"), stdout.replace(`"@spell/core"`, `"./core.mjs"`))
    return (await import(/* @vite-ignore */ pathToFileURL(resolve(folder, "compiled.mjs")).href)) as Record<
      string,
      unknown
    >
  }

  test("the Spell as it is:  no errors, nothing missing", async () => {
    const { project, path } = copyOfTheSpell()
    expect(await hostErrors(path)).toEqual([])
    expect(missingEditorNames(await compiledExports(project))).toEqual([])
  })

  test("`code is showing` renamed, everywhere it is written:  an error under `spell editor`, saying so in short lines;  missing as it loads", async () => {
    const { project, path } = copyOfTheSpell((text) => text.replace(/(?<!compiled )code is showing/g, "code showing"))
    const errors = await hostErrors(path)
    expect(errors.map(({ message }) => message)).toEqual([
      "The editor fills `code is showing` itself.\n" +
        "Renaming it stops the editor from working.\n" +
        "Keep this name, or ask Claude to rename it in the editor's code too."
    ])
    // under the app's name, `spell editor is an app`
    const lines = readFileSync(path, "utf8").split("\n")
    expect(lines[errors[0]!.range.start.line]).toBe("spell editor is an app")
    expect(missingEditorNames(await compiledExports(project))).toEqual([
      { type: "spell editor", member: "code is showing" }
    ])
  })

  test("...and the load says so in ONE notice, a line per name", async () => {
    const { project } = copyOfTheSpell((text) => text.replace(/(?<!compiled )code is showing/g, "code showing"))
    const shown = vi.spyOn(editor, "showError").mockImplementation(() => {})
    try {
      editorNamesMissing(missingEditorNames(await compiledExports(project)))
      await Promise.resolve()
      expect(shown).toHaveBeenCalledTimes(1)
      expect(shown.mock.calls[0]![0]).toBe(
        "The editor's Spell is missing names the editor fills itself:\n" +
          "`code is showing`, of `spell editor`\n" +
          "What needs them won't show or work.\n" +
          "Put them back in SpellEditor.spell, or ask Claude to rename them in the editor's code too."
      )
      // nothing missing:  no notice
      editorNamesMissing([])
      await Promise.resolve()
      expect(shown).toHaveBeenCalledTimes(1)
    } finally {
      shown.mockRestore()
    }
  })

  test("an action and a whole type renamed:  each named once", async () => {
    const { project, path } = copyOfTheSpell((text) =>
      text.replaceAll(`"save"`, `"save all"`).replaceAll("about box", "info box")
    )
    const messages = (await hostErrors(path)).map(({ message }) => (message as string).split("\n")[0])
    expect(messages).toEqual(
      expect.arrayContaining(["The editor fills `about box` itself.", "The editor fills `save` itself."])
    )
    expect(missingEditorNames(await compiledExports(project))).toEqual(
      expect.arrayContaining([
        { type: "spell editor", member: "about box" },
        { type: "spell editor", member: "save" },
        { type: "about box" }
      ])
    )
  })

  test("every type and member says what it's for", () => {
    for (const type of Object.values(EDITOR_NAMES)) {
      expect(type.for).toMatch(/\S/)
      for (const member of Object.values(type.members)) expect(member.for, member.words).toMatch(/\S/)
    }
  })
})

/** The editor's own Spell's project. */
const SPELL_EDITOR_FOLDER = resolve(import.meta.dirname, "../../../spaces/@spell/editor/spell-editor")

/** The kit's `spell` command. */
const SPELL_BIN = resolve(import.meta.dirname, "../../../../bin/spell.mjs")

/**
 * A stand-in for the runtime the compiled Spell imports (`@spell/core`):  enough for its classes to be made.
 * - `core`'s every member a function that does nothing, so `core.isCarryingOver` is truthy:  the app doesn't start.
 */
const STAND_IN_CORE = `
const nothing = () => undefined
export const core = new Proxy({}, { get: () => nothing })
export class Thing { static declareProp() {} getProp() {} setProp() {} }
export class View extends Thing {}
export class App extends View {}
export class Site extends App {}
export class ViewableList extends Thing {}
export const h = nothing
export const css = nothing
`
