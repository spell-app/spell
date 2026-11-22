/**
 * The custom elements guide's own script:  the live elements it adds to the docs bundle (`spell-ui.js`).
 * - `<ui-counter>`, the teaching element the guide writes step by step (`./ui-counter/`)
 * - `<ui-docs-inspector>`, Spell UI's doc-only widget that shows an element's attributes, properties and
 *   `:state()`s live (`packages/ui/src/docs-components/ui-docs-inspector/`)
 * - Built into `custom-elements.bundle.js` (one classic script, loaded right after `spell-ui.js`):
 *
 *       cd packages/docs && yarn tsx tools/bundle-experiment.ts ../../guides/custom-elements/experiments/custom-elements.entry.ts
 *
 *   Rebuild it after editing `ui-counter/`, or when `<ui-docs-inspector>` changes.
 */

import "./ui-counter"
import "spell-ui/docs-components/ui-docs-inspector"
