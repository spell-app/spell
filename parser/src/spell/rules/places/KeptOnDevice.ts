import { PlaceDetail, type PlaceDetailValue } from "./PlaceDetail"
import { Wording } from "spell/parser/spell/rules/expressions"
import type { P } from "spell/parser/parser"

/** How many bytes each of a size's units is:  as a disk says, a megabyte is a million. */
export const SIZE_UNIT_BYTES: Readonly<Record<string, number>> = { kb: 1e3, mb: 1e6, gb: 1e9 }

/**
 * `kept_on_device` rule:  keep a copy of what a place reads on this device (epic `data` P36).
 * - e.g. `- keep a copy on this device`, `- keep a copy on this device, up to 20 MB`
 * - Opt-in:  without it, nothing a place reads is kept, and every visit reads the server.
 * - What's kept is fresh until the place's next check time (`check it once a day at 5am`):  a page draws from it with no
 *   request while it's fresh, and from it at once, reading the server behind it, once it's stale (`DeviceCopy`).
 * - Its size limit:  50 MB, unless it says;  over it, what was read least recently is discarded.
 * - Compiles to `keptOnDevice: true`, or with a limit, its bytes:  `keptOnDevice: 20000000`.
 */
export class KeptOnDevice extends PlaceDetail<"size?|unit?"> {
  detailOf(match: P.MatchFor<this>): PlaceDetailValue {
    const { size, unit } = match.groups
    if (!size) return { keptOnDevice: true }
    return { keptOnDevice: Number(size.raw) * (SIZE_UNIT_BYTES[Wording.meaningOf(unit) ?? "mb"] ?? 1) }
  }
}
