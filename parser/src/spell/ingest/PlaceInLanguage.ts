import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test/parseSpellProject"
import { TranslationNames } from "spell/parser/spell/translate/TranslationNames"
import { Translator } from "spell/parser/spell/translate/Translator"

import { IngestStopped } from "./ingest.types"
import { spellTextOf, type SpellLine, type SpellParts, type TypeLines } from "./PlaceSpell"

/** How many times it translates, adding what the last time found missing. */
const MOST_ROUNDS = 4

/** The comments the ingest writes on a line, in each other language. */
const COMMENTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  es: {
    "an address": "una dirección",
    "each an address": "cada una una dirección",
    "a picture's address": "la dirección de una imagen",
    "never read:  its collection wasn't asked for": "nunca se lee:  su colección no se pidió"
  }
}

/**
 * `parts`, the English the ingest wrote, in the language `file` is written in:  `parts` themselves for an English file
 * (epic `data` T72).
 * - It hands the English to the `Translator`, line by line, so each line stays the line it was:
 *   a later look can still tell which to change (`mergedSpell()`).
 * - The names stay as the source has them:  `su "name" es texto` still finds the field the server calls `name`.
 *   A person's own words for one stay through `spell place update`, as any line they wrote.
 *   Spanish's `spell translate` can name a whole program, as it works from a dictionary a person reviews.
 * - throws `IngestStopped` when a line has no words in that language
 */
export function partsInLanguageOf(file: string, parts: SpellParts): SpellParts {
  const to = SP.Language.forFile(file)
  const from = SP.Language.for("en")
  if (to === from) return parts
  const contents = spellTextOf(parts)
  const parsed = parseSpellProject([{ path: "/Place.spell", contents }]).files[0]!
  const names = new TranslationNames({ comments: { ...COMMENTS[to.lang] } }, { from, to })
  const translator = new Translator({ from, to, names })
  let translated = translator.translateFile(parsed)
  for (let round = 0; round < MOST_ROUNDS && translated.missing.size; round++) {
    for (const { kind, words } of [...translated.missing.values()].flat()) {
      names.add(kind, words, kind === "types" ? { name: words } : words)
    }
    translated = translator.translateFile(parsed)
  }
  const stuck = [...translated.todo.values()].flat()
  if (stuck.length) {
    throw new IngestStopped(`it can't write ${file} in ${to.name}:  ${[...new Set(stuck)].join(";  ")}`)
  }
  const lines = translated.lines.filter((line) => line.trim()).map((line) => line.trim())
  let at = 0
  const next = (english: string) => withQuotedAsWritten(lines[at++]!, english)
  const line = ({ key, text }: SpellLine): SpellLine => ({ key, text: next(text) })
  // its first words are the place's name, as written:  `stars`, which the language's plural rules would change
  const header = next(parts.header).replace(
    /^.+? (?=(?:is|es) )/,
    `${parts.header.slice(0, parts.header.indexOf(" is "))} `
  )
  const placeLines = parts.placeLines.map(line)
  const types: TypeLines[] = parts.types.map((type) => ({
    ...type,
    header: next(type.header),
    lines: type.lines.map(line)
  }))
  return { header, placeLines, types }
}

/** `translated`, its quoted words as `english` has them:  a field's name is the server's, `name` not `nombre`. */
function withQuotedAsWritten(translated: string, english: string): string {
  const quoted = english.match(/"[^"]*"/g) ?? []
  let at = 0
  return translated.replace(/"[^"]*"/g, (found) => quoted[at++] ?? found)
}
