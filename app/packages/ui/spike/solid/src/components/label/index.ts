/**
 * Barrel for the spike's label components -- also the `label` library entry measured in `REPORT.md`.
 * - SIDE EFFECT:  defines `<ui-label>` and `<ui-labels>`.
 */

import { UILabel } from "./UILabel"
import { UILabels } from "./UILabels"

UILabel.define()
UILabels.define()

export { UILabel, UILabels }
