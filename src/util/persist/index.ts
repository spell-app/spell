/**
 * Barrel for `spell/util/persist`:  values kept for people, across visits -- `PrefStore`, and the places it keeps them.
 * - Flattened into `spell/util`.
 * - GENERIC, like the files beside `../index.ts`:  nothing spell-specific, no imports from outside this folder.
 *   - So Spell UI imports its files one by one (`spell/util/persist/PrefStore` ...), from its util barrel.
 * - Its files import each other as peers.
 */

export * from "./persist.types"
export * from "./values"

export * from "./PrefPlace"
export * from "./MemoryStorage"
export * from "./StoragePlace"
export * from "./PrefStore"
