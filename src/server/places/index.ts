/**
 * Barrel for `spell/server/places`:  the places that need node (epic `data` P5).
 * - `ChunkFiles`:  a folder of files as a `ChunkedPlace`'s store.
 * - `FolderPlace`:  a folder as a place, a list file and one file per thing, its changes heard from the disk.
 * - `FilePlace`:  one file as a place.
 * - `PlaceServer`:  any place over HTTP, on the kit's router, behind `Guard`;  `PlaceKeys`, what it holds.
 * - `DirectReads`:  a space's files read straight, apart from the server that writes them, with a credential for the
 *   whole space (epic `atmosphere` P5).
 * - `Referee`:  puts everyone's changes in a shared space in one order;  `LiveRoomPlace` is its browser half.
 * - `GoogleSheetPlace`:  a Google Sheet as a place, its token from `GoogleToken`.
 * - `AirtablePlace`:  an Airtable base as a place:  its key held here, one read however many tabs.
 * - `CsvPlace`:  a CSV file as a place that takes writes, each save changing only the lines that changed.
 * - `ExcelPlace`:  an Excel workbook as a place that takes writes, each sheet a collection (epic `data` P38).
 * - `contentVersion()`:  a version made from what something holds, a CSV row's or a folder's thing's.
 * - `TakenDown`:  what's taken down in a space's folder, as its host says,
 *   and what a refusal of it says (epic `atmosphere` P6).
 * - `SpacesHost`:  Spell's own AT Protocol Spaces host, both sides, kept in memory (epic `atmosphere` P13).
 * - `RateQueue`:  requests under a service's named limit, in order, waiting as a 429 says.
 * - NOT in the `spell/server` barrel, whose importers don't all want `spell/places`.
 * - Node only;  the browser's half is `RemotePlace`, in `spell/places`.
 */

export * from "./PlaceEvents"
export * from "./ChunkFiles"
export * from "./FolderPlace"
export * from "./FilePlace"
export * from "./PlaceKeys"
export * from "./PlaceServer"
export * from "./DirectReads"
export * from "./Referee"
export * from "./RateQueue"
export * from "./SpacesHost"
export * from "./GoogleToken"
export * from "./GoogleSheetPlace"
export * from "./AirtablePlace"
export * from "./CsvPlace"
export * from "./ExcelPlace"
export * from "./contentVersion"
export * from "./takenDown"
