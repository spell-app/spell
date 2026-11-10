/**
 * Spellx's TEMPLATE tags read from a line of text, with no parser (epic `language` P41):
 * for code that finds a template in a file without parsing it, the editor's Inspector and a site's edits.
 * - Its position in the import graph:  the language packs' word tables alone, which are plain data.
 *   So a page that loads no parser may import it by path, `spell/parser/spell/spellxTags`;  the barrel exports it too.
 * - A new language pack adds its words to `PACK_WORDS`.
 */
import { englishWords } from "./languages/en/words"
import { spanishWords } from "./languages/es/words"

/** Every pack's spellx words:  their prefix and their templates' words. */
const PACK_WORDS = [englishWords, spanishWords].flatMap((words) => (words.spellx ? [words.spellx] : []))

/**
 * The template tag `line` opens with, as written:  `page` for `<page "home">`, `spell-view` for `<spell-view "card">`,
 * in any language Spell reads;  `undefined` for a line that opens no template.
 * - Short (epic `language` P41), or with its language's old prefix:  both are a template's tag.
 * - It doesn't know where the line is, so a drawing's `<page>` (Spell UI's) is one too:  ask of top-level lines.
 */
export function spellxTemplateTagOf(line: string): string | undefined {
  const written = /^\s*<(\p{L}[\p{L}\p{N}_-]*)/u.exec(line)?.[1]
  if (!written) return undefined
  const lower = written.toLowerCase()
  for (const { prefix, templates } of PACK_WORDS) {
    const short = lower.startsWith(`${prefix}-`) ? lower.slice(prefix.length + 1) : lower
    if (short in templates) return written
  }
  return undefined
}
