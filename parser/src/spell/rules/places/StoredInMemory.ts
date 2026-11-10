import type { P } from "spell/parser/parser"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { CreatePlace } from "./CreatePlace"

/** The fewest words it's ever said in:  `notes se guarda en memoria`. */
const SHORTEST = 5

/** What this kind is, in `core.place()`'s words. */
const MEMORY_KIND = "in memory database"

/**
 * `stored_in_memory` rule:  a place kept only while the page is open (epic `language` P40;  Owen:  "database implies sql").
 * - e.g. `drafts is stored in memory`
 * - It's `an in memory database` plainly said, and that still reads.
 * - Compiles as `create_place` does:  its class, then `core.place()`.
 */
export class StoredInMemory extends CreatePlace {
  /** Quick test:  Spanish says it with no `is`, so `CreatePlace`'s own test can't look for one. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return tokens.length - start >= SHORTEST && SpellStatement.prototype.test.call(this, scope, tokens, start)
  }

  /** Always in memory. */
  protected placeKindOf(): string {
    return MEMORY_KIND
  }
}
