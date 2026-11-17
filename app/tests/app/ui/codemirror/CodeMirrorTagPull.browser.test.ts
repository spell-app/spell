import { afterEach, describe, expect, test } from "vite-plus/test"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "spell/app/app/ui/codemirror/CodeMirrorBubbly"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

import "spell/app/app/components/spell-code/bubbly.css"

/**
 * A drawing's tags inside other tags, pulled toward the rail of the tag they're in (epic `language` I162;  Owen:  "pull
 * nested <html> 2px to the left"):  one-line and block tags alike, at every level, their rails and feet with them;
 * a drawing's outermost tags where they were.
 */
describe("a drawing's tag inside another tag", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.dom.parentElement?.remove()
    view?.destroy()
    view = undefined
  })

  /** Solitaire's drawing, cut down:  blocks and one-line tags two and three deep. */
  const DRAWING = `a "game" is a view
\tto draw it
\t\t<segment inverted>
\t\t\t<toolbar class="GameBar">
\t\t\t\t<text slot="title">Spell</>
\t\t\t\t<action "cheat" />
\t\t\t</>
\t\t</>
\t\t<container columns="7">
\t\t\t<stock-pile "stock" />
\t\t</container>
\t\t<context-menu>
\t\t\t<action "cheat" />
\t\t</context-menu>
`

  /** An editor of `text` in the bubbly look, drawn. */
  async function bubblyEditorOf(text: string): Promise<EditorView> {
    const host = document.body.appendChild(document.createElement("div"))
    host.style.cssText = "width: 800px; height: 600px"
    const state = EditorState.create({
      doc: text,
      extensions: [CodeMirrorSetup.extensions(), CodeMirrorBubbly.extension(() => undefined)]
    })
    view = new EditorView({ parent: host, state })
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(undefined))))
    return view
  }

  /** The `.cm-line` drawing the line starting (after its tabs) with `start`, the `nth` such. */
  function lineStarting(view: EditorView, start: string, nth = 0): HTMLElement {
    const lines = view.state.doc.toString().split("\n")
    const numbers = lines.flatMap((line, at) => (line.trimStart().startsWith(start) ? [at + 1] : []))
    const node = view.domAtPos(view.state.doc.line(numbers[nth]!).to).node
    return (node instanceof HTMLElement ? node : node.parentElement)!.closest<HTMLElement>(".cm-line")!
  }

  /** The left edge of the tag starting `line`:  a block's band, or a one-line tag. */
  function tagLeft(line: HTMLElement): number {
    return line.querySelector(".cmb-tag-band, .cmb-tag-pill, .cmb-tag-link")!.getBoundingClientRect().left
  }

  /** The left edge of the innermost rail `line` draws:  its `--cmb-rails`' first stripe, measured as a probe's width. */
  function innermostRailLeft(line: HTMLElement): number {
    const column = /transparent (calc\(.*?rail-left\)\))/.exec(line.style.getPropertyValue("--cmb-rails"))![1]!
    const probe = line.appendChild(document.createElement("span"))
    probe.style.cssText = `position: absolute; display: inline-block; height: 0; width: ${column}`
    const left = line.getBoundingClientRect().left + probe.getBoundingClientRect().width
    probe.remove()
    return left
  }

  test("one-line and block tags start as far from their parent's rail, a pull closer than a tab less the rail", async () => {
    const view = await bubblyEditorOf(DRAWING)
    const settings = getComputedStyle(view.dom)
    const [tab, rail, pull] = ["--cmb-indent", "--cmb-rail", "--cmb-tag-pull"].map((name) =>
      Number.parseFloat(settings.getPropertyValue(name))
    ) as [number, number, number]
    expect(pull).toBe(2)
    // what Owen measures:  the parent's rail's right edge to the child's left edge (3.44px;  5px and 6px before)
    const gap = tab - pull - rail
    for (const [parent, child, nth] of [
      ["<segment", "<toolbar", 0],
      ["<toolbar", "<text", 0],
      ["<toolbar", "<action", 0],
      ["<container", "<stock-pile", 0],
      ["<context-menu", "<action", 1]
    ] as const) {
      const parentRail = tagLeft(lineStarting(view, parent)) + rail
      expect(
        Math.abs(tagLeft(lineStarting(view, child, nth)) - parentRail - gap),
        `${parent} => ${child}`
      ).toBeLessThan(0.1)
    }
  })

  test("a nested block's rail and foot pulled with its band;  the outermost tags where they were", async () => {
    const view = await bubblyEditorOf(DRAWING)
    // `<toolbar>`'s rail, down its children's lines, at its band's left edge
    const toolbar = tagLeft(lineStarting(view, "<toolbar"))
    expect(Math.abs(innermostRailLeft(lineStarting(view, "<action")) - toolbar)).toBeLessThan(0.1)
    // its foot, in the row of feet under it, turning out of that rail
    const foot = view.dom.querySelector<HTMLElement>(".cmb-feet-row .cmb-tag-foot")!
    expect(
      Math.abs(
        Number.parseFloat(getComputedStyle(foot, "::before").left) +
          foot.closest(".cm-line")!.getBoundingClientRect().left -
          toolbar
      )
    ).toBeLessThan(0.1)
    // `<segment>`, in a Spell body:  not pulled, a tab in from its line's indent as a Spell band
    const segment = lineStarting(view, "<segment")
    expect(segment.classList.contains("cmb-tag-nested")).toBe(false)
    expect(lineStarting(view, "<toolbar").classList.contains("cmb-tag-nested")).toBe(true)
  })
})
