/**
 * What the demo checks share about the pages they open, on the kit's `BrowserPage`
 * (`spell/element-tools/BrowserPage`, which opens them and reports their problems).
 * - plain JavaScript, node's own modules only
 */
import { resolve } from "node:path"

/**
 * A `BrowserPage` `onProblem` that pushes each problem onto `logs`, as the checks print it:
 * `pageerror:  ...`, `console:  ...`.
 */
export function logInto(logs) {
  return (text, kind) => logs.push(`${kind === "page error" ? "pageerror" : "console"}:  ${text}`)
}

/**
 * `--bundle`'s file (from the working folder) served as the pages' `spell-ui.js`:
 * a runtime not yet built into `_assets/`;  none without one
 */
export function bundleRoutes(bundle) {
  return bundle ? [{ url: "**/_epic/assets/spell-ui.js", fileFor: () => resolve(bundle) }] : []
}
