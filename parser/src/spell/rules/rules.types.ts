/**
 * Constants, types and pure helpers shared by more than one of spell's rule modules.
 * - Runtime-light:  `import type` only, apart from `spell/util` -- so any rule module may import it,
 *   whatever order the `SP` barrel loads them in.
 * - What only ONE module uses stays in that module, below the rule it serves.
 */

import type { P } from "spell/parser/parser"

////////////////
// ## Priority
////////////////

/**
 * Which of several rules matching the SAME words wins a `Choice`, higher first --
 * e.g. `@proto static priority = Priority.declaration`.
 * - Only a tie-break:  NOT how tightly an operator binds, which is `Precedence` (`expressions/expressions.shared.ts`).
 * - Then the longest match wins, then the earliest rule -- see `P.Choice.getBestMatch()`.
 * - A new level is a new name here, with a why.  `expressions.test.ts` pins every rule's.
 */
export const Priority = {
  /**
   * A built-in reading which a project's own method of the same words replaces,
   * e.g. `move the card to the pile` when the project says `to move (a card) to (a pile)`:
   * its method must run, not the built-in one.
   */
  overridable: -1,
  /** Default, from `P.Rule`:  most rules, e.g. a call to a project's method, `x is y`. */
  normal: 0,
  /**
   * A reading which beats a `normal` one of the same words,
   * e.g. `draw the card` as `draw_thing`, not a call to the project's own `to draw (a card)`.
   * - Also a declared member over a built-in reading, e.g. a deck's `the last card` over the ordinal.
   */
  preferred: 1,
  /**
   * Says more than a `preferred` reading of the same words,
   * e.g. `the biggest of the prices` as `max`, not a property read.
   */
  specific: 2,
  /**
   * Says more still, e.g. `the position of x in the list`, `the number of cards in the deck`:
   * a type declaring `position` or `number` mustn't break them.
   */
  mostSpecific: 3,
  /**
   * Just under `declaration`, e.g. `a thing "is a bug" if ...`:
   * so `a card has ...` stays a property declaration.
   */
  belowDeclaration: 9,
  /**
   * A statement declaring a type or property, over other statements of the same words,
   * e.g. `a card is a thing`, `a card has a suit`.
   */
  declaration: 10,
  /**
   * Words a project declared:  an alias, or a type's class variable.
   * - They beat any built-in reading of the same words,
   *   e.g. `is the queen of spades`, `card suits`.
   */
  userDeclared: 20
}

////////////////
// ## Members
////////////////

/**
 * How many of `words`' words, from the first, `isDeclared` -- the most that are.
 * - e.g. 2 for `short rank` in `short rank plus`;  0 if none.
 * - For a rule taking `member_words` greedily which wants only what a type declares:
 *   it re-parses with that many, e.g. `its short rank + 1`, `card suits includes x`.
 */
export function declaredPrefix(words: P.Match, isDeclared: (words: string) => boolean): number {
  const raw = words.tokens.map((token) => `${token.value}`)
  for (let count = raw.length; count > 0; count--) {
    if (isDeclared(raw.slice(0, count).join(" "))) return count
  }
  return 0
}

////////////////
// ## Names with grammar words
////////////////

/**
 * The names in `list` and its parents' lists which hold a grammar word, as their words:
 * lowercase, a space between, e.g. `card in play`, `lado de juego` (epic `spanish` P14).
 * - `wordsOf`:  a name's words, e.g. `CardInPlay` => `["card", "in", "play"]`.
 * - `isGrammarWord`:  a word which ends a name, e.g. one on the language's blacklist.
 *   The FIRST word is never asked:  a name can't start with one, apart from a member's leading words (`in play`).
 * - So a MENTION of a declared name can read past a word that would otherwise end it:
 *   `the c is a new card in play`, after `a card in play is a thing`.
 *   - Only a declared name, whole:  `card in the deck` stays `card`, then `in`.
 * - `kind` keys the cache:  each list asks with one `isGrammarWord`.
 * - `LOCAL_ONLY`:  `list`'s own names, not its parents', e.g. a type's own members.
 * - Cached by each list's items array, which a list swaps rather than changes (`P.ScopeList`):
 *   cheap enough to ask at every word, and an edit's undo is seen at once.
 */
export function namesWithGrammarWords<Item>(
  list: P.ScopeList<Item, any> | undefined,
  kind: string,
  wordsOf: (item: Item) => string[],
  isGrammarWord: (word: string) => boolean,
  localOnly?: "LOCAL_ONLY"
): string[] {
  const names: string[] = []
  for (let current = list; current; current = localOnly ? undefined : current.parent) {
    const items = current.get()
    const cache = (GRAMMAR_WORD_NAMES[kind] ??= new WeakMap())
    let found = cache.get(items)
    if (!found) {
      found = []
      for (const item of items) {
        const words = wordsOf(item).map((word) => word.toLowerCase())
        if (words.length > 1 && words.slice(1).some(isGrammarWord)) found.push(words.join(" "))
      }
      cache.set(items, found)
    }
    names.push(...found)
  }
  return names
}

/** `namesWithGrammarWords()`' cache:  by kind, then by a list's items array. */
const GRAMMAR_WORD_NAMES: Record<string, WeakMap<readonly unknown[], string[]>> = Object.create(null)

/**
 * How many of `words`, from the first, are the longest of `names` -- 0 if none is, e.g. 3 for `card in play is`.
 * - `words` lowercase;  `names` as `namesWithGrammarWords()` gives them.
 */
export function longestNameIn(words: string[], names: string[]): number {
  let longest = 0
  for (const name of names) {
    const count = name.split(" ").length
    if (count > longest && count <= words.length && words.slice(0, count).join(" ") === name) longest = count
  }
  return longest
}
