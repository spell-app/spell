/**
 * Step 6 of the custom elements guide's teaching element:  the family barrel, which DEFINES `<ui-counter>`.
 * - `UICounter.define()` makes the tag's DOM element class and registers it with the browser
 *   (DOM API `customElements.define()`):  every `<ui-counter>` already in the page upgrades at once.
 * - SIDE EFFECT:  importing it defines the tag.
 */

import { UICounter } from "./UICounter"

UICounter.define()

export { UICounter }
