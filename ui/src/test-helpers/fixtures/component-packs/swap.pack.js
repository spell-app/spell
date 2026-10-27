/**
 * A test component pack that's REBUILT between runs (`tests/components/ui-components/ComponentPacks.test.ts`,
 * `ComponentPacks.reload()`):  a CLASSIC script, as `spell pack build` writes one.
 * - `<swap-a>` and `<swap-b>`, each its own family (`swap-a/`, `swap-b/`), real components on the page's
 *   `UIComponent`, drawing `<b part="text">` with their letter and this run's `version`.
 * - What a run is built from, set by the test before it loads:  `globalThis.__swapPack = { version, families }`
 *   (`families`:  each family's sources' hash, as a build writes them).
 */
;(() => {
  const { registerPack, packModules } = globalThis.SpellUI
  const { E } = packModules["spell/ui/core"]
  const { version, families } = globalThis.__swapPack

  /** A vocabulary for tag `tag`:  nothing but its name and its text part. */
  const vocabularyFor = (tag) => ({
    tag,
    noun: tag,
    description: `Test tag ${tag}.`,
    topics: ["documentation", "layout"],
    aka: [],
    attributes: [],
    events: [],
    slots: [],
    parts: [{ name: "text", description: "The text." }],
    states: [],
    texts: []
  })

  /** A component for tag `tag`, drawing its letter and this run's version;  named as a build keeps it. */
  const componentFor = (tag, name) => {
    const Class = {
      [name]: class extends E.UIComponent {
        render() {
          const text = document.createElement("b")
          text.setAttribute("part", "text")
          text.textContent = `${tag.slice(-1)} ${version}`
          return text
        }
      }
    }[name]
    Object.defineProperty(Class.prototype, "vocabulary", { value: vocabularyFor(tag) })
    return Class
  }

  registerPack({
    name: "swap",
    prefix: "swap-",
    catalog: { "swap-a": { folder: "swap-a" }, "swap-b": { folder: "swap-b" } },
    families,
    define() {
      componentFor("swap-a", "SwapA").define()
      componentFor("swap-b", "SwapB").define()
    }
  })
})()
