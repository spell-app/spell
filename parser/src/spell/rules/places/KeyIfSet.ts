import { textIn, type PlaceDetailValue } from "./PlaceDetail"
import { KeyIsSecret } from "./KeyIsSecret"
import type { P } from "spell/parser/parser"

/**
 * `key_if_set` rule:  the NAME of a key a place takes when it's set, and goes without when it isn't (epic `data` P28, Q26).
 * - e.g. `- its key is the secret "GITHUB_TOKEN", if it's set`:  GitHub answers 60 requests an hour with none, 5000 with one
 * - Where it's set (a server side, a test, the ingest's read through it), it goes on each request;
 *   in a browser, which never holds a key, each request goes without.
 * - So it needs no server side, as a key it can't do without does (`KeyIsSecret`).
 */
export class KeyIfSet extends KeyIsSecret {
  /** A browser goes without it:  nothing to warn of. */
  protected needsServerSide = false

  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    return { keyNamed: textIn(match.groups.name), keyIfSet: true }
  }
}
