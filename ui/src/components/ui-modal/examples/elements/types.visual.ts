import { VisualOpen } from "spell-ui/test-helpers/VisualOpen"
import type { VisualHooks } from "spell-ui/test-helpers/test.types"

/**
 * Open states of `types.html` for `yarn test:visual`:  each modal shown.
 * - `viewport`:  a modal is centred in the top layer, not in the example's box.
 */
export default {
  states: {
    "open-standard": { open: (root) => VisualOpen.show(root, "#modal-types-standard"), capture: "viewport" },
    "open-basic": { open: (root) => VisualOpen.show(root, "#modal-types-basic"), capture: "viewport" }
  }
} satisfies VisualHooks
