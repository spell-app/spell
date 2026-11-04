import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A property's change as an event (epic `debut` P30, Q47):  `- when its score changes:` is the thing's handler of
 * `score-change`, `onScoreChange()`, in every form, in the outline and in tags, in English and Spanish.
 * - Each case is a game with ONE line (or tag) that differs:  the long form, then the short forms that must compile
 *   the same.
 */

/** The outline every case's line sits in. */
const OUTLINE = [
  "a game is a thing where:",
  '\t- its "score" is a number',
  '\t- its "high score" is a number',
  '\t- its "hint" is text',
  "{line}"
].join("\n")

/** The same in tags. */
const TAGS = [
  '<spell-thing "game">',
  '\t<property "score">a number</>',
  '\t<property "high score">a number</>',
  '\t<property "hint">text</>',
  "{line}",
  "</spell-thing>"
].join("\n")

/** The same in Spanish. */
const SPANISH = [
  "un juego es una cosa donde:",
  '\t- su "puntuación" es un número',
  '\t- su "pista" es texto',
  "{line}"
].join("\n")

describe("a property's change", () => {
  test("in the outline:  `when` or `on`, `its` or `the` or neither, `changes` / `change` / `changed`, a colon or not", () => {
    const long = compile("/test.spell", OUTLINE, '\t- on score change:\n\t\tset its hint to "Best yet!"')
    expect(long).toContain("onScoreChange(event) {")
    for (const form of [
      '\t- when its score changes:\n\t\tset its hint to "Best yet!"',
      '\t- when score changes set its hint to "Best yet!"',
      '\t- on its score change: set its hint to "Best yet!"',
      '\t- when the score changed: set its hint to "Best yet!"',
      '\t- when its score has changed:\n\t\tset its hint to "Best yet!"'
    ]) {
      expect(compile("/test.spell", OUTLINE, form), form).toBe(long)
    }
  })

  test("a property of several words:  its handler by its camelCase name", () => {
    expect(compile("/test.spell", OUTLINE, "\t- when its high score changes: print 1")).toContain(
      "onHighScoreChange(event) {"
    )
  })

  test("in tags:  one line, or its code between, closed by </>, </when> or its words", () => {
    const long = compile("/test.spellml", TAGS, "\t<when its score changes>\n\t\tprint its score\n\t</>")
    expect(long).toContain("onScoreChange(event) {")
    for (const form of [
      "\t<on score change print its score/>",
      "\t<on score change: print its score/>",
      "\t<when score changes>print its score</when>",
      "\t<on its score change>\n\t\tprint its score\n\t</on its score change>"
    ]) {
      expect(compile("/test.spellml", TAGS, form), form).toBe(long)
    }
  })

  test("in Spanish:  `cuando (su) puntuación cambia`, `al cambiar (su) puntuación`", () => {
    const long = compile("/test.es.spell", SPANISH, "\t- al cambiar su puntuación:\n\t\timprimir su puntuación")
    expect(long).toContain("onPuntuaciónChange(event) {")
    for (const form of [
      "\t- cuando su puntuación cambia: imprimir su puntuación",
      "\t- cuando puntuación cambia imprimir su puntuación",
      "\t- al cambiar puntuación: imprimir su puntuación"
    ]) {
      expect(compile("/test.es.spell", SPANISH, form), form).toBe(long)
    }
  })

  test("words that name no property of its type stay the event they always were", () => {
    expect(compile("/test.spell", OUTLINE, "\t- when weather changes: print 1")).toContain("onWeatherChanges(event) {")
  })
})

/** The javascript for `template` with `line` in it, its comments left out;  throws on a parse error. */
function compile(path: string, template: string, line: string): string {
  const { files } = parseSpellProject([{ path, contents: template.replace("{line}", line) }])
  const file = files[0]!
  if (file.errors.length) throw new Error(`parse errors in ${line}:\n${JSON.stringify(file.errors)}`)
  return file.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((each) => each.trim() && !each.trim().startsWith("//"))
    .map((each) => each.replace(/^(\s+)return /, "$1"))
    .join("\n")
}
