/**
 * Demo page:  every example fragment of `src/components/<name>/examples/` (class grammar, light DOM) beside its
 * element-markup rewrite in `demo/examples/` -- button, dropdown, icon, label, parts, divider, segment, container.
 * - The originals need the component sheets on the PAGE;  the runtime already puts the foundation there.
 * - Owners that don't exist yet (card, feed, modal, statistic ...) are `stub-*` elements (`StubOwner`).
 * - `?only=<name>` shows one component's pairs (used for the screenshots in `REPORT.md`).
 */

import { UI } from "$/runtime"

import { StubOwner } from "$spike/StubOwner"

import "$spike/index"

import buttonCSS from "$/components/button/button.css?inline"
import dropdownCSS from "$/components/dropdown/dropdown.css?inline"
import iconCSS from "$/components/icon/icon.css?inline"
import labelCSS from "$/components/label/label.css?inline"
import partsCSS from "$/components/parts/parts.css?inline"
import dividerCSS from "$/components/divider/divider.css?inline"
import segmentCSS from "$/components/segment/segment.css?inline"
import containerCSS from "$/components/container/container.css?inline"

/** Original fragments, by path. */
const ORIGINALS = import.meta.glob<string>("/../../src/components/*/examples/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Element rewrites, by path. */
const ELEMENTS = import.meta.glob<string>("./examples/*/*.html", { query: "?raw", import: "default", eager: true })

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
  container: containerCSS
})) {
  UI.styles.register(name, css, { page: true })
}

const only = new URLSearchParams(location.search).get("only")
const main = document.getElementById("examples")!
for (const [path, html] of Object.entries(ELEMENTS)) {
  const name = path.replace("./examples/", "")
  if (only && !name.startsWith(`${only}/`)) continue
  const [folder, file] = name.split("/")
  const original = Object.entries(ORIGINALS).find(([key]) => key.endsWith(`${folder}/examples/${file}`))?.[1] ?? ""
  const pair = document.createElement("section")
  pair.className = "pair"
  pair.innerHTML = `<div><h3>${name} -- class grammar</h3>${original}</div><div><h3>${name} -- elements</h3>${html}</div>`
  main.append(pair)
}
