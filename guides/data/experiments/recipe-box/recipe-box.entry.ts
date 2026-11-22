/**
 * The recipe box demo's own script:  `<recipe-box>`, on the page's Spell UI (epic `data` P4).
 * - Built into `recipe-box.bundle.js`, one classic script loaded right after `spell-ui.js`, from a checkout's `epic/`:
 *
 *       yarn tsx src/tools/bundle-experiment.ts "$(epic config contentFolder)/guides/data/experiments/recipe-box/recipe-box.entry.ts"
 *
 * - Rebuild it after editing `recipe-box-element/`, or when `spell/places` changes:  it's bundled from that checkout's source.
 */

import "./recipe-box-element"
