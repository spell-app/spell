/**
 * Barrel for `spell/util/places`:  where data lives (epic `data`).
 * - A PLACE is Spell's word for a back-end:  `Place`, in `places.types`.
 * - `Places` names them, and `PlaceCache` holds ONE row per type and id.
 * - `PlaceResult` is one reader's read of one place, on `Loadable`.
 * - `PlaceReads` shares one request between readers, and aborts it when the last one leaves.
 * - `PlaceQuery` does what a place can't, up to a ceiling.
 * - `PlaceBatch` joins lists asked in the same moment into one request, where the place allows it.
 * - `MemoryPlace` and `DevicePlace` (this device, over preferences' `PrefPlace`) are the first two places.
 * - `DeviceCopy`:  a copy of what a server place reads, kept on this device, for a place whose line says so.
 * - `RestPlace` and `GraphPlace` reach a server, on `WebPlace`;  `FieldNames` matches a server's field names to ours by their words.
 * - `ChunkedPlace`:  a list of summaries, and a body per thing fetched when it's read;  `WebChunks` from static hosting.
 * - `RemotePlace`:  any place on a server side (`PlaceServer`, in `spell/server/places`).
 * - `SheetPlace`:  a CSV file as a read-only place, read with `parseCsv()`, its rows made by `SheetTable`.
 * - `AtProtoPlace`:  one atmosphere account, or everyone's put together, with no referee;  `AtProtoSignIn`, a person signing in,
 *   whose library loads only when someone does;  `AtProtoPasswordSignIn`, a program signing in with an app password.
 * - `StandardSite`:  a web page published to AT Protocol as a Standard.site document, through `AtProtoPlace`.
 * - `LexiconSchemas`:  Lexicons published to AT Protocol, each a schema record in the account that holds Spell's (P10).
 * - `CsvFile`:  a CSV file's text, which saves by comparing new rows with old:  `CsvPlace`, in `spell/server/places`, is the place that writes one.
 * - `LiveRoomPlace`:  a room, whose referee (`Referee`, in `spell/server/places`) puts everyone's changes in one order;
 *   `RoomCopy`, what both sides hold;  `positions`, a place in a list as a fraction.
 * - `refs` names anything saved in text, `Recipe#r-12`.
 * - `people`:  who's at this page, with no sign-in, or signed in here to a Spell account.
 * - `SpellSignIn`:  a person signing in to a Spell account by email, a link and a code (`SignInCheck`, in `spell/server/signIn`).
 * - `SaveQueue`:  saving in the background, in order, until it goes through:  `DraftSaver`'s too, by file.
 * - `PendingChanges`:  every change made and not yet confirmed, on top of what's read.
 * - `PlaceHeal`:  fetch the latest, replay what's pending.
 * - `Places.originOf()`:  where a value came from.
 * - `PlaceCopy`:  every thing in one place's collection, copied into another:  data moving when a program's line changes.
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
export * from "./FieldNames"
export * from "./DeviceCopy"
export * from "./WebPlace"
export * from "./RestPlace"
export * from "./GraphPlace"
export * from "./ChunkedPlace"
export * from "./JsonChunks"
export * from "./WebChunks"
export * from "./RemotePlace"
export * from "./SpellSignIn"
export * from "./positions"
export * from "./RoomCopy"
export * from "./LiveRoomPlace"
export * from "./csv"
export * from "./CsvFile"
export * from "./SheetTable"
export * from "./SheetPlace"
export * from "./AtProtoSignIn"
export * from "./AtProtoPlace"
export * from "./AtProtoPasswordSignIn"
export * from "./StandardSite"
export * from "./LexiconSchemas"
export * from "./PlaceCopy"
