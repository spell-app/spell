import { SpellIdentifier } from "./SpellIdentifier"

/**
 * `identifier` rule:  variable identifier with no adornments (no leading `the`, no known/unknown check).
 * - You won't generally use this directly -- use `variable` or `known_variable` instead.
 */
export class Identifier extends SpellIdentifier {}
