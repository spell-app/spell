import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A page's STORIES (epic `mockup` P6, P17):  what it must let people do, `<story>` tags in its outline,
 * compiled to its `static stories`;  the running page draws nothing for them.
 * - Code spell and spellx write them `<stories>`, spellx `<spell-stories>` too;  Spanish `<encanto-historias>`.
 */
describe("a page's stories", () => {
  beforeAll(registerTestComponentPack)

  test("code spell:  a `<stories>` block is the page's `static stories`, beside its description", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page:',
        "\t<stories>",
        '\t\t<story "S1">see every film</story>',
        '\t\t<story "S2" done>As a fan, I want to sort them, so that I can watch them in story order</story>',
        "\t</stories>",
        "",
        "\t<markdown>",
        "\t\tEvery film.",
        "\t</markdown>"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      'static stories = "<story \\"S1\\">see every film</story>\\n<story \\"S2\\" done>As a fan, I want to sort them, so that I can watch them in story order</story>"'
    )
    expect(code).toContain('static description = "Every film."')
  })

  test("code spell:  `<stories>` with `<markdown>` on the very next line, no blank line between (T26)", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page:',
        "\t<stories>",
        '\t\t<story "S1">see every film</story>',
        "\t</stories>",
        "\t<markdown>",
        "\t\tEvery film.",
        "\t</markdown>"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static stories = "<story \\"S1\\">see every film</story>"')
    expect(code).toContain('static description = "Every film."')
  })

  test("spellx:  `<stories>`, a story's words over several lines", () => {
    const { code, errors } = compiled(
      [
        '<spell-page "film page">',
        "\t<stories>",
        '\t\t<story "S1">see a film\'s opening crawl</story>',
        '\t\t<story "S2" done>',
        "\t\t\tAs a fan, I want to see who's in a film",
        "\t\t</story>",
        "\t</stories>",
        '\t<property "film" type="text"/>',
        "</>"
      ],
      "/Galaxy.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('<story \\"S1\\">see a film\'s opening crawl</story>')
    expect(code).toContain('<story \\"S2\\" done>')
    expect(code).toContain('this.declareProp("film"')
  })

  test("spellx:  `<spell-stories>` says the same", () => {
    const { code, errors } = compiled(
      ['<spell-page "film page">', "\t<spell-stories>", '\t\t<story "S1">see it</story>', "\t</>", "</>"],
      "/Galaxy.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static stories = "<story \\"S1\\">see it</story>"')
  })

  test("Spanish spellx:  `<encanto-historias>`", () => {
    const { code, errors } = compiled(
      [
        '<encanto-página "página de películas">',
        "\t<encanto-historias>",
        '\t\t<historia "H1" hecha>ver las películas</historia>',
        "\t</>",
        "</>"
      ],
      "/Galaxia.es.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static stories = "<historia \\"H1\\" hecha>ver las películas</historia>"')
  })

  test("the old markdown list is refused, saying what to write", () => {
    const { errors } = compiled(
      ['a "films page" is a page:', "\t<stories>", "\t\t- [ ] see a film", "\t</stories>"],
      "/G.spell"
    )
    expect(errors).toEqual([expect.stringContaining("A page's stories are tags")])
  })
})

/** `lines` as the one file of a project at `path`:  its compiled code, less its declarations, and its errors. */
function compiled(lines: string[], path: string) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled.replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
  return { code, errors: file!.errors.map((error) => `${(error as { message?: string }).message ?? error}`) }
}
