import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A page's STORIES (epic `mockup` P6, P17):  what it must let people do, `<story>` tags in its outline,
 * compiled to its `static stories`;  the running page draws nothing for them.
 * - Plain Spell writes them `<stories>`;  Spanish `<historias>`.
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
