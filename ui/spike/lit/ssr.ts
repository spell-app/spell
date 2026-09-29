/// <reference types="node" />

/**
 * SSR / Declarative Shadow DOM check:  render `<ui-button primary>Save</ui-button>` with `@lit-labs/ssr` in Node
 * and assert the output carries `<template shadowrootmode="open">` with the class-grammar button inside.
 * - The component modules import `?inline` CSS and use `$` aliases + standard decorators, so they load through
 *   Vite's `ssrLoadModule()` (as Astro would), not plain Node.  `lit` stays external:  the `html` below and
 *   the components share one copy.
 * - `yarn ssr`;  exits non-zero on failure.
 */

import "@lit-labs/ssr/lib/install-global-dom-shim.js"
import { render } from "@lit-labs/ssr"
import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js"
import { html } from "lit"
import { createServer } from "vite"

const server = await createServer({
  configFile: "vite.config.ts",
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn"
})
let output = ""
try {
  await server.ssrLoadModule("/src/components/button/index.ts")
  await server.ssrLoadModule("/src/components/dropdown/index.ts")
  output = collectResultSync(
    render(html`<ui-button primary>Save</ui-button>
      <ui-dropdown selection placeholder="Colour" value="r"><ui-item value="r">Red</ui-item></ui-dropdown>`)
  )
} finally {
  await server.close()
}
console.log(output)
const checks = {
  declarativeShadowRoot: /<template [^>]*shadowrootmode="open"/.test(output),
  delegatesFocus: output.includes("shadowrootdelegatesfocus"),
  buttonClasses: output.includes('class="ui primary button"'),
  dropdownTrigger: output.includes('class="trigger"')
}
console.log(checks)
if (!Object.values(checks).every(Boolean)) process.exit(1)
