import { describe, test, expect } from "vite-plus/test"

import { SpellTagRenamer } from "spell/cli/commands/renameTags"

/** `spell rename tags` (epic `language` P41):  Spell's tags written short, nothing else touched. */
describe("SpellTagRenamer.renameText()", () => {
  const renamer = new SpellTagRenamer()

  test("a template's tag loses its prefix, openers and closers alike", () => {
    const { text, count } = renamer.renameText(
      '<spell-page "home">\n\t<spell-view counter>\n\t</spell-view>\n</spell-page>\n'
    )
    expect(text).toBe('<page "home">\n\t<view counter>\n\t</view>\n</page>\n')
    expect(count).toBe(4)
  })

  test("`<spell-more-of>` is `<extend>`;  every note is `<note>`;  a property editor and stories keep their words", () => {
    expect(renamer.renameText('<spell-more-of "card">\n</spell-more-of>').text).toBe('<extend "card">\n</extend>')
    expect(renamer.renameText("<spell-description>A card.</spell-description>").text).toBe("<note>A card.</note>")
    expect(renamer.renameText("<spell-comment>hi</>").text).toBe("<note>hi</>")
    expect(renamer.renameText('<spell-property-editor "card">').text).toBe('<property-editor "card">')
    expect(renamer.renameText("<spell-stories>").text).toBe("<stories>")
  })

  test("Spanish:  `<encanto-vista>` is `<vista>`, `<encanto-más-de>` `<extender>`, its notes `<nota>`", () => {
    expect(renamer.renameText('<encanto-vista "carta">\n</encanto-vista>').text).toBe('<vista "carta">\n</vista>')
    expect(renamer.renameText('<encanto-más-de "carta">').text).toBe('<extender "carta">')
    expect(renamer.renameText("<encanto-comentario>hola</>").text).toBe("<nota>hola</>")
  })

  test("the web's own elements and the block of code are left:  `<spell-viewer>`, `<spell-code>`, `<spell>`", () => {
    const text = '<spell-viewer src="x"></spell-viewer>\n<spell-code>a</spell-code>\n<spell>\n\tprint 1\n</spell>\n'
    expect(renamer.renameText(text)).toEqual({ text, count: 0 })
  })

  test("prose naming a tag follows:  `<spell-page>` in a sentence is `<page>`", () => {
    expect(renamer.renameText("A page is `<spell-page>`, not `<spell-pages>`.").text).toBe(
      "A page is `<page>`, not `<spell-pages>`."
    )
  })
})
