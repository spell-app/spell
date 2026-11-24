/**
 * The docs pages' ONE script:  `<script src="/_epic/assets/spell-ui.js"></script>`, at the end of every page's `<body>`.
 * - A few lines of classic script, committed:  it imports the docs bundle, the ES module `spell-ui/main.js` beside it
 *   (`spell-ui.entry.js`, built by `node src/tools/bundle-spell-ui.js`, git-ignored, built by the page server when
 *   stale), and every family that module loads on first use (epic `solid-2-final` P7).
 * - So no page names the module, and a page from an older checkout loads the same way.
 * - `SpellUI.loading`:  resolves once the bundle has run (`SpellUI.UI`, `registerPack`, `packModules`, `themed` set)
 *   and the UI runtime has loaded (`SpellUI.ready`:  `UI.i18n` ... work);  NEVER rejects.  A script that reads them as it runs waits for it:  a guide's experiment bundle
 *   (`bundle-experiment.ts`), the app's `spell-solid-shared.js`.
 * - Pages are served, never opened from disk (epic `epic-engine` P46):  a browser runs no module from `file://`.
 * - Run again (a reference page adds it after drawing its tables, `drawThenBoot()`):  nothing more.
 */
;(() => {
  const SpellUI = (globalThis.SpellUI ??= {})
  if (SpellUI.loading) return
  const here = document.currentScript?.src || location.href
  SpellUI.loading = import(new URL("spell-ui/main.js", here).href)
    .then(() => SpellUI.ready)
    .catch((error) => console.error("spell-ui.js:  the docs bundle didn't load", error))
})()
