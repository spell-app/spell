/**
 * Types and constants for `spell coherence score` (`spell/cli/coherence`):  the catalog's searches, what a run
 * counts, and the snapshot it saves (epic `coherence` P15).
 * - Runtime-light:  no imports at all, so every file of the folder takes it first.
 */

////////////////
// ## The catalog's searches
////////////////

/**
 * One search the score runs:  a catalog entry's **Score:** line, or a word list entry's.
 * - `name`:  the entry's title:  `Watching files`, `open / close`
 * - `pattern`:  what a copy looks like, as git's Perl regex (`git grep -P`), one line at a time
 * - `within`:  only these paths, from the checkout's root (`ui/src`);  none:  every repo's code
 * - `homes`:  the mechanism's own files (`src/server/Git.ts`):  never a copy;  what its users use
 * - `not`:  paths left out:  the line's own, its entry's "Fine:" lines', the catalog's "Fine as it is"
 */
export type ScoreSearch = {
  name: string
  pattern: string
  within: string[]
  homes: string[]
  not: string[]
}

/**
 * What the catalog and the word list give the score.
 * - `mechanisms`:  each catalog entry with a **Score:** line
 * - `words`:  each word list entry with one
 */
export type ScoreSearches = {
  mechanisms: ScoreSearch[]
  words: ScoreSearch[]
}

/** The catalog and the word list, from the kit's root. */
export const CATALOG_FILE = "agents/coherence/catalog.md"

/** The word list, from the kit's root. */
export const WORDS_FILE = "agents/coherence/words.md"

////////////////
// ## What a run counts
////////////////

/**
 * One mechanism, scored.
 * - `copies`:  the lines its search finds outside its homes and what's left out
 * - `users`:  the files that use its homes, outside them
 * - `score`:  `users / (users + copies)`, 0-100, rounded;  100 when it has neither
 * - `files`:  each file with copies, and how many:  what `--compare` names a new copy by
 */
export type MechanismScore = {
  name: string
  copies: number
  users: number
  score: number
  files: Record<string, number>
}

/**
 * One word list entry:  how often its replaced words are still in the code.
 * - `count`:  the lines its search finds
 */
export type WordCount = {
  name: string
  count: number
}

/**
 * Where users were counted from.
 * - `map`:  the code map's links into each home (`spell map build`)
 * - `search`:  files naming what each home exports:  no map, or an older commit (`--at`)
 */
export type UsersFrom = "map" | "search"

/**
 * One run of the score, as `--save` writes it and `--compare` reads it.
 * - `at`:  the code it counted
 *   - `time`:  the newest of its commits, local with its offset (`localTime()`)
 *   - `commits`:  each repo's commit, by the repo's name;  the kit's:  `spell`
 *   - `dirty`:  the working tree had changes to code:  not exactly any commit
 * - `measuredAt`:  when the run was, local
 * - `usersFrom`:  `map` or `search`
 * - `score`:  the code's, 0-100:  every mechanism's users over its users and copies, summed
 * - `copies`, `users`:  their sums
 * - `mechanisms`, `words`:  in the catalog's order
 * - `tests`:  each repo's tests (`it()`, `test()`), by the repo's name:  counted, never scored
 */
export type ScoreSnapshot = {
  at: { time: string; commits: Record<string, string>; dirty?: boolean }
  measuredAt: string
  usersFrom: UsersFrom
  score: number
  copies: number
  users: number
  mechanisms: MechanismScore[]
  words: WordCount[]
  tests: Record<string, number>
}

////////////////
// ## Which code counts
////////////////

/** The files the score reads:  code, never data, docs or pictures. */
export const CODE_FILE = /\.(ts|tsx|js|mjs|cjs|css)$/

/**
 * Code a person never wrote:  bundles, packs, generated data, vendored libraries.
 * - A bundle beside its entry (`spell-ui.js` beside `spell-ui.entry.js`) is found by `isBundle()` too.
 */
export const GENERATED_FILE = /(^|\/)(__pack|__data|lazy|emoji\/(cldr|fomantic)|ui-emoji\/data)\/|\.min\.js$|\.d\.ts$/

/** Tests (unit, visual, end to end) and their helpers:  never part of the score (Owen, 2026-10-25:  "I'm worried about actual code"). */
export const TEST_FILE = /(^|\/)(tests?|test-helpers|__snapshots__|__tests__)\/|\.(test|spec|visual|e2e)\.[cm]?[jt]sx?$/

/** A test, as the count finds one:  `it(`, `test(`, `it.each(...)(`, `test.skip(` ... at a line's start. */
export const TEST_CALL = "^\\s*(it|test)(\\.\\w+)*\\("

////////////////
// ## Snapshots
////////////////

/** The snapshots' folder, in the shared content folder (epic `coherence` Q11):  committed by the turn's hook. */
export const SCORES_FOLDER = "epics/coherence/details/scores"

/** `--compare last`:  the newest snapshot. */
export const LAST_SNAPSHOT = "last"

/**
 * One row of a compare:  a number then and now.
 * - `name`:  what it counts:  a mechanism's, a word's, a repo's
 * - `before`, `after`:  then, now;  `undefined`:  not counted then (new), or not now (gone)
 * - `improvement`:  how much better, in percent of `before`, rounded:  negative is worse;  `undefined` when there's
 *   nothing to compare (`before` 0, or missing)
 * - `newCopies`:  a mechanism's files with more copies now, and how many more
 */
export type CompareRow = {
  name: string
  before?: number
  after?: number
  improvement?: number
  newCopies?: Record<string, number>
}

/**
 * Two snapshots, compared.
 * - `copies`, `score`, `users`:  the totals' rows
 * - `mechanisms`:  each mechanism's copies
 * - `words`, `tests`:  each word's count, each repo's tests
 * - `sameUsers`:  both counted users the same way;  else the score's change is partly the counting's
 */
export type ScoreComparison = {
  before: ScoreSnapshot
  after: ScoreSnapshot
  copies: CompareRow
  score: CompareRow
  users: CompareRow
  mechanisms: CompareRow[]
  words: CompareRow[]
  tests: CompareRow[]
  sameUsers: boolean
}
