import { VisualOpen } from "spell-ui/test-helpers/VisualOpen"
import type { VisualHooks } from "spell-ui/test-helpers/test.types"

/**
 * Open states of `types.html` for `yarn test:visual`:  the page dimmer shown.
 * - `viewport`:  a page dimmer is a modal `<dialog>` over the whole viewport.
 */
export default {
  states: {
    "open-page": { open: (root) => VisualOpen.show(root, "#dimmer-types-page"), capture: "viewport" }
  }
} satisfies VisualHooks
