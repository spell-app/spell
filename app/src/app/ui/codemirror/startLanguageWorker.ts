/**
 * Start the editor's language worker (`languageWorker.ts`, epic `solid-2-final` P18).
 * - Its own file, NOT in the CodeMirror folder's barrel:  only the editor app imports it (`LazyCodeMirror`),
 *   so `<spell-editor>`'s build bundles no worker (`element.build.test.ts`).
 */
export function startLanguageWorker(): Worker {
  return new Worker(new URL("./languageWorker.ts", import.meta.url), { type: "module", name: "spell-language" })
}
