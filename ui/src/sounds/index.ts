/**
 * Barrel for `spell/ui/sounds` -- Spell's built-in sounds:  their names, kinds and where their files are.
 * - Its place in the import graph:  a LEAF -- no DOM, no element core, no runtime.
 *   The runtime (`UI.sounds`) and the editor's sound picker read it.
 * - NOTE: no self-namespace:  `BuiltInSounds` already reads as one.
 * - NOTE: the sounds themselves (`./sound-library/*.ogg`) are files, not exports.
 */

export * from "./sounds.types"

export * from "./BuiltInSounds"
