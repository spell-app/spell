/**
 * `epic-step-output` family barrel:  defines `<epic-step-output>` (SIDE EFFECT) and exports its component,
 * `EpicStepOutput`, and `StepOutputs`, which puts one under each command of a manual test's steps.
 * - Defines the family it draws in its shadow root first:  `<epic-text-box>`.
 */
import "spell/epic/components/epic-text-box"

import { EpicStepOutput } from "./EpicStepOutput"
import { StepOutputs } from "./StepOutputs"

EpicStepOutput.define()

export { EpicStepOutput, StepOutputs }
