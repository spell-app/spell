import { beforeAll, describe, test, expect } from "vite-plus/test"

import { SX } from "spell/parser/spellx"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * GROUPS of a template's members, and a property's `alias=` with no body (epic `elemental-spell` P16, Owen 2026-10-25).
 * - `<group "direction" description="..."/>` is a heading:  the members after it, up to the next, are its members,
 *   "the way text sits under a `##` heading";  `group="..."` on a member written away from its group overrides it.
 * - Code spell's twin is the heading alone, `- group "direction"`, its description the comment above it;
 *   a member written away from its group has its group opened above it, and the one it's among again below it.
 * - Groups compile to nothing:  the notebook and the property editor read them from the chunk tree
 *   (`SX.SpellxFile.groupsOf()`).
 */
describe("spellx groups", () => {
  beforeAll(registerTestComponentPack)

  test("a heading in code spell:  the same program, nothing compiled for it", () => {
    const spellx = compiled(CARD, "/Card.spellml")
    expect(spellx.errors).toEqual([])
    const written = SX.CodeSpellWriter.write(CARD, { path: "/Card.spellml" })
    expect(written).toContain(
      '\t// Face up or face down\n\t- group "direction"\n\t- its "direction" is one of up, down\n'
    )
    // `flip` is written among the looks, but is the direction's:  its group opened above it, the looks' again below
    expect(written).toContain('\t- group "direction"\n\t- to flip: set its direction to down\n\t- group "looks"\n')
    const twin = compiled(written, "/Card.spell")
    expect(twin.errors).toEqual([])
    expect(twin.code).toBe(spellx.code)
    expect(spellx.code).not.toMatch(/group/i)
  })

  test("`alias=` on a property with no body:  each one an alias, as its twin's lines under it", () => {
    const { code, errors } = compiled(CARD, "/Card.spellml")
    expect(errors).toEqual([])
    expect(code).toContain("isFaceDirection(direction) {")
    expect(code).toContain("isASuit(suit) {")
    const written = SX.CodeSpellWriter.write(CARD, { path: "/Card.spellml" })
    expect(written).toContain('\t- its "suit" is one of clubs, diamonds, hearts or spades\n\t\t- it "is a (suit)"\n')
  })

  test("each member joins the nearest group above it;  `group=` overrides", () => {
    const [card] = SX.SpellxView.read(CARD, { path: "/Card.spellml" }).templates
    const groups = SX.SpellxFile.groupsOf(card!).map(({ name, group, members }) => ({
      name,
      description: group?.attributes.find((each) => each.name === "description")?.value,
      members: members.map((member) => (member.kind === "declaration" ? member.name : member.kind))
    }))
    expect(groups).toEqual([
      { name: undefined, description: undefined, members: ["size"] },
      { name: "direction", description: "Face up or face down", members: ["direction", "turn it over", "flip"] },
      { name: "looks", description: undefined, members: ["color", "suit"] }
    ])
  })

  test("the converter writes a heading back as its <group>, its comment its description", () => {
    const text = [
      'a "card" is a view where:',
      "\t// Face up or face down",
      '\t- group "direction"',
      '\t- its "direction" is one of up, down',
      ""
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Card.spell", contents: text }]).files
    const spellx = SX.SpellxWriter.write({ text, match: file!.match!, scope: file!.scope })
    expect(spellx).toContain('\t<group "direction" description="Face up or face down" />\n')
    expect(compiled(spellx, "/Card.spellml").code).toBe(compiled(text, "/Card.spell").code)
  })

  test('in Spanish:  `<grupo>`, `grupo=`, and its twin `- grupo "..."`', () => {
    const text = [
      '<encanto-vista "carta">',
      '\t<grupo "dirección"/>',
      '\t<propiedad "dirección" uno-de="arriba, abajo"/>',
      '\t<grupo "aspecto"/>',
      '\t<acción "voltearla" grupo="dirección">poner su dirección a arriba</>',
      "</encanto-vista>"
    ].join("\n")
    const spellx = compiled(text, "/Carta.es.spellml")
    expect(spellx.errors).toEqual([])
    const written = SX.CodeSpellWriter.write(text, { path: "/Carta.es.spellml" })
    expect(written).toContain(
      '\t- grupo "dirección"\n\t- para voltearla: poner su dirección a arriba\n\t- grupo "aspecto"\n'
    )
    const twin = compiled(written, "/Carta.es.spell")
    expect(twin.errors).toEqual([])
    expect(twin.code).toBe(spellx.code)
  })
})

/** A card with groups:  a member before any group, two groups, and a member written away from its group. */
const CARD = [
  '<spell-view "card">',
  '\t<property "size" one-of="small, large"/>',
  '\t<group "direction" description="Face up or face down"/>',
  '\t<property "direction" one-of="up, down" alias="is face (direction)"/>',
  '\t<action "turn it over">',
  "\t\tset its direction to up",
  "\t</action>",
  '\t<group "looks"/>',
  '\t<property "color" one-of="red, black"/>',
  '\t<action "flip" group="direction">set its direction to down</>',
  '\t<property "suit" one-of="clubs, diamonds, hearts or spades" alias="is a (suit)"/>',
  "</spell-view>",
  ""
].join("\n")

/** `text`, one file at `path` of its own project, compiled:  its code without markers or comments, and its errors. */
function compiled(text: string, path: string) {
  const [file] = parseSpellProject([{ path, contents: text }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
