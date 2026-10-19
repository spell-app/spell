/**
 * What `<epic-test-run>`'s files share, and what `<epic-page>` and `<epic-section>` need of it (epic `epic-engine` P4):
 * the four answers' looks, the run's events and address, its JSX tag.
 * - Data and types only:  nothing here runs.
 */
import type { TestResult } from "$/epics/review"
import type { UIJSXAttributes } from "$/epics/components/epic-page/EpicPage.types"

////////////////
// ## The answers
////////////////

/** How one of the four answers looks and is reached:  its icon, colour (plan-doc.md, "Colours") and key. */
export type AnswerLook = {
  result: TestResult
  icon: string
  color: "green" | "red" | "grey" | "yellow"
  key: string
  label: TestResult
  tip: `${TestResult}Tip`
  count: `count${Capitalize<TestResult>}`
}

/**
 * The four answers, in their order:  Passed green (done), Failed red (needs Owen's words), Skip grey (no longer
 * relevant), Not now yellow (still open).  Their keys are the letters P / F / S / N.
 * - Failed's bug, Skip's x:  the x is "skip it" everywhere (the note box's, a comment thread's)
 */
export const ANSWER_LOOKS: readonly AnswerLook[] = [
  {
    result: "passed",
    icon: "check",
    color: "green",
    key: "p",
    label: "passed",
    tip: "passedTip",
    count: "countPassed"
  },
  { result: "failed", icon: "bug", color: "red", key: "f", label: "failed", tip: "failedTip", count: "countFailed" },
  { result: "skip", icon: "xmark", color: "grey", key: "s", label: "skip", tip: "skipTip", count: "countSkip" },
  {
    result: "notnow",
    icon: "clock",
    color: "yellow",
    key: "n",
    label: "notnow",
    tip: "notnowTip",
    count: "countNotnow"
  }
]

////////////////
// ## The run and the page
////////////////

/**
 * The page address's query that starts a run:  `?test=1`;  one epic of a run across every epic (`epic test --all`):
 * `?test=1&all=1`, or `?test=all`.
 */
export const TEST_QUERY = "test"
export const ALL_QUERY = "all"
export const TEST_ALL = "all"

/** The section's Start testing, pressed:  `<epic-page>` starts the run.  Bubbles out of the section's shadow root. */
export const TEST_START = "epic-test-start"

/** Owen left the run (Esc, Done testing):  `<epic-page>` shows its blocks again. */
export const TEST_DONE = "epic-test-done"

/** A test's id:  `v3`. */
export const TEST_ID = /^v\d+$/i

/** The tests on a page:  its To test section's items. */
export const TESTS_SELECTOR = 'epic-section[kind="tests"] epic-item'

/** The classes a Step's action links carry (`<a class="epic-test-action" href>`):  drawn as buttons in the run. */
export const ACTION_LINK = "a.epic-test-action"

/**
 * A test's fields, as the run shows them (`TestRun.fieldsOf()`):  COPIES of the item's light DOM, so the doc is never
 * touched.
 * - `step`:  its Step field's content, its action links taken out;  an older test's prose
 * - `actions`:  the Step's action links, drawn as buttons
 * - `shots`:  the Example's images, drawn as zoomable thumbnails;  `example`:  the rest of it
 * - `loading`:  its part hasn't arrived yet
 */
export type TestFields = {
  step: Node[]
  actions: { href: string; text: string; target: string }[]
  should: Node[]
  example: Node[]
  shots: { src: string; alt: string }[]
  ifNot: Node[]
  loading: boolean
}

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-test-run": UIJSXAttributes
      "epic-text-box": UIJSXAttributes
      "ui-progress": UIJSXAttributes
      "ui-modal": UIJSXAttributes
    }
  }
}
