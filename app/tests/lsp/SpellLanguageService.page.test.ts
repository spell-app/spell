import { describe, test, expect, beforeAll } from "vite-plus/test"
import { mkdirSync, mkdtempSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { SemanticTokens } from "vscode-languageserver"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"

/**
 * The language service over a PAGE FILE (epic `language` P47):  `"films" is a notebook page`, its body drawn.
 * - Its colours come from the match tree and the page's own tokens:  its head's words, its tags' words and closers,
 *   its prose a comment.
 * - A tag line reads as its code-spell twin, whose own words are SYNTHETIC tokens at the tag's start (C24):
 *   nothing may colour them, or hover on them, as if they were typed there.
 */
describe("SpellLanguageService, a page file", () => {
  const TEXT = [
    'a "card" is a view:',
    "\tto draw it: <text>A card</text>",
    "",
    '"films" is a notebook page',
    "\t# Films",
    "\tEvery film, in order.",
    "",
    "\t<if 1 is 1>",
    "\t\t<card/>",
    "\t</if>",
    ""
  ].join("\n")
  const page = filed("Films", "Films.spell", TEXT)
  let file: SP.SpellFile

  beforeAll(async () => {
    file = await page.load()
  })

  test("it parses as a page file, with no errors", () => {
    expect(file.form).toBe("page")
    expect(page.service.diagnostics(file).map((it) => it.message)).toEqual([])
  })

  test("its head's words, its tags' words and closers, and its prose are coloured as written", () => {
    const tokens = describeTokens(page.service, file)
    expect(tokens).toContain(`4:7 " is a notebook page" keyword`)
    expect(tokens).toContain(`8:1 "<if" keyword`)
    expect(tokens).toContain(`10:1 "</if>" keyword`)
    expect(tokens.some((token) => token.startsWith(`6:1 "Every film, in order." comment`))).toBe(true)
    // the twin's `if` stands at its tag with no text of its own:  never coloured there
    expect(tokens.filter((token) => token.startsWith(`8:1 "<i"`))).toEqual([])
  })
})

/** A Spanish page's words typed without their accents (epic `elemental-spell` Q49). */
describe("SpellLanguageService, a Spanish page file", () => {
  const TEXT = [
    '"películas" es una página',
    "\t# Películas",
    '\t<para película en ["a", "b"] titulo="Todas">',
    "\t\t<texto>{película}</texto>",
    "\t\t<vacio>",
    "\t\t\t<texto>Nada</texto>",
    "\t\t</vacio>",
    "\t</para>",
    ""
  ].join("\n")
  const page = filed("Peliculas", "Peliculas.es.spell", TEXT)
  let file: SP.SpellFile

  beforeAll(async () => {
    file = await page.load()
  })

  test("a tag's word and an attribute's name typed without accents get them back", () => {
    const fixed = page.service.accentEdits(file).map((edit) => edit.newText)
    expect(fixed).toContain("vacío")
    expect(fixed).toContain("título")
    expect(fixed.filter((word) => word === "vacío")).toHaveLength(2)
    // never a twin's own word, standing at a tag
    expect(fixed.every((word) => /[áéíóú]/.test(word))).toBe(true)
  })
})

/** `text` as `name` in a temp project `project` of its own, with its language service. */
function filed(project: string, name: string, text: string) {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-page-"))
  const folder = resolve(dir, project)
  mkdirSync(folder)
  writeFileSync(resolve(folder, name), text)
  writeFileSync(resolve(folder, SP.PROJECT_FILE), `{ imports: [{ path: "/${name}", active: true }] }\n`)
  const uri = pathToFileURL(resolve(folder, name)).href
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)
  return {
    service,
    async load(): Promise<SP.SpellFile> {
      await workspace.update(uri, text)
      return workspace.fileFor(uri)!
    }
  }
}

/** `file`'s semantic tokens, one a line:  `line:column "text" type modifiers`. */
function describeTokens(service: LSP.SpellLanguageService, file: SP.SpellFile): string[] {
  const { tokenTypes, tokenModifiers } = LSP.SpellLanguageService.TOKEN_LEGEND
  const { data } = service.semanticTokens(file) as SemanticTokens
  const text = file.parseText.split("\n")
  const tokens: string[] = []
  let line = 0
  let character = 0
  for (let index = 0; index < data.length; index += 5) {
    const [deltaLine, deltaChar, length, type, modifierBits] = data.slice(index, index + 5) as number[]
    line += deltaLine!
    character = deltaLine ? deltaChar! : character + deltaChar!
    const modifiers = tokenModifiers.filter((_, bit) => modifierBits! & (1 << bit))
    const word = JSON.stringify(text[line]!.slice(character, character + length!))
    tokens.push([`${line + 1}:${character} ${word} ${tokenTypes[type!]}`, ...modifiers].join(" "))
  }
  return tokens
}
