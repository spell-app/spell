import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { restoreEpicFolds } from "spell/epic/tools/_assets/spell-doc-helpers.js"

/** An epic page's blocks, folded as they come from the file:  the Overview, a section and the Log. */
function blocks() {
  const { document } = parseHTML(
    `<main><epic-overview id="overview"></epic-overview><epic-section id="decisions" kind="questions"></epic-section>` +
      `<epic-section id="log" kind="log"></epic-section></main>`
  )
  const all = Array.from(document.querySelectorAll("epic-overview, epic-section"))
  const open = () => all.filter((block) => block.hasAttribute("open")).map((block) => block.id)
  return { all, open }
}

// Owen, 2026-10-29 (epic `epic-engine` I155):  "epic log:  Should start out collapsed always"
describe("restoreEpicFolds():  the blocks the reader left open open again, but the Log", () => {
  test("a reload:  the saved folds open their blocks;  the Log, saved open, stays folded", () => {
    const { all, open } = blocks()
    restoreEpicFolds(all, { saved: { overview: false, decisions: true, log: false }, kept: undefined })
    expect(open()).toEqual(["overview"])
  })

  test("a live reload:  every block kept open opens, over the saved folds;  the Log stays folded", () => {
    const { all, open } = blocks()
    restoreEpicFolds(all, { saved: { decisions: true }, kept: { decisions: true, log: true } })
    expect(open()).toEqual(["decisions"])
  })
})
