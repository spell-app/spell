/**
 * Barrel + side-effect entry for the spike's label family:  defines `<ui-label>` and `<ui-labels>`.
 * - NOTE: no `<ui-detail>`:  it's a content part (`../parts`);  a page using it imports the parts entry.
 */

import { UILabel } from "./UILabel"
import { UILabels } from "./UILabels"

export { UILabel, UILabels }

// SIDE EFFECT:  registration under the vocabulary tags
UILabel.define()
UILabels.define()
