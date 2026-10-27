/**
 * MOVED:  an epic page's review inbox (`<name>.inbox.json5`) is `ReviewInbox`, `spell/epic/tool/ReviewInbox` (epic
 * `epic-components`, P7:  the `epic` tool is TypeScript in `spell-epic`).  This forwards, for old imports.
 * - NOTE:  the API is the class's now (`ReviewInbox.update(file, (inbox) => inbox.setMark(...))` ...), not the old
 *   free functions over an inbox object
 */
export * from "spell/epic/tool/ReviewInbox"
