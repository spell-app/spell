/****************
 * ### `BellSteps`
 * BELLS & WHISTLES (epic `epic-engine` P86):  the steps epic work runs by itself that cost tokens or time, ONE table,
 * and the ONE rule for whether a step runs now.
 * - Owen, 2026-11-26:  "There are a lot of processes that you run automatically during epic work ... These can all burn
 *   tokens, and somebody doesn't know they are happening ... let's make a modal in the epic doc gear menu to turn them
 *   on and off."
 * - Each step:  its key (`designReview`), its group, its token cost and how much you lose without it.
 *   - its title and sentence are words people read:  `<epic-bells>`' vocabulary, under the same key
 * - The person's own switches, `bells.<key>`, and the TOKEN BURN slider, `bells.burn`, are in the epic settings
 *   (`LayeredSettings`, its `bells` group);  `Bells` (`spell/epic/config/Bells`) reads them for node, the dialog through
 *   the page server.
 * - The slider is for NOW (judgement call J390):  below High it holds off what isn't worth its cost at that level;
 *   a switch flipped while it's down is kept apart (`bells.burnFlips`), and the slider then reads Custom;  moving the
 *   slider clears those flips, and at High your own switches are back.
 * - Pure, node-safe at import:  the dialog, the node readers and the settings reader all import it;  plain `node`
 *   loads it by its own name (`spell/epic/bells/BellSteps.ts`).
 ****************/
export class BellSteps {
  /** Every step, in the dialog's order:  by group, as the goal's table lists them. */
  static readonly STEPS: readonly BellStep[] = [
    // planning
    { key: "reuseCheckPlan", group: "planning", cost: "medium", importance: "useful" },
    { key: "reuseCheckPhases", group: "planning", cost: "high", importance: "useful" },
    { key: "pageEditHelper", group: "planning", cost: "medium", importance: "useful" },
    // building
    { key: "helpersBuild", group: "building", cost: "high", importance: "mustHave" },
    { key: "restartHelpers", group: "building", cost: "medium", importance: "mustHave" },
    { key: "finalTidy", group: "building", cost: "medium", importance: "useful" },
    // reviewing
    { key: "designReview", group: "reviewing", cost: "high", importance: "useful" },
    { key: "planCheck", group: "reviewing", cost: "medium", importance: "useful" },
    { key: "alignmentCheck", group: "reviewing", cost: "medium", importance: "niceToHave" },
    { key: "handChecksFirst", group: "reviewing", cost: "medium", importance: "useful" },
    // checking the words
    { key: "titleCheck", group: "words", cost: "low", importance: "useful" },
    { key: "plainWordsCheck", group: "words", cost: "low", importance: "useful" },
    { key: "itemScoring", group: "words", cost: "low", importance: "niceToHave" },
    { key: "changesInBold", group: "words", cost: "low", importance: "mustHave" },
    // testing
    { key: "checksBeforeMerge", group: "testing", cost: "low", importance: "mustHave" },
    { key: "fullTestRun", group: "testing", cost: "medium", importance: "useful" },
    { key: "speedTest", group: "testing", cost: "low", importance: "useful" },
    { key: "editorAddOns", group: "testing", cost: "low", importance: "mustHave" },
    { key: "editorWarnings", group: "testing", cost: "medium", importance: "niceToHave" },
    { key: "stopStuckTests", group: "testing", cost: "timesaver", importance: "mustHave" },
    // docs
    { key: "plainPhaseNotes", group: "docs", cost: "high", importance: "niceToHave" },
    { key: "epicGuide", group: "docs", cost: "medium", importance: "useful" },
    { key: "fixReadmes", group: "docs", cost: "high", importance: "niceToHave" },
    { key: "checkGuides", group: "docs", cost: "low", importance: "niceToHave" },
    { key: "changelog", group: "docs", cost: "low", importance: "mustHave" },
    // adding work to your project
    { key: "mergeEachHelper", group: "adding", cost: "low", importance: "mustHave" },
    { key: "mergeMain", group: "adding", cost: "low", importance: "mustHave" },
    { key: "remakeBuiltFiles", group: "adding", cost: "low", importance: "mustHave" },
    { key: "renameOldNames", group: "adding", cost: "low", importance: "useful" },
    { key: "installPackages", group: "adding", cost: "low", importance: "mustHave" },
    { key: "keepOwnEdits", group: "adding", cost: "low", importance: "mustHave" },
    // tidying
    { key: "savePages", group: "tidying", cost: "low", importance: "mustHave" },
    { key: "clearStuckItems", group: "tidying", cost: "low", importance: "useful" },
    { key: "freshHint", group: "tidying", cost: "timesaver", importance: "mustHave" },
    // listening and waking
    { key: "itemRequests", group: "listening", cost: "medium", importance: "mustHave" },
    { key: "promptAck", group: "listening", cost: "low", importance: "niceToHave" },
    // Auto Send's choice is the page's own, kept in this browser (`SendCountdown`):  no settings key, no slider
    { key: "autoSend", group: "listening", cost: "medium", importance: "useful", inBrowser: true },
    { key: "openChat", group: "listening", cost: "medium", importance: "mustHave" },
    { key: "wakeQuietChat", group: "listening", cost: "medium", importance: "mustHave" },
    { key: "passSendToBusy", group: "listening", cost: "low", importance: "mustHave" },
    { key: "watchAgentNotes", group: "listening", cost: "low", importance: "useful" },
    // background programs
    { key: "watchSends", group: "background", cost: "low", importance: "mustHave" },
    { key: "refreshPages", group: "background", cost: "low", importance: "mustHave" },
    { key: "closeLeftovers", group: "background", cost: "timesaver", importance: "mustHave" },
    { key: "startNotices", group: "background", cost: "low", importance: "useful" }
  ]

  /** The groups, in the dialog's order. */
  static readonly GROUPS: readonly BellGroup[] = [
    "planning",
    "building",
    "reviewing",
    "words",
    "testing",
    "docs",
    "adding",
    "tidying",
    "listening",
    "background"
  ]

  /** The slider's stops, lowest first. */
  static readonly BURN_LEVELS: readonly BurnLevel[] = ["low", "medium", "high"]

  /** The steps the settings keep a switch for:  every one but those kept in the browser (Auto Send). */
  static get SETTINGS_STEPS(): readonly BellStep[] {
    return BellSteps.STEPS.filter((step) => !step.inBrowser)
  }

  /** Step `key`, or `undefined` for a key the table hasn't got. */
  static stepOf(key: string): BellStep | undefined {
    return BellSteps.STEPS.find((step) => step.key === key)
  }

  /** Is `level` a slider stop? */
  static isBurnLevel(level: unknown): level is BurnLevel {
    return BellSteps.BURN_LEVELS.includes(level as BurnLevel)
  }

  /** Does the slider at `level` let step `step` run, your own switch aside?  High lets everything run. */
  static burnAllows(step: BellStep, level: BurnLevel): boolean {
    if (level === "high" || step.cost === "timesaver") return true
    if (level === "low") return step.cost === "low" && step.importance === "mustHave"
    // medium
    if (step.cost === "low") return true
    if (step.cost === "medium") return step.importance !== "niceToHave"
    return step.importance === "mustHave"
  }

  /**
   * Whether step `key` runs now, by the settings `bells`, and why not:  the ONE rule every reader asks.
   * - a flip made while the slider is down wins;  else your own switch, and the slider at its level
   * - a key the table hasn't got, or Auto Send's (the browser's):  on
   */
  static stateOf(bells: BellsValues, key: string): BellState {
    const step = BellSteps.stepOf(key)
    if (!step || step.inBrowser) return { on: true }
    const flip = bells.burnFlips[key]
    if (bells.burn !== "high" && typeof flip === "boolean") return flip ? { on: true } : { on: false, why: "flipped" }
    if (bells[key] === false) return { on: false, why: "switch" }
    return BellSteps.burnAllows(step, bells.burn) ? { on: true } : { on: false, why: "burn" }
  }

  /** What the slider reads:  its level, or `custom` once a flip has left it below High. */
  static burnShown(bells: BellsValues): BurnLevel | "custom" {
    return bells.burn !== "high" && Object.keys(bells.burnFlips).length > 0 ? "custom" : bells.burn
  }

  /**
   * `values` with step `key` switched `on`, as a flip of the dialog's or `epic settings bells.<key>`:  your own
   * switch while the slider is at High;  below it, a flip kept apart (`burnFlips`), which shows the slider as Custom.
   * - a new object:  `values` is left as it was
   */
  static withSwitch(values: BellsValues, key: string, on: boolean): BellsValues {
    if (values.burn === "high") return { ...values, [key]: on }
    return { ...values, burnFlips: { ...values.burnFlips, [key]: on } }
  }

  /** `values` with the slider at `level`, the flips made while it was down cleared (judgement call J390). */
  static withBurn(values: BellsValues, level: BurnLevel): BellsValues {
    return { ...values, burn: level, burnFlips: {} }
  }

  /** The settings' `bells` group as the kit's file has it:  the slider at High, no flips, every switch on. */
  static defaults(): BellsValues {
    const values: BellsValues = { burn: "high", burnFlips: {} }
    for (const step of BellSteps.SETTINGS_STEPS) values[step.key] = true
    return values
  }
}

/** What a step is for:  its section in the dialog. */
export type BellGroup =
  | "planning"
  | "building"
  | "reviewing"
  | "words"
  | "testing"
  | "docs"
  | "adding"
  | "tidying"
  | "listening"
  | "background"

/** Roughly how much of your Claude use a step takes;  `timesaver` saves more than it costs. */
export type BellCost = "high" | "medium" | "low" | "timesaver"

/** How much you lose without it. */
export type BellImportance = "mustHave" | "useful" | "niceToHave"

/** The Token burn slider's stops. */
export type BurnLevel = "low" | "medium" | "high"

/** One step of the table. */
export type BellStep = {
  /** its key:  `bells.<key>` in the settings, `<key>` and `<key>Sentence` in the dialog's words */
  key: string
  /** its section */
  group: BellGroup
  /** its token cost */
  cost: BellCost
  /** how much you lose without it */
  importance: BellImportance
  /** its choice is kept in the browser, not the settings (Auto Send):  the slider leaves it alone */
  inBrowser?: true
}

/**
 * The settings' `bells` group, as merged.
 * - `burn`:  the slider
 * - `burnFlips`:  switches flipped while the slider was down, by key;  cleared by a move of the slider
 * - every other key:  a step's own switch
 */
export type BellsValues = {
  /** the Token burn slider */
  burn: BurnLevel
  /** flips made while the slider was below High */
  burnFlips: Record<string, boolean>
} & { [key: string]: boolean | BurnLevel | Record<string, boolean> }

/**
 * Whether a step runs now.
 * - `why`, when off:  `switch` (your own), `burn` (the slider holds it off), `flipped` (flipped while the slider is down)
 */
export type BellState = { on: true; why?: undefined } | { on: false; why: "switch" | "burn" | "flipped" }

/** What the dialog and `epic settings bells` show. */
export type BellsView = {
  /** the slider's level */
  burn: BurnLevel
  /** what the slider reads:  its level, or `custom` */
  shown: BurnLevel | "custom"
  /** each step:  your own switch, whether it runs now, and why not */
  steps: BellsViewStep[]
}

/** One step in a `BellsView`. */
export type BellsViewStep = BellState & {
  /** its key */
  key: string
  /** your own switch, the one the slider at High obeys */
  own: boolean
}
