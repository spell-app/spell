import type { P } from "spell/parser/parser"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { CreatePlace } from "./CreatePlace"

/** The fewest words it's ever said in:  `notes se guarda en este dispositivo`. */
const SHORTEST = 6

/** What this kind is, in `core.place()`'s words. */
const DEVICE_KIND = "database on this device"

/**
 * `stored_on_this_device` rule:  a place kept in this browser (epic `data` Q33).
 * - e.g. `settings is stored on this device`:  kept for good
 * - e.g. `scratch is stored on this device, for each tab`:  kept for this tab only, gone when it closes
 * - It's `a database on this device` plainly said, and that still reads:
 *   `settings is a database on this device`.
 * - Compiles as `create_place` does:  its class, then `core.place()`.
 */
export class StoredOnThisDevice extends CreatePlace {
  /** Quick test:  Spanish says it with no `is`, so `CreatePlace`'s own test can't look for one. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return tokens.length - start >= SHORTEST && SpellStatement.prototype.test.call(this, scope, tokens, start)
  }

  /** Always this device. */
  protected placeKindOf(): string {
    return DEVICE_KIND
  }

  /** What `core.place()` is handed, plus that it's for this tab only. */
  protected descriptionOf(match: P.MatchFor<this>): Record<string, unknown> {
    return { ...super.descriptionOf(match), ...(match.groups.each_tab && { forEachTab: true }) }
  }
}
