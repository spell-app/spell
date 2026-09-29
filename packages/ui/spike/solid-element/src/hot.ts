/*!
 * @spell/solid-element -- MIT licence.
 * A fork of `@solidjs/element` and `component-register` (MIT, (c) Ryan Carniato).
 */

/**
 * Hot module replacement, kept from `component-register`:  `hot(module, tag)` re-renders every `<tag>` on the page
 * (shadow roots included) after the module is replaced;  `register()` has already swapped the component.
 * - Webpack / Parcel style (`module.hot`);  with Vite, call `reloadElement()` from `import.meta.hot.accept()`.
 * - State is NOT preserved.
 */

import { STATE, type SolidElement } from "./solid-element.types"

/** Accept updates of `module` and reload every `<tagName>`. */
export function hot(module: { hot?: any }, tagName: string) {
  if (!module.hot) return
  module.hot.accept(update)
  if (module.hot.status?.() === "apply") update()

  /** Reload each `<tagName>` on the next task;  logs instead when handed an error. */
  function update(error?: unknown) {
    if (error instanceof Error) return console.error(error)
    walk(document.body, (node) => {
      if (node.localName === tagName) setTimeout(() => reloadElement(node as SolidElement), 0)
    })
  }
}

/** Dispose `element`'s component and render it again (if connected). */
export function reloadElement(element: SolidElement) {
  if (!(STATE in element)) return
  element.dispose()
  element.renderRoot.textContent = ""
  if (element.isConnected) (element as SolidElement & { connectedCallback(): void }).connectedCallback()
}

/** Call `visit` for `root` and every element below it, through open shadow roots. */
function walk(root: Element, visit: (node: Element) => void) {
  visit(root)
  if (root.shadowRoot) for (const child of root.shadowRoot.children) walk(child, visit)
  for (const child of root.children) walk(child, visit)
}
