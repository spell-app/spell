/**
 * Barrel for `spell/util/places`:  where data lives (epic `data`).
 * - A PLACE is Spell's word for a back-end:  `Place`, in `places.types`.
 * - `Places` names them, and `PlaceCache` holds ONE row per type and id.
 * - `PlaceResult` is one reader's read of one place, on `Loadable`.
 * - `PlaceReads` shares one request between readers, and aborts it when the last one leaves.
 * - `PlaceQuery` does what a place can't, up to a ceiling.
 * - `PlaceBatch` joins lists asked in the same moment into one request, where the place allows it.
 * - `MemoryPlace` and `DevicePlace` (this device, over preferences' `PrefPlace`) are the first two places.
 * - `RestPlace` and `GraphPlace` reach a server, on `WebPlace`.
 * - `ChunkedPlace`:  a list of summaries, and a body per thing fetched when it's read;  `WebChunks` from static hosting.
 * - `RemotePlace`:  any place on a server side (`PlaceServer`, in `spell/server/places`).
 * - `SheetPlace`:  a CSV file as a read-only place, read with `parseCsv()`, its rows made by `SheetTable`.
 * - `LiveRoomPlace`:  a live room, whose referee (`Referee`, in `spell/server/places`) puts everyone's changes in one order;
 *   `RoomCopy`, what both sides hold;  `positions`, a place in a list as a fraction.
 * - `refs` names anything saved in text, `Recipe#r-12`.
 * - `people`:  who's at this page, with no sign-in.
 * - `SaveQueue`:  saving in the background, in order, until it goes through:  `DraftSaver`'s too, by file.
 * - `PendingChanges`:  every change made and not yet confirmed, on top of what's read.
 * - `PlaceHeal`:  fetch the latest, replay what's pending.
 * - `Places.originOf()`:  where a value came from.
 * - NOT here:  `SamplePlace`, taken by file, `spell/util/places/SamplePlace`, so a built app leaves it out.
 * - NOTE:  NOT flattened into `spell/util`, so no page pays for it until it uses it.
 * - GENERIC:  nothing about Things or Spell's words.
 *   Everything that needs a server is `spell/server/places`.
 * - Its files import each other as peers.
 */

export * from "./places.types"
export * from "./refs"
export * from "./people"

export * from "./PlaceCache"
export * from "./PlaceBatch"
export * from "./PlaceQuery"
export * from "./PlaceReads"
export * from "./PlaceResult"
export * from "./Places"
export * from "./SaveQueue"
export * from "./PendingChanges"
export * from "./PlaceHeal"
export * from "./MemoryPlace"
export * from "./DevicePlace"
export * from "./WebPlace"
export * from "./RestPlace"
export * from "./GraphPlace"
export * from "./ChunkedPlace"
export * from "./JsonChunks"
export * from "./WebChunks"
export * from "./RemotePlace"
export * from "./positions"
export * from "./RoomCopy"
export * from "./LiveRoomPlace"
export * from "./csv"
export * from "./SheetTable"
export * from "./SheetPlace"
