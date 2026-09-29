/**
 * Demo page:  every example fragment of `src/components/{button,dropdown}/examples/` (class grammar, light DOM)
 * beside its element-markup rewrite in `demo/examples/`.
 * - The originals need the component sheets on the PAGE;  the runtime already puts the foundation there.
 */

import { UI } from "$/runtime"

import "$spike/index"

import buttonCSS from "$/components/button/button.css?inline"
import dropdownCSS from "$/components/dropdown/dropdown.css?inline"

/** Original fragments, by path. */
const ORIGINALS = import.meta.glob<string>("/../../src/components/*/examples/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Element rewrites, by path. */
const ELEMENTS = import.meta.glob<string>("./examples/*/*.html", { query: "?raw", import: "default", eager: true })

await UI.load()
UI.styles.register("button", buttonCSS, { page: true })
UI.styles.register("dropdown", dropdownCSS, { page: true })

const main = document.getElementById("examples")!
for (const [path, html] of Object.entries(ELEMENTS)) {
  const name = path.replace("./examples/", "")
  const original = Object.entries(ORIGINALS).find(([key]) => key.endsWith(name))?.[1] ?? ""
  const pair = document.createElement("section")
  pair.className = "pair"
  pair.innerHTML = `<div><h3>${name} -- class grammar</h3>${original}</div><div><h3>${name} -- elements</h3>${html}</div>`
  main.append(pair)
}
