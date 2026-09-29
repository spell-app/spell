/**
 * Renders every example pair:  the original class-grammar fragment (in a shadow root adopting foundation +
 * button + dropdown sheets, as a component would) next to the element-markup version.
 * - `data-query` on a dropdown types that query into its search input once rendered.
 */

import { loadUI } from "$/runtime"
import type { UIDropdown } from "../src/index"

import "../src/index"

import buttonCSS from "$/components/button/button.css?inline"
import dropdownCSS from "$/components/dropdown/dropdown.css?inline"

/** Class-grammar fragments, by path. */
const ORIGINALS = import.meta.glob<string>("../../../src/components/*/examples/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})
/** Element-markup fragments, by path. */
const ELEMENTS = import.meta.glob<string>("../src/components/*/examples/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

const ui = await loadUI()
ui.styles.register("button", buttonCSS)
ui.styles.register("dropdown", dropdownCSS)
const main = document.querySelector("#examples")!

for (const [path, original] of Object.entries(ORIGINALS)) {
  const [, component, file] = /components\/(\w+)\/examples\/(\w+)\.html$/.exec(path)!
  const elements = ELEMENTS[`../src/components/${component}/examples/${file}.html`] ?? "<p>(missing)</p>"
  const pair = document.createElement("section")
  pair.className = "pair"
  pair.innerHTML = `<h3>${component} / ${file}</h3><div><h4>class grammar</h4><div class="original"></div></div>
    <div><h4>elements</h4><div class="elements">${elements}</div></div>`
  const host = pair.querySelector(".original")!
  const root = host.attachShadow({ mode: "open" })
  root.innerHTML = original
  ui.styles.adoptInto(root, ["button", "dropdown"])
  main.append(pair)
}

// Type the demo queries once the dropdowns have rendered.
for (const dropdown of document.querySelectorAll<UIDropdown>("ui-dropdown[data-query]")) {
  await dropdown.updateComplete
  const input = dropdown.shadowRoot!.querySelector<HTMLInputElement>("input.search")!
  input.value = dropdown.dataset.query!
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
}
