import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A page's STORIES (epic `mockup` P6, Q12):  what it must let people do, as markdown in its outline, compiled to its
 * `static stories`;  the running page draws nothing for them.
 * - Code spell writes them `<stories>`;  spellx `<spell-stories>`, its twin that block;  Spanish `<encanto-historias>`.
 */
describe("a page's stories", () => {
  beforeAll(registerTestComponentPack)

  test("code spell:  a `<stories>` block is the page's `static stories`, beside its description", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page:',
        "\t<stories>",
        "\t\t- [ ] see every film",
        "\t\t- [x] As a fan, I want to sort them, so that I can watch them in story order",
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
      'static stories = "- [ ] see every film\\n- [x] As a fan, I want to sort them, so that I can watch them in story order"'
    )
    expect(code).toContain('static description = "Every film."')
  })

  test("code spell:  `<stories>` with `<markdown>` on the very next line, no blank line between (T26)", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page:',
        "\t<stories>",
        "\t\t- [ ] see every film",
        "\t</stories>",
        "\t<markdown>",
        "\t\tEvery film.",
        "\t</markdown>"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static stories = "- [ ] see every film"')
    expect(code).toContain('static description = "Every film."')
  })

  test("spellx:  `<spell-stories>`, its nested lines kept nested", () => {
    const { code, errors } = compiled(
      [
        '<spell-page "film page">',
        "\t<spell-stories>",
        "\t\t- [ ] see a film's opening crawl",
        "\t\t- [x] As a fan, I want to see who's in a film, so that I can find their other films",
        "\t\t\t- done when:  its people are listed",
        "\t</>",
        '\t<property "film" type="text"/>',
        "</>"
      ],
      "/Galaxy.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      "static stories = \"- [ ] see a film's opening crawl\\n- [x] As a fan, I want to see who's in a film, so that I can " +
        'find their other films\\n  - done when:  its people are listed"'
    )
    expect(code).toContain('this.declareProp("film"')
  })

  test("Spanish spellx:  `<encanto-historias>`", () => {
    const { code, errors } = compiled(
      ['<encanto-página "página de películas">', "\t<encanto-historias>", "\t\t- [ ] ver las películas", "\t</>", "</>"],
      "/Galaxia.es.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static stories = "- [ ] ver las películas"')
  })
})

/** `lines` as the one file of a project at `path`:  its compiled code, less its declarations, and its errors. */
function compiled(lines: string[], path: string) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled.replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
  return { code, errors: file!.errors.map((error) => `${(error as { message?: string }).message ?? error}`) }
}
