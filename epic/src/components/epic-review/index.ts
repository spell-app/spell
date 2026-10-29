/**
 * `epic-review` family barrel:  defines `<epic-review>` and `<epic-stage-button>` (SIDE EFFECT) and exports their
 * components, `EpicReview` and `EpicStageButton`:  the review controls, and the stage's Accept (epic `epic-engine` I180).
 */
import { EpicReview } from "./EpicReview"
import { EpicStageButton } from "./EpicStageButton"

EpicReview.define()
EpicStageButton.define()

export { EpicReview, EpicStageButton }
