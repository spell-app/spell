/**
 * Shared types and constants for `spell/ui/sounds`:  Spell's built-in sounds, and the kinds they're grouped by.
 * - The BOTTOM of `spell/ui/sounds`' import graph:  no imports.
 */

////////////////
// ## Sounds
////////////////

/**
 * One built-in sound:  a short `.ogg` file in `sound-library/`, from one of Kenney's free sound packs.
 * - Its file is its English name, spaces as dashes:  `card slide` => `sound-library/card-slide.ogg`.
 */
export type BuiltInSound = {
  /** its name in English, as a program says it:  `play "card slide"` */
  name: string
  /** its name in Spanish:  `reproducir "deslizar carta"` */
  es: string
  /** what kind of sound it is:  the picker's groups */
  kind: SoundKind
}

/** The kinds of built-in sound, in the order the sound picker shows them. */
export const SOUND_KINDS = [
  "interface",
  "cards",
  "casino",
  "pieces",
  "impacts",
  "footsteps",
  "things",
  "digital",
  "jingles"
] as const

/** A kind of built-in sound:  one of `SOUND_KINDS`. */
export type SoundKind = (typeof SOUND_KINDS)[number]

/** The folder the built-in sounds are in, beside `BuiltInSounds`' module (or chunk, once built). */
export const SOUND_LIBRARY = "sound-library"
