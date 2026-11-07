import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { BUILT_IN_DIMENSIONS } from "spell/util/measures/dimensions.generated"
import { PROPORTION } from "spell/util/measures/Dimension"

export { PROPORTION }

/**
 * DIMENSIONS, kinds of measure, as the compiler knows them (epic `language` P23):
 * a dimension is a type whose record holds its units (`P.TypeScope.units`), e.g. `Length`'s meter, inch, foot.
 * - Spell's built-in six (length, weight, temperature, volume, speed, proportion) are written in spell, in the core's
 *   `dimensions/dimensions.spell` and its Spanish twin, compiled ONCE by `yarn core:gen:templates` into the kit's
 *   `spell/util/measures/dimensions.generated.ts`:  every language's words for each, which each root loads
 *   (`loadBuiltInDimensions()`), and the runtimes convert by.
 * - A program declares its own the same way, `data size is a dimension:` (spell's `define_dimension`).
 * - A property says what it measures, `its "height" is a length in cm` (`P.ScopeVariable.measure`);
 *   `its height in feet` converts it, `172 cm` is a written one (spell's `measure_in`, `measure_literal`).
 */

/**
 * The FIRST word or mark of every unit name any dimension the compiler has met declares, and of each one's plural, lower
 * case:  `cm`, `feet`, `°` (of `°C`), `fl` (of `fl oz`) -- the quick test of `unit_words` and `measure_literal`.
 * - Only grows:  a quick test may say yes to a word no dimension in scope has, never no to one that does.
 */
export const UNIT_FIRST_WORDS = new Set<string>()

/** Note `unit`'s names in `UNIT_FIRST_WORDS`. */
export function noteUnitNames(unit: P.DimensionUnit): void {
  for (const name of unit.names) {
    for (const said of [name, P.pluralize(name), `${name}s`, `${name}es`]) {
      const first = FIRST_WORD.exec(said.toLowerCase())?.[0]
      if (first) UNIT_FIRST_WORDS.add(first)
    }
  }
}

/** A name's first word, or its first mark:  `fl` of `fl oz`, `°` of `°C`, `m` of `m/s`. */
const FIRST_WORD = /^[\p{L}\p{M}\d_-]+|^\S/u

/**
 * Load spell's built-in dimensions into root `scope`, in each of `languages`' words:  each one's type, and its units
 * by every name those languages give them.
 * - A language the table doesn't have reads English's.
 * - SIDE EFFECT:  adds a type per dimension to `scope` -- `SP.Language.rootScope` calls it as it builds, once.
 */
export function loadBuiltInDimensions(scope: P.RootScope, languages: readonly SP.Language[]): void {
  const langs = languages.map((language) => language.lang)
  for (const { name, words, units } of BUILT_IN_DIMENSIONS) {
    // its word in the first of the languages that isn't the name's, `longitud`, as its short name
    const word = langs.map((lang) => words[lang]).find((it) => it && P.classCase(it) !== name)
    const [type] = scope.types!.add({ name, superType: "Dimension", aka: word && P.classCase(word) })
    // each unit by every name those languages give it;  English's for a language the table doesn't have
    type!.units = units.map(({ id, names, factor, offset }) => ({
      id,
      names: [...new Set(langs.flatMap((lang) => names[lang] ?? names.en ?? []))],
      factor,
      ...(offset ? { offset } : {})
    }))
    type!.units.forEach(noteUnitNames)
  }
}

/**
 * What a measure of `dimension` in `unit` is KEPT as:  that unit, except a percent's, kept as its fraction
 * (`PROPORTION`'s base unit;  epic `language` P34), so a sum with it works:  `18%` is `0.18`.
 */
export function measureKeptIn(dimension: P.TypeScope, unit: P.DimensionUnit): P.Measure {
  const kept = dimension.name === PROPORTION ? dimension.units![0]! : unit
  return { dimension: dimension.name, unit: kept.id }
}

/** Every dimension `scope` knows, nearest first:  its own, its project's, then the root's built-in ones. */
export function dimensionsIn(scope: P.Scope): P.TypeScope[] {
  const found: P.TypeScope[] = []
  for (let types = scope.types; types; types = types.parent) {
    for (const type of types.get()) if (type.units?.length) found.push(type)
  }
  return found
}

/**
 * The unit `tokens` start with at `start`, the LONGEST name of any of `dimensions`' units, and how many tokens it takes
 * -- `undefined` if they start with none.
 * - A name is its words and marks as written:  `°C`, `m/s`, `fl oz`, `"`;  a plural reads too, `feet`, `inches`.
 * - Tokens touching each other read as one name (`°` `C`), tokens with a space between as words (`fl` `oz`).
 */
export function unitAt(
  dimensions: readonly P.TypeScope[],
  tokens: readonly P.Token[],
  start = 0
): { dimension: P.TypeScope; unit: P.DimensionUnit; length: number } | undefined {
  let said = ""
  let best: ReturnType<typeof unitAt>
  for (let length = 1; length <= MOST_TOKENS && start + length <= tokens.length; length++) {
    const token = tokens[start + length - 1]!
    if (token instanceof P.NumberToken || token instanceof P.TextToken) break
    if (`${token.value}` === "," || `${token.value}` === ":") break
    const previous = tokens[start + length - 2]
    said += (length > 1 && previous && previous.end < token.start ? " " : "") + `${token.value}`
    for (const dimension of dimensions) {
      const unit = unitNamed(dimension, said)
      if (unit) best = { dimension, unit, length }
    }
  }
  return best
}

/** The most tokens a unit's name takes:  `fluid ounce`, `m / s`, `km / h`. */
const MOST_TOKENS = 4

/** `dimension`'s unit written `said`:  a name, an `aka`, or a name's plural, `feet` -- see `P.TypeScope.unitNamed()`. */
export function unitNamed(dimension: P.TypeScope, said: string): P.DimensionUnit | undefined {
  return (
    dimension.unitNamed(said) ??
    dimension.units?.find((unit) =>
      unit.names.some((name) => name.length > 2 && P.pluralize(name) === said.toLowerCase())
    )
  )
}

/**
 * What `match` measures, if it's a measure:  a property read whose property says (`its height`, `the height of the
 * character`), or a written one (`172 cm`) -- `undefined` for anything else.
 * - Reads only `match.data`, as noted while parsing.
 */
export function measureOf(match: P.Match | undefined): P.Measure | undefined {
  const data = match?.data as { member?: unknown; measure?: P.Measure } | undefined
  if (data?.measure) return data.measure
  return data?.member instanceof P.ScopeVariable ? data.member.measure : undefined
}

/**
 * `ast`, `match`'s, written in the reader's units if `match` is a measure:  `core.measureShown(this.height, "Length",
 * "centimeter")`, `5 ft 8 in` to a US reader (epic `language` P24, Q27) -- else `ast` as it is.
 * - Where a measure is SHOWN:  printed, put in text (`[its height]`), drawn (`{its height}`).
 */
export function shownMeasureAST(match: P.Match | undefined, ast: P.ASTExpression): P.ASTExpression {
  const measure = measureOf(match)
  if (!match || !measure) return ast
  const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })
  return new P.ASTCoreMethodInvocation(match, {
    methodName: "measureShown",
    args: [ast, text(measure.dimension), text(measure.unit)]
  })
}
