import { P } from "spell/parser/parser"

/** How loud `quietly` plays, from 0 to 1. */
export const QUIET_VOLUME = 0.3

/**
 * `media_volume` rule:  how loud to play a sound or video -- `at 50% volume`, `quietly`, `muted` (epic `language` P65);
 * Spanish `al 50% de volumen`, `bajito`, `en silencio`.
 * - A percent, kept as its fraction (`50%` => `0.5`):  the core's volume runs from 0 to 1.
 * - `quietly`:  `QUIET_VOLUME`;  `muted`:  with no sound at all.
 * - `play` reads its groups:  `PlaySound`.
 */
export class MediaVolume extends P.Sequence<"volume?|quiet?|muted?"> {}
