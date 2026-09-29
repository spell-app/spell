import axe from "axe-core"
import { expect } from "vitest"

/**
 * Accessibility assertions via `axe-core`, run against live, rendered elements.
 * - Checks the element's subtree INCLUDING open shadow roots -- axe walks the flat tree.
 */
export class A11y {
  /**
   * Run axe on `element` and fail with a readable list of violations if there are any.
   * - Failure lists each violation's rule id, impact, help text and offending node selectors,
   *   so a test failure says what to fix without re-running axe by hand.
   * - Pass `options` to tweak rules, e.g. `{ rules: { "color-contrast": { enabled: false } } }` --
   *   say why in a comment where you do.
   * - Returns the full axe result, for tests that want to inspect passes / incompletes.
   */
  static async check(element: Element, options: axe.RunOptions = {}): Promise<axe.AxeResults> {
    const results = await axe.run(element, { resultTypes: ["violations"], ...options })
    expect(results.violations.length, A11y.format(results.violations)).toBe(0)
    return results
  }

  /** Human-readable summary of `violations`, one block per rule. */
  static format(violations: axe.Result[]) {
    if (!violations.length) return "no accessibility violations"
    const lines = violations.map((violation) => {
      const nodes = violation.nodes.map((node) => `    - ${node.target.join(" >>> ")}: ${node.failureSummary ?? ""}`)
      return [
        `  [${violation.impact ?? "?"}] ${violation.id}: ${violation.help} (${violation.helpUrl})`,
        ...nodes
      ].join("\n")
    })
    return `${violations.length} accessibility violation(s):\n${lines.join("\n")}`
  }
}

/** Shorthand for `A11y.check(element)`. */
export function expectAccessible(element: Element, options?: axe.RunOptions) {
  return A11y.check(element, options)
}
