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
 * beyond the site's own list.
 */
describe("SpellLanguageService.sitePartUses()", () => {
  test("finds every `go to`, `show` and `the address of` naming the page, by the words that name it", async () => {
    const contents = [
      "films page is a page:",
      "\tto see the films:",
      "\t\tgo to the films page",
      "film page is a page:",
      "\tit has a film as text",
      "\tto go back:",
      "\t\tshow the films page",
      '\tits "link" is the address of the films page',
      "galaxy guide is a site:",
      '\tit has a films page at "/films"',
      '\tit has a film page at "/films/:film"'
    ].join("\n")
    const project = await projectOf("Galaxy.spell", contents)
    const uses = LSP.SpellLanguageService.sitePartUses(project, "films page")
    expect(uses.map(({ match }) => contents.slice(match.start, match.end))).toEqual([
      "films page",
      "films page",
      "films page"
    ])
    expect(LSP.SpellLanguageService.sitePartUses(project, "film page")).toEqual([])
    // the language worker's answer (`spell/sitePartUses`):  where the name itself is, by path
    const spans = LSP.SpellLanguageService.sitePartSpans(project, "films page")
    expect(spans.map(({ start, end }) => contents.slice(start, end))).toEqual([
      "films page",
      "films page",
      "films page"
    ])
    expect(new Set(spans.map(({ path }) => path))).toEqual(new Set([project.spellFiles[0]!.path]))
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
