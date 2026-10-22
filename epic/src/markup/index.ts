/**
 * `spell-epic/markup` barrel:  reading, writing and checking an epic page's `<epic-*>` markup through
 * `spell-epic/definitions`, on linkedom documents (node) and the browser's DOM alike.
 * - Node-safe:  defines no element, touches no DOM global.
 * - Turning the old prose shapes into the elements is the epic tool's (`spell-epic/tool/ProseRewrite`).
 */
export * from "./markup.types"

export * from "./MarkupCheck"
export * from "./Markup"
