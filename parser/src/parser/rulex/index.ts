/**
 * Barrel for `rulex` -- regex-like syntax for defining parser `rules` from a compact string.
 * - `rulex` is an opt-in sub-system: importing this barrel (`import "spell-lang/parser/rulex"`) runs `rulex.ts`'s
 *   side effect of registering `Parser.rulexParser`, which `Rule`'s constructor needs whenever a rule
 *   class uses `syntax`.
 * - All other files in this folder MUST only import from here, or risk circular import problems.
 * - NOTE: unlike other barrels, this one is deliberately NOT re-exported from `spell-lang/parser`'s barrel --
 *   see `spell-lang/parser/index.ts`.  Consumers who need `rulex` opt in explicitly.
 */

export * from "./RulexTokenizer"
export * from "./RulexParser"
export * from "./rulex"
