import { describe, test, expect, beforeAll, afterEach, vi } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { installDiskFetch } from "spell/app/spaces/server/node/projects/disk-fetch"
import { fixtureProjectId } from "spell/app/spaces/test"

/**
 * `SpellProject` as an editor drives it:  which files it parses, and `updateText()` on each edit.
 * - Loads the Solitaire example from disk, but never saves:  edits stay in memory, and each test puts its
 *   text back.
 * - spaces' since epic `repo-split` C11 (spell-parser's `tests/spell/` before):  it loads projects through spaces'
 *   disk reader, which spell-parser's tests never import.
 */
describe("SpellProject editing", () => {
  const solitaire = fixtureProjectId("@spell/examples/Solitaire")
  const project = new SP.SpellProject(solitaire)
  const game = new SP.SpellFile(`${solitaire}/Solitaire.spell`)
  let gameText: string

  beforeAll(async () => {
    installDiskFetch()
    await project.parse()
    gameText = game.contents!
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await project.updateText(game, gameText)
  })

  test("`spellFiles` are its active spell imports (`.spell` or `.spellml`), in order -- and each `isActive`", () => {
    // its cards, deck and piles, then its game
    expect(project.spellFiles.map((file) => file.filePath)).toEqual([
      "/Card.spell",
      "/Deck.spell",
      "/Pile.spell",
      "/Solitaire.spell"
    ])
    expect(project.spellFiles.every((file) => file.isActive)).toBe(true)
    expect(new SP.SpellFile(`${solitaire}/NotImported.spell`).isActive).toBe(false)
  })

  // epic `language` P40:  a file's shape is what it says, so deleting its last tag, or typing its first, flips it
  test("a file that changes shape as it's edited is parsed whole, in its new shape, and back", async () => {
    const parserOf = () => (game.scope?.parser as SP.SpellParser | undefined)?.form ?? "spell"
    const codeOf = () => P.JSWriter.instance.writeMatch(game.match!) as string
    const before = codeOf()
    expect(game.form).toBe("spellx")
    expect(parserOf(), "at first").toBe("spellx")
    await project.updateText(game, 'a "marker" is a thing:\n\t- its "count" is a number\n')
    expect(game.form).toBe("spell")
    expect(parserOf(), "plain").toBe("spell")
    expect(codeOf()).toContain("class Marker")
    await project.updateText(game, gameText)
    expect(game.form).toBe("spellx")
    expect(parserOf(), "back").toBe("spellx")
    expect(codeOf()).toBe(before)
  })

  test("`updateText()` takes the text, and returns the files whose parse changed", async () => {
    const before = game.match
    const changed = await project.updateText(game, `${gameText}\nprint 1`)
    expect(game.contents).toBe(`${gameText}\nprint 1`)
    expect(game.match).not.toBe(before)
    expect(changed).toContain(game)
    expect(await project.updateText(game, game.contents!)).toEqual([])
  })

  test("a file it doesn't parse just takes the text", async () => {
    const other = new SP.SpellFile(`${solitaire}/NotImported.spell`)
    expect(await project.updateText(other, "print 1")).toEqual([other])
    expect(other.contents).toBe("print 1")
    expect(other.match).toBeUndefined()
  })

  test("parses from scratch straight away if the incremental parse can't cope", async () => {
    project.incremental = undefined
    await project.updateText(game, `${gameText}\nprint 1`)
    expect(project.incremental).toBeDefined()
    for (const file of project.spellFiles) expect(file.match, file.path).toBeDefined()
  })

  test("a crash is left in `parseError`, NOT thrown -- and cleared by the next good parse", async () => {
    vi.spyOn(project, "parseImports").mockImplementationOnce(() => {
      throw new Error("boom")
    })
    project.incremental = undefined
    await expect(project.updateText(game, `${gameText}\nprint 1`)).resolves.toBeDefined()
    expect(project.parseError).toBe("boom")

    await project.updateText(game, `${gameText}\nprint 2`)
    expect(project.parseError).toBeUndefined()
  })
})
