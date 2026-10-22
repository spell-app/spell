/**
 * The TypeScript plugin's entry, as tsserver loads it:  `ElementsPlugin.init`.
 * - A tsconfig turns it on by this file's name, `spell-kit/src/element-tools/ts-plugin/plugin.cjs`:
 *   tsserver finds a plugin as old Node did, by its path in the package (no `exports`), and `require()`s it.
 * - CommonJS, so any tsserver loads it;  the plugin itself is TypeScript, compiled as it loads by `tsx`,
 *   scoped to this one `require` (nothing else tsserver loads goes through it).
 * - SEE:  the kit's README-element.md, "The TypeScript plugin".
 */
const { require: tsxRequire } = require("tsx/cjs/api")

module.exports = tsxRequire("./ElementsPlugin.ts", __filename).ElementsPlugin.init
