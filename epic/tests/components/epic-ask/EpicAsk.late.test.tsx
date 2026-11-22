import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { RootLoader } from "spell/ui/components/ui-root/RootLoader"
import { ElementFixture } from "spell/test-helpers/ElementFixture"

import { AnswerForm, type SentAnswer } from "spell/epic/answers"
import { CATALOG } from "spell/epic/components/__pack/epics.catalog"

// the options first, as a docs page loads them:  NEVER import `epic-ask`'s barrel up here
import "spell/epic/components/epic-choices"
import "spell/epic/components/epic-question"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-select"

/**
 * `<epic-ask>`'s family loading AFTER its options' (epic `epic-engine` I432):  each family loads by itself on the first
 * use of one of its tags (epic `solid-2-final` P7), so a question can still be pending as its options connect.
 * - A file of its own:  a tag is defined once a page, and here it must start pending.
 */

/** A plain question, a compact one, and a Feature Set's:  a pick with its Priority. */
const QUESTIONS =
  `<main>` +
  `<ui-section id="q1" label="Q1 · Which?"><epic-ask><epic-question><p>Which one?</p></epic-question><epic-choices>` +
  `<epic-option letter="A" title="Blue"><p>Calm.</p></epic-option><epic-option letter="B" title="Red"></epic-option>` +
  `</epic-choices></epic-ask></ui-section>` +
  `<ui-section id="q2" label="Q2 · How big?"><epic-ask compact><epic-choices>` +
  `<epic-option letter="S" title="Small"></epic-option><epic-option letter="L" title="Large"></epic-option>` +
  `</epic-choices></epic-ask></ui-section>` +
  `<ui-section id="s1" label="S1 · Now"><epic-ask compact no-chip name="s1f1" label="S1F1 · Share a link">` +
  `<epic-choices><epic-option letter="yes" title="Yes"></epic-option><epic-option letter="no" title="No">` +
  `</epic-option></epic-choices><epic-ask compact slot="then" name="s1f1-priority" label="Priority" off-for="no">` +
  `<epic-choices><epic-option letter="1" title="1 · First"></epic-option><epic-option letter="2" title="2 · Next">` +
  `</epic-option></epic-choices></epic-ask></epic-ask></ui-section>` +
  `</main>`

/** What the page posted to its (pretend) page server:  never the network. */
const posts: Record<string, unknown>[] = []

/** The page's questions, drawn once:  the late load happens once a page. */
let root: Element

beforeAll(async () => {
  AnswerForm.adopt(
    new AnswerForm({
      page: "/pages/details/late.html",
      server: { token: "token-1" },
      protocol: "http:",
      fetch: async (url, init) => {
        if (url === "/api/docs/details/answer" && init?.body) posts.push(JSON.parse(init.body as string))
        return new Response(JSON.stringify({ answer: posts.at(-1) ?? null }), {
          headers: { "content-type": "application/json" }
        })
      },
      storage: undefined
    })
  )
  // as the docs bundle does with the pack's catalog
  RootLoader.defineEarly({ "epic-ask": CATALOG["epic-ask"]! })
  root = document.createRange().createContextualFragment(QUESTIONS).firstElementChild!
  document.body.append(root)
  // the options draw while their question is pending (`settle()` would wait for it)
  await new Promise((resolve) => setTimeout(resolve, 50))
  await import("spell/epic/components/epic-ask")
  await ElementFixture.settle()
})

afterAll(() => {
  root.remove()
  AnswerForm.adopt(undefined)
})

/** Option `letter`'s Choose pill, in the question `key`. */
function pill(key: string, letter: string): HTMLButtonElement {
  return root.querySelector(`#${key} epic-option[letter="${letter}"]`)!.shadowRoot!.querySelector('[part~="tick"]')!
}

/** Pick `value` in the compact question `ask`'s select, as a click on an entry does. */
function pick(ask: string, value: string) {
  const select = root.querySelector(ask)!.shadowRoot!.querySelector("ui-select")!
  expect(select.getBoundingClientRect().width).toBeGreaterThan(0)
  select.dispatchEvent(new CustomEvent("ui-changed", { detail: { value }, bubbles: true, composed: true }))
}

describe("<epic-ask> whose family loads after its options'", () => {
  test("a card shows its Choose pill, and its question's options are a radio group", async () => {
    await expect.poll(() => pill("q1", "B")?.textContent?.trim()).toBe("Choose")
    expect(pill("q1", "B").getBoundingClientRect().width).toBeGreaterThan(0)
    const group = root.querySelector("#q1 epic-choices")!.shadowRoot!.querySelector('[role="radiogroup"]')
    expect(group?.getAttribute("aria-label")).toBe("Q1 · Which?")
  })

  test("a click picks, and Send carries it with the compact and Feature Set picks", async () => {
    await expect.poll(() => pill("q1", "B")).toBeTruthy()
    pill("q1", "B").click()
    pick("#q2 > epic-ask", "L")
    pick("#s1 > epic-ask", "yes")
    pick('#s1 epic-ask[slot="then"]', "2")
    await ElementFixture.settle()
    expect(pill("q1", "B").getAttribute("aria-checked")).toBe("true")
    expect(pill("q1", "B").textContent?.trim()).toBe("Chosen")

    await AnswerForm.forPage().send()
    const answers = (posts.at(-1) as SentAnswer | undefined)?.answers
    expect(answers?.q1?.picked).toEqual(["B"])
    expect(answers?.q2?.picked).toEqual(["L"])
    expect(answers?.s1f1?.picked).toEqual(["yes"])
    expect(answers?.["s1f1-priority"]?.picked).toEqual(["2"])
  })
})
