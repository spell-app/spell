import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A page's JOBS (epic `mockup` P6, Q12):  what it must let people do, as markdown in its outline, compiled to its
 * `static jobs`;  the running page draws nothing for them.
 * - Code spell writes them `<jobs>`;  spellx `<spell-jobs>`, its twin that block;  Spanish `<encanto-tareas>`.
 */
describe("a page's jobs", () => {
  beforeAll(registerTestComponentPack)

  test("code spell:  a `<jobs>` block is the page's `static jobs`, beside its description", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page:',
        "\t<jobs>",
        "\t\t- [ ] see every film",
        "\t\t- [x] As a fan, I want to sort them, so that I can watch them in story order",
        "\t</jobs>",
        "",
        "\t<markdown>",
        "\t\tEvery film.",
        "\t</markdown>"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      'static jobs = "- [ ] see every film\\n- [x] As a fan, I want to sort them, so that I can watch them in story order"'
    )
    expect(code).toContain('static description = "Every film."')
  })

  test("code spell:  `<jobs>` with `<markdown>` on the very next line, no blank line between (T26)", () => {
    const { code, errors } = compiled(
      [
        'a "films page" is a page:',
        "\t<jobs>",
        "\t\t- [ ] see every film",
        "\t</jobs>",
        "\t<markdown>",
        "\t\tEvery film.",
        "\t</markdown>"
      ],
      "/Galaxy.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static jobs = "- [ ] see every film"')
    expect(code).toContain('static description = "Every film."')
  })

  test("spellx:  `<spell-jobs>`, its nested lines kept nested", () => {
    const { code, errors } = compiled(
      [
        '<spell-page "film page">',
        "\t<spell-jobs>",
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
      "static jobs = \"- [ ] see a film's opening crawl\\n- [x] As a fan, I want to see who's in a film, so that I can " +
        'find their other films\\n  - done when:  its people are listed"'
    )
    expect(code).toContain('this.declareProp("film"')
  })

  test("Spanish spellx:  `<encanto-tareas>`", () => {
    const { code, errors } = compiled(
      ['<encanto-página "página de películas">', "\t<encanto-tareas>", "\t\t- [ ] ver las películas", "\t</>", "</>"],
      "/Galaxia.es.spellml"
    )
    expect(errors).toEqual([])
    expect(code).toContain('static jobs = "- [ ] ver las películas"')
  })
})

/** `lines` as the one file of a project at `path`:  its compiled code, less its declarations, and its errors. */
function compiled(lines: string[], path: string) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled.replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
  return { code, errors: file!.errors.map((error) => `${(error as { message?: string }).message ?? error}`) }
}
