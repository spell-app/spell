/**
 * `yarn dev` home page:  every example fragment of `src/components/<name>/examples/` (class grammar, light DOM)
 * beside its element markup in `examples/elements/` -- button, dropdown, icon, label, parts, divider, segment,
 * container, grid, image, text, flag, loader, placeholder, message, breadcrumb, input, checkbox, form, list, menu, table.
 * - The originals need the component sheets on the PAGE;  the runtime already puts the foundation there.
 * - `item` has no examples of its own:  its look is its owners' (`list.css`, `menu.css`).
 * - Owners that don't exist yet (card, feed, modal, statistic ...) are `stub-*` elements (`StubOwner`).
 * - `?only=<name>` shows one component's pairs (`yarn screenshots`).
 */

import { UI } from "$/runtime"
import { StubOwner } from "$test/StubOwner"

import "$/index"

import buttonCSS from "$/components/button/button.css?inline"
import dropdownCSS from "$/components/dropdown/dropdown.css?inline"
import iconCSS from "$/components/icon/icon.css?inline"
import labelCSS from "$/components/label/label.css?inline"
import partsCSS from "$/components/parts/parts.css?inline"
import dividerCSS from "$/components/divider/divider.css?inline"
import segmentCSS from "$/components/segment/segment.css?inline"
import containerCSS from "$/components/container/container.css?inline"
import gridCSS from "$/components/grid/grid.css?inline"
import imageCSS from "$/components/image/image.css?inline"
import textCSS from "$/components/text/text.css?inline"
import flagCSS from "$/components/flag/flag.css?inline"
import loaderCSS from "$/components/loader/loader.css?inline"
import placeholderCSS from "$/components/placeholder/placeholder.css?inline"
import messageCSS from "$/components/message/message.css?inline"
import breadcrumbCSS from "$/components/breadcrumb/breadcrumb.css?inline"
import inputCSS from "$/components/input/input.css?inline"
import checkboxCSS from "$/components/checkbox/checkbox.css?inline"
import formCSS from "$/components/form/form.css?inline"
import listCSS from "$/components/list/list.css?inline"
import menuCSS from "$/components/menu/menu.css?inline"
import tableCSS from "$/components/table/table.css?inline"

/** Original fragments, by path. */
const ORIGINALS = import.meta.glob<string>("/src/components/*/examples/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Element rewrites, by path. */
const ELEMENTS = import.meta.glob<string>("/src/components/*/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

StubOwner.defineFomanticOwners()
await UI.load()
for (const [name, css] of Object.entries({
  button: buttonCSS,
  dropdown: dropdownCSS,
  icon: iconCSS,
  label: labelCSS,
  parts: partsCSS,
  divider: dividerCSS,
  segment: segmentCSS,
  container: containerCSS,
  grid: gridCSS,
  image: imageCSS,
  text: textCSS,
  flag: flagCSS,
  loader: loaderCSS,
  placeholder: placeholderCSS,
  message: messageCSS,
  breadcrumb: breadcrumbCSS,
  input: inputCSS,
  checkbox: checkboxCSS,
  form: formCSS,
  list: listCSS,
  menu: menuCSS,
  table: tableCSS
})) {
  UI.styles.register(name, css, { page: true })
}

const only = new URLSearchParams(location.search).get("only")
const main = document.getElementById("examples")!
for (const [path, html] of Object.entries(ELEMENTS)) {
  // `/src/components/button/examples/elements/content.html` => `button/content.html`
  const [, folder, file] = /\/components\/([\w-]+)\/examples\/elements\/([\w-]+\.html)$/.exec(path) ?? []
  const name = `${folder}/${file}`
  if (only && folder !== only) continue
  const original = ORIGINALS[`/src/components/${folder}/examples/${file}`] ?? ""
  const pair = document.createElement("section")
  pair.className = "pair"
  pair.innerHTML = `<div><h3>${name} -- class grammar</h3>${original}</div><div><h3>${name} -- elements</h3>${html}</div>`
  main.append(pair)
}
