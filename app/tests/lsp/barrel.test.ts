import { describe, test, expect } from "vite-plus/test"

import { $fetch, LoadableFile } from "spell/util"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"

/**
 * `spell/app/lsp` MUST stay browser-safe:  the app's editor loads it.
 * - Node-only `SpellDiskWorkspace` is kept out of the barrel.  Pulling it in would ALSO install disk loading
 *   for every `LoadableFile` and turn off `SpellLocation`'s registry -- which is what these check for.
 */
describe("spell/app/lsp barrel", () => {
  test("exports the portable pieces", () => {
    expect(LSP.SpellLanguageService).toBeTypeOf("function")
    // the server wiring, and so `vscode-languageserver` itself, is the process's alone (epic `solid-2-final` Q35)
    expect("SpellLanguageServer" in LSP).toBe(false)
    expect("SpellDiskWorkspace" in LSP).toBe(false)
  })

  test("doesn't load anything disk-bound", () => {
    expect(LoadableFile.fetch).toBe($fetch)
    expect(SP.SpellLocation.useRegistry).toBe(true)
  })
})
