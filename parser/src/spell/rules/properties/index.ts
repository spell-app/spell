/**
 * The `properties` rule module:  members -- naming one, reading one off an object or `it` --
 * plus object-literal construction.
 * - One rule class per file;  `properties.en.ts` registers them on `properties` (`properties.parser.ts`),
 *   and each other language's `properties.<lang>.ts` registers the same rules in its own words.
 *   `MemberReadExpression`, the base class of the rules which read a member, registers nothing itself.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */

// TODO: constructor
// TODO: mixins / traits / composed classes / annotations

export * from "./properties.parser"
export * from "./properties.shared"
export * from "./Property"
export * from "./MemberWords"
export * from "./BodyMemberWords"
export * from "./QuotedMember"
export * from "./MemberReadExpression"
export * from "./PropertyExpression"
export * from "./ItsKnownProperty"
export * from "./TheOwnProperty"
export * from "./ItsProperty"
export * from "./ItsOrdinal"
export * from "./ObjectLiteralProperty"
export * from "./ObjectLiteralProperties"
