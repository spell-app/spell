/**
 * Barrel for `spell/util/persist`:  what an app keeps for people -- their preferences across visits (`PrefStore`, and
 * the places it keeps them), and the history they undo and redo (`UndoStack`).
 * - Flattened into `spell/util`.
 * - GENERIC, like the files beside `../index.ts`:  nothing spell-specific.
 *   - The pref store imports nothing from outside this folder, so Spell UI imports it by file
 *     (`spell/util/persist/PrefStore`), never through its util barrel (it'd cost every page 1.9 kB).
 *   - The undo stack stands on util's reactive engine (`spell/util/reactive`), for its live titles.
 * - Its files import each other as peers.
 */

export * from "./persist.types"
export * from "./values"

export * from "./PrefPlace"
export * from "./MemoryStorage"
export * from "./StoragePlace"
export * from "./WaitedOnPlace"
export * from "./DatabasePlace"
export * from "./ServerPlace"
export * from "./PrefStore"
export * from "./UndoStack"
