/**
 * `FakeSpaces`:  Spell's own Spaces host (`SpacesHost`, `spell/server/places`) as the tests use it (epic `atmosphere`
 * P11, P13), for trying `AtProtoSpace` and `AtProtoSpacePlace` with no real account.
 * - The same host `spell space org host start` runs:  what it answers, and what it doesn't, is in its docstring.
 * - A test helper's name, so a test reads as one.
 */
import { SpacesHost, type SpacesHostAsk } from "spell/server/places/SpacesHost"

/** A Spaces host, answering as Bluesky's alpha does:  see `SpacesHost`. */
export class FakeSpaces extends SpacesHost {}

/** One request the host was sent. */
export type FakeSpacesAsk = SpacesHostAsk
