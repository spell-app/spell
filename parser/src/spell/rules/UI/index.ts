/**
 * The `UI` rule module:  user-facing I/O statements -- `print`, `notify`, `alert`, `warn`, `confirm`, `prompt`, `choose` --
 * `scroll to the top`, `open printing`, sounds and videos (naming one, `play`, `stop`, `pause`, `resume`, asking about one),
 * a page's tour (`start tour "x"`, `stop the tour`, `show step 3`, `go to the next step`, `go back a step`),
 * plus inline `css` string installation, and an app's widget defaults (`<ui-defaults>`).
 * - One rule class per file;  `UI.en.ts` registers them on `UI` (`UI.parser.ts`),
 *   and each other language's `UI.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./UI.parser"
export * from "./UI.shared"
export * from "./Print"
export * from "./EndPrintGroup"
export * from "./ScrollToTop"
export * from "./ShowDrawn"
export * from "./WithoutClosing"
export * from "./TheResult"
export * from "./AnswerWord"
export * from "./OpenPrinting"
export * from "./ShowDatesAs"
export * from "./MediaNameWords"
export * from "./MediaNamed"
export * from "./MediaTime"
export * from "./MediaSpeed"
export * from "./MediaVolume"
export * from "./DefineMedia"
export * from "./LoadSound"
export * from "./PlaySound"
export * from "./StopSound"
export * from "./StopAllMedia"
export * from "./StartTour"
export * from "./StopTour"
export * from "./ShowTourStep"
export * from "./MoveTourStep"
export * from "./MediaCall"
export * from "./MediaIs"
export * from "./MediaLength"
export * from "./Notify"
export * from "./Alert"
export * from "./Warn"
export * from "./Confirm"
export * from "./Prompt"
export * from "./Choose"
export * from "./CSSStyles"
export * from "./UIDefaults"
