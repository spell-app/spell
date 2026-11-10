import { mkdirSync, mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"

/**
 * The lines naming one of a site's parts (epic `mockup` P6, T13):  what renaming a page in the site editor changes
 * beyond the site's own list, in either of Spell's forms.
 */
describe("SpellLanguageService.sitePartUses()", () => {
  test("finds every `go to`, `show` and `the address of` naming the page, by the words that name it", async () => {
    const contents = [
      'a "films page" is a page:',
      "\t- to see the films:",
      "\t\tgo to the films page",
      'a "film page" is a page:',
      "\t- it has a film as text",
      "\t- to go back:",
      "\t\tshow the films page",
      '\t- its "link" is the address of the films page',

      "galaxy guide is a site:",
      '\t- it has a films page at "/films"',
      '\t- it has a film page at "/films/:film"'
    ].join("\n")
    const project = await projectOf("Galaxy.spell", contents)
    const uses = LSP.SpellLanguageService.sitePartUses(project, "films page")
    expect(uses.map(({ match }) => contents.slice(match.start, match.end))).toEqual([
      "films page",
      "films page",
      "films page"
    ])
    expect(LSP.SpellLanguageService.sitePartUses(project, "film page")).toEqual([])
  })

  test("spellx:  the words' place is in the file as written", async () => {
    const contents = [
      '<spell-page "films page">',
      "\t<on click>",
      "\t\tgo to the planets page",
      "\t</>",
      "</>",
      '<spell-page "planets page"/>',
      '<spell-site "galaxy guide">',
      '\t<page "films page" address="/films"/>',
      '\t<page "planets page" address="/planets"/>',
      "</>"
    ].join("\n")
    const project = await projectOf("Galaxy.spell", contents)
    const uses = LSP.SpellLanguageService.sitePartUses(project, "planets page")
    expect(uses.map(({ match }) => contents.slice(match.start, match.end))).toEqual(["planets page"])
  })
})

/** A temp project of one file, `name` holding `contents`, parsed as the language server parses it. */
async function projectOf(name: string, contents: string): Promise<SP.SpellProject> {
  const folder = resolve(mkdtempSync(resolve(tmpdir(), "spell-lsp-sites-")), "Galaxy")
  mkdirSync(folder)
  writeFileSync(resolve(folder, name), contents)
  writeFileSync(resolve(folder, SP.PROJECT_FILE), `{ imports: [{ path: "/${name}", active: true }] }\n`)
  const uri = pathToFileURL(resolve(folder, name)).href
  const workspace = new SpellDiskWorkspace()
  await workspace.update(uri, contents)
  return workspace.fileFor(uri)!.project
}
