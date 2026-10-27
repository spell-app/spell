import { SpellConstant } from "./SpellConstant"

/**
 * `constant` rule:  possibly-unknown constant identifier.
 * - `match.data.scopeConstant` will be the existing `ScopeConstant` if one already exists.
 * - Compiles to a quoted string literal of its own name when unknown, e.g. `red` => `'red'`.
 */
export class Constant extends SpellConstant {}
