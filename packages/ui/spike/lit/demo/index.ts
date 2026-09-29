/**
 * Renders every example pair:  the original class-grammar fragment (in a shadow root adopting the foundation and
 * every component sheet, as a component would) next to the element-markup version.
 * - `data-query` on a dropdown types that query into its search input once rendered.
 * - `?only=<component>` shows one component's pairs, e.g. for screenshots.
 * - Owners that don't exist yet (card, feed, statistic ...) are `OwnerStub`s:  `<x-card>` ...
 * - The element side is page content, so it opts into the page typography (`ui-typography`, Fomantic's
 *   `site.less` rhythm);  the originals get the equivalent from the sheets their shadow root adopts.
 */

import { loadUI } from "$/runtime"
import type { UIDropdown } from "../src/index"

import { OwnerStub } from "../src/components/parts/OwnerStub"

import "../src/index"

import buttonCSS from "$/components/button/button.css?inline"
import containerCSS from "$/components/container/container.css?inline"
import dividerCSS from "$/components/divider/divider.css?inline"
import dropdownCSS from "$/components/dropdown/dropdown.css?inline"
import iconCSS from "$/components/icon/icon.css?inline"
import labelCSS from "$/components/label/label.css?inline"
import partsCSS from "$/components/parts/parts.css?inline"
import segmentCSS from "$/components/segment/segment.css?inline"

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

/** Every component sheet, by registry name, in the order the originals' shadow roots adopt them. */
const SHEETS: Record<string, string> = {
  button: buttonCSS,
  dropdown: dropdownCSS,
  icon: iconCSS,
  label: labelCSS,
  parts: partsCSS,
  divider: dividerCSS,
  segment: segmentCSS,
  container: containerCSS
}

OwnerStub.defineAll()
const ui = await loadUI()
for (const [name, css] of Object.entries(SHEETS)) ui.styles.register(name, css)
const main = document.querySelector("#examples")!
const only = new URLSearchParams(location.search).get("only")

for (const [path, original] of Object.entries(ORIGINALS)) {
  const [, component, file] = /components\/(\w+)\/examples\/(\w+)\.html$/.exec(path)!
  if (only && component !== only) continue
  const elements = ELEMENTS[`../src/components/${component}/examples/${file}.html`] ?? "<p>(missing)</p>"
  const pair = document.createElement("section")
  pair.className = "pair"
  pair.innerHTML = `<h3>${component} / ${file}</h3><div><h4>class grammar</h4><div class="original"></div></div>
    <div><h4>elements</h4><div class="elements ui-typography">${elements}</div></div>`
  const host = pair.querySelector(".original")!
  const root = host.attachShadow({ mode: "open" })
  root.innerHTML = original
  ui.styles.adoptInto(root, Object.keys(SHEETS))
  main.append(pair)
}

// Type the demo queries once the dropdowns have rendered.
for (const dropdown of document.querySelectorAll<UIDropdown>("ui-dropdown[data-query]")) {
  await dropdown.updateComplete
  const input = dropdown.shadowRoot!.querySelector<HTMLInputElement>("input.search")!
  input.value = dropdown.dataset.query!
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
}
