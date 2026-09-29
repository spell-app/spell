/**
 * Every `lit` specifier the Lit spike's `dist/` imports, one namespace re-export each.
 * - `yarn vendor` builds one file per line (`vendor/`, for import-map pages);  `yarn measure` bundles this file
 *   once as the `library` tier.  `SpikeMeasure`'s `peersMissing` check flags a specifier `dist/` needs but
 *   this list lacks.
 */

export * as lit from "lit"
export * as decorators from "lit/decorators.js"
export * as ifDefined from "lit/directives/if-defined.js"
export * as live from "lit/directives/live.js"
export * as repeat from "lit/directives/repeat.js"
export * as staticHtml from "lit/static-html.js"
