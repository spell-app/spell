import type { E } from "spell/ui/core"
// Import directly:  `SpellUISettings` (below `core`) hands it to spell-element, so this file never imports the `core`
// entry (ui's AGENTS.md, "Imports")
import { ValueSets } from "spell/ui/vocabulary"
import { OPTIONAL_SHEETS, type OptionalSheetName } from "spell/ui/runtime/runtime.types"
// Import directly:  the `spell/ui/styles` barrel carries every sheet's text, which belongs in the runtime's chunk
import { SHEET_WORDS } from "spell/ui/styles/sheetWords"
import { ROOT_SHEETS } from "spell/ui/components/ui-root/UIRoot.sheets"

/****************
 * ### `RootSheets`
 * Which of the optional foundation sheets (`OPTIONAL_SHEETS`) a family's shadow roots take (epic `solid-2-final` P4).
 * - Every root takes the small base (layers, reset), the themes and its own sheets;
 *   these four only where its family uses them:
 *   - what its own shadow markup uses, scanned from its code (`UIRoot.sheets.ts`, `yarn gen:root`)
 *   - the colour remaps when its vocabulary can put a colour word on a box (`color="red"` => `ui red label`),
 *     the size remaps likewise:  the words are the generator's (`SHEET_WORDS`), so a new colour reaches every family
 *     that offers it
 *   - the animations also come the first time `UI.transitions` animates a box inside the root (`Styles.addInto()`)
 * - A tag the scan never saw (a component pack's) takes the utilities and the animations too:  it may use them.
 * - Worked out once per vocabulary, the first time an element of it adopts its sheets;  so a translated tag, which
 *   shares its vocabulary, shares the answer.
 * - Static:  a lookup, cached per vocabulary.
 ****************/
export class RootSheets {
  /** The optional sheets the roots of `vocabulary`'s tag take. */
  static for(vocabulary: E.ComponentVocabulary): readonly OptionalSheetName[] {
    let sheets = RootSheets.cache.get(vocabulary)
    if (!sheets) RootSheets.cache.set(vocabulary, (sheets = RootSheets.workOut(vocabulary)))
    return sheets
  }

  /** What `for()` returns, before it's cached. */
  private static workOut(vocabulary: E.ComponentVocabulary): readonly OptionalSheetName[] {
    const sheets = new Set<OptionalSheetName>(ROOT_SHEETS[vocabulary.tag] ?? UNSCANNED)
    const words = RootSheets.wordsOf(vocabulary)
    for (const axis of AXES) {
      if (SHEET_WORDS[axis].some((word) => words.has(word))) sheets.add(OPTIONAL_SHEETS[axis])
    }
    return [...sheets]
  }

  /**
   * Every class word `vocabulary` can put on a box:  each attribute's name and key, its values, and the words its
   * `classes` maps them to.
   * - Generous on purpose:  a word too many costs one shared sheet, a word too few a family's look.
   */
  private static wordsOf(vocabulary: E.ComponentVocabulary): Set<string> {
    const words = new Set<string>()
    const add = (text: string) => {
      for (const word of text.split(" ")) words.add(word)
    }
    for (const spec of vocabulary.attributes) {
      add(spec.name)
      if (spec.key) add(spec.key)
      const set = ValueSets.setFor(spec)
      for (const value of typeof set === "string" ? ValueSets.get(set) : (set ?? [])) add(String(value))
      for (const word of Object.values(spec.classes ?? {})) add(word)
    }
    return words
  }

  /** vocabulary => its roots' optional sheets */
  private static readonly cache = new WeakMap<E.ComponentVocabulary, readonly OptionalSheetName[]>()
}

/** The axes whose remaps a vocabulary's words switch on. */
const AXES = ["colors", "sizes"] as const

/** What a tag the scan never saw takes, besides what its vocabulary asks for. */
const UNSCANNED: readonly OptionalSheetName[] = [OPTIONAL_SHEETS.utilities, OPTIONAL_SHEETS.animations]
