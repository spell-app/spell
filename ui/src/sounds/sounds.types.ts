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

/** Each kind's name, in English and Spanish:  the sound picker's group headings. */
export const SOUND_KIND_NAMES: Record<SoundKind, { en: string; es: string }> = {
  interface: { en: "Clicks and switches", es: "Clics e interruptores" },
  cards: { en: "Cards", es: "Cartas" },
  casino: { en: "Dice, chips and coins", es: "Dados, fichas y monedas" },
  pieces: { en: "Board pieces", es: "Piezas de tablero" },
  impacts: { en: "Knocks and hits", es: "Golpes" },
  footsteps: { en: "Footsteps", es: "Pasos" },
  things: { en: "Doors, books and things", es: "Puertas, libros y cosas" },
  digital: { en: "Beeps and zaps", es: "Pitidos y chispazos" },
  jingles: { en: "Jingles", es: "Sintonías" }
}

/** The folder the built-in sounds are in, beside `BuiltInSounds`' module (or chunk, once built). */
export const SOUND_LIBRARY = "sound-library"
