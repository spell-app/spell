/**
 * Barrel + side-effect entry for the spike's container:  defines `<ui-container>`.
 */

import { UIContainer } from "./UIContainer"

export { UIContainer }

// SIDE EFFECT:  registration under the vocabulary tag
UIContainer.define()
