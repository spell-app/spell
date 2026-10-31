/**
 * Barrel for `spell/util/places`:  where data lives (epic `data`).
 * - A PLACE is Spell's word for a back-end:  `Place`, in `places.types`.
 * - `Places` names them, and `PlaceCache` holds ONE row per type and id.
 * - `PlaceResult` is one read of one place, on `Loadable`.
 * - `MemoryPlace` and `DevicePlace` (this device, over preferences' `PrefPlace`) are the first two places.
 * - `refs` names anything saved in text, `Recipe#r-12`.
 * - NOTE:  NOT flattened into `spell/util`, so no page pays for it until it uses it.
 * - GENERIC:  nothing about Things or Spell's words.
 *   Everything that needs a server is `spell/server/places`.
 * - Its files import each other as peers.
 */

export * from "./places.types"
export * from "./refs"

export * from "./PlaceCache"
export * from "./PlaceResult"
export * from "./Places"
export * from "./MemoryPlace"
export * from "./DevicePlace"
