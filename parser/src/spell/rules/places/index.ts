/**
 * The `places` rule module:  where a program's data lives, and the words only a saved type has (epic `data` P11).
 * - One rule class per file;  `places.en.ts` registers them on `places` (`places.parser.ts`),
 *   and each other language's `places.<lang>.ts` registers the same rules in its own words.
 * - The reads people already know (`every recipe`, `add`, `remove`) stay their own rules', and ask `places.shared`.
 */
export * from "./places.parser"
export * from "./places.shared"
export * from "./PlaceDetail"
export * from "./OperationAt"
export * from "./CreatePlace"
export * from "./CollectionAt"
export * from "./FieldCalled"
export * from "./KeyIsSecret"
export * from "./KeyWritten"
export * from "./CheckedEvery"
export * from "./VersionsIn"
export * from "./IdColumn"
export * from "./SavedInPlace"
export * from "./ReadRider"
export * from "./AllOrNothing"
export * from "./DraftOf"
export * from "./SaveDraft"
export * from "./CancelDraft"
export * from "./CancelAction"
export * from "./RefreshThings"
export * from "./TryAgain"
export * from "./HelpfulWord"
export * from "./FirstFewWhere"
export * from "./NumberOfThingsWhere"
export * from "./TotalOf"
export * from "./PeopleWords"
