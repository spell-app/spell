import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { AnswerForm, SEED_EMPTIED, type SentAnswer } from "spell/epic/answers"

import "spell/epic/components/epic-text-box"
// the boxes are `<ui-textarea grow>`s:  `<ui-root>` loads them on a page
import "spell/ui/components/ui-input"

afterEach(() => AnswerForm.adopt(undefined))

/** `box`'s `<textarea>`. */
function field(box: Element): HTMLTextAreaElement {
  return box.shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
}

/** Type `text` into `box`, as a keystroke does. */
async function type(box: Element, text: string) {
  field(box).value = text
  field(box).dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
  await ElementFixture.settle()
}

describe("<epic-text-box>", () => {
  test("a box of one line, its type's hint, growing with its text;  axe", async () => {
    const box = await ElementFixture.render(`<epic-text-box type="notes"></epic-text-box>`)
    expect(field(box).placeholder).toBe("Notes for Claude:  anything, any time")
    expect(field(box).getAttribute("aria-label")).toBe("Notes for Claude:  anything, any time")
    expect(field(box).rows).toBe(1)
    expect(getComputedStyle(field(box)).getPropertyValue("field-sizing")).toBe("content")
    await expectAccessible(box)
  })

  test("its own placeholder and label win;  a comment box by default", async () => {
    const box = await ElementFixture.render(
      `<epic-text-box placeholder="Comment on B" label="Comment on B · Red"></epic-text-box>`
    )
    expect([field(box).placeholder, field(box).getAttribute("aria-label")]).toEqual([
      "Comment on B",
      "Comment on B · Red"
    ])
  })

  test("grows to a third of the window;  `max-height` sets its own cap (a redirect note's 40vh)", async () => {
    const root = await ElementFixture.render(
      `<div><epic-text-box></epic-text-box><epic-text-box type="note" max-height="40vh"></epic-text-box></div>`
    )
    const [plain, capped] = Array.from(root.children)
    const cap = (box: Element) => Math.round(field(box).getBoundingClientRect().height)
    const tall = "line\n".repeat(200)
    for (const box of [plain!, capped!]) (box as HTMLElement & { value: string }).value = tall
    await ElementFixture.settle()
    expect([cap(plain!), cap(capped!)]).toEqual([Math.round(innerHeight * 0.33), Math.round(innerHeight * 0.4)])
  })

  test("part of the page's answer by its type:  notes, a comment by `for`, Other by `for`;  blank:  nothing", async () => {
    const root = await ElementFixture.render(
      `<div><epic-text-box type="notes"></epic-text-box><epic-text-box for="context"></epic-text-box>` +
        `<epic-text-box type="other" for="q1"></epic-text-box><epic-text-box for="q1-B"></epic-text-box></div>`
    )
    const [notes, context, other] = Array.from(root.children)
    await type(notes!, " fine ")
    await type(context!, "clear")
    await type(other!, "neither")
    expect(AnswerForm.forPage().gather()).toEqual({
      answers: { q1: { picked: [], other: "neither" } },
      comments: { context: "clear" },
      notes: "fine"
    })
    expect(context!.matches(":state(filled)")).toBe(true)
  })

  test("a notes box draws what the page KEPT (P18):  its old title, the text, a × that drops it;  axe", async () => {
    const form = new AnswerForm({ page: "/pages/details/x.html", fetch: vi.fn() as unknown as typeof fetch })
    AnswerForm.adopt(form)
    form.kept = [{ id: "q3", label: "Q3 · Gone", text: "picked B · Blue" }]
    const box = await ElementFixture.render(`<epic-text-box type="notes"></epic-text-box>`)
    const kept = box.shadowRoot!.querySelector<HTMLElement>('[part~="kept"]')!
    expect(kept.querySelector(".kept-head")!.textContent).toBe("Kept from before the page changed")
    const label = kept.querySelector<HTMLElement>(".kept-label")!
    expect([label.textContent, label.dataset.tooltip, kept.querySelector(".kept-text")!.textContent]).toEqual([
      "Q3 · Gone",
      undefined,
      "picked B · Blue"
    ])
    await expectAccessible(box)
    // a comment box never draws it
    const comment = await ElementFixture.render(`<epic-text-box for="context"></epic-text-box>`)
    expect(comment.shadowRoot!.querySelector('[part~="kept"]')).toBeNull()
    kept.querySelector<HTMLElement>(".kept-drop")!.click()
    await ElementFixture.settle()
    expect([form.kept, box.shadowRoot!.querySelector('[part~="kept"]')]).toEqual([[], null])
  })

  test("its id, for a draft:  the notes, a comment's section under its title", async () => {
    const root = await ElementFixture.render(
      `<div><ui-section id="context" label="1. Context"><epic-text-box for="context"></epic-text-box></ui-section>` +
        `<epic-text-box type="notes"></epic-text-box><epic-text-box type="other" for="q1"></epic-text-box></div>`
    )
    expect(root.querySelectorAll("epic-text-box")).toHaveLength(3)
    expect(AnswerForm.forPage().labels()).toEqual({ context: "1. Context", notes: "Notes" })
  })

  test("`value`, as a `<textarea>`'s:  read and set;  an answer sent comes back into it", async () => {
    const box = (await ElementFixture.render(`<epic-text-box for="context"></epic-text-box>`)) as HTMLElement & {
      value: string
    }
    box.value = "set"
    await ElementFixture.settle()
    expect([box.value, field(box).value]).toEqual(["set", "set"])
    const feedback = await ElementFixture.render(`<epic-text-box type="feedback"></epic-text-box>`)
    await type(feedback, "mine")
    // a feedback box is its bar's:  never the details page's answer
    expect(AnswerForm.forPage().gather().comments).toEqual({ context: "set" })
  })

  describe("a SEED (epic `ast-markup`)", () => {
    /** A seeded comment box for `context`:  its seed markup with `<`, quotes and braces, unescaped. */
    const SEEDED =
      `<epic-text-box for="context" code><script type="text/plain">\n` +
      `      <ui-button label="Save {name}" on-click="save">\n        <b>go</b>\n      </ui-button>\n` +
      `    </script></epic-text-box>`
    const SEED = `<ui-button label="Save {name}" on-click="save">\n  <b>go</b>\n</ui-button>`

    test("starts with its seed, dedented;  left as it is, it sends nothing", async () => {
      const box = await ElementFixture.render(SEEDED)
      expect(field(box).value).toBe(SEED)
      expect(box.matches(":state(edited)")).toBe(false)
      expect(AnswerForm.forPage().gather().comments).toEqual({})
      expect(AnswerForm.forPage().isEmpty).toBe(true)
    })

    test("edited:  the person's text is sent, a reset puts the seed back;  emptied:  says so;  axe", async () => {
      const box = await ElementFixture.render(SEEDED)
      await type(box, `${SEED}\n<ui-label>new</ui-label>`)
      expect(AnswerForm.forPage().gather().comments).toEqual({ context: `${SEED}\n<ui-label>new</ui-label>` })
      expect(box.matches(":state(edited)")).toBe(true)
      const reset = box.shadowRoot!.querySelector<HTMLElement>('[part~="reset"]')!
      expect(reset.textContent).toBe("Back to the suggestion")
      await expectAccessible(box)
      reset.click()
      await ElementFixture.settle()
      expect([field(box).value, AnswerForm.forPage().gather().comments]).toEqual([SEED, {}])
      expect(box.shadowRoot!.querySelector('[part~="reset"]')).toBeNull()
      await type(box, "  ")
      expect(AnswerForm.forPage().gather().comments).toEqual({ context: SEED_EMPTIED })
    })

    test("an answer sent comes back:  the person's text, the seed for none, empty for emptied", async () => {
      const box = await ElementFixture.render(SEEDED)
      const form = AnswerForm.forPage()
      const sent = (comments: Record<string, string>) =>
        ({ page: "/x.html", answered: "", changes: 0, answers: {}, notes: "", comments }) as SentAnswer
      const component = (box as HTMLElement & { component: { showAnswer(answer: SentAnswer): void } }).component
      const shown = async (answer: SentAnswer) => {
        component.showAnswer(answer)
        await ElementFixture.settle()
        return field(box).value
      }
      expect(await shown(sent({ context: "mine" }))).toBe("mine")
      expect(await shown(sent({}))).toBe(SEED)
      expect(await shown(sent({ context: SEED_EMPTIED }))).toBe("")
      expect(form.gather().comments).toEqual({ context: SEED_EMPTIED })
    })

    test("`code`:  monospace, no wrapping;  Tab indents, Shift-Tab takes it back, after Escape Tab leaves", async () => {
      const box = await ElementFixture.render(SEEDED)
      const control = field(box)
      const style = getComputedStyle(control)
      expect([style.whiteSpace, style.fontFamily.includes("mono")]).toEqual(["pre", true])
      control.focus()
      control.setSelectionRange(0, 0)
      const key = (init: KeyboardEventInit) => {
        const event = new KeyboardEvent("keydown", { bubbles: true, composed: true, cancelable: true, ...init })
        control.dispatchEvent(event)
        return event.defaultPrevented
      }
      expect(key({ key: "Tab" })).toBe(true)
      await ElementFixture.settle()
      expect(control.value.startsWith(`  ${SEED.slice(0, 10)}`)).toBe(true)
      control.setSelectionRange(0, control.value.length)
      key({ key: "Tab", shiftKey: true })
      await ElementFixture.settle()
      expect(control.value).toBe(
        SEED.split("\n")
          .map((line) => line.replace(/^ {1,2}/, ""))
          .join("\n")
      )
      key({ key: "Escape" })
      expect(key({ key: "Tab" })).toBe(false)
    })

    test("a seed that arrives after the box was built (a router, a rewrite) is taken, unless it was typed in", async () => {
      const box = await ElementFixture.render(`<epic-text-box for="context"></epic-text-box>`)
      const seed = (text: string) => {
        const script = document.createElement("script")
        script.type = "text/plain"
        script.textContent = text
        box.replaceChildren(script)
      }
      seed("first")
      await ElementFixture.settle()
      expect(field(box).value).toBe("first")
      seed("second")
      await ElementFixture.settle()
      expect(field(box).value).toBe("second")
      await type(box, "mine")
      seed("third")
      await ElementFixture.settle()
      expect([field(box).value, AnswerForm.forPage().gather().comments]).toEqual(["mine", { context: "mine" }])
    })

    test("a plain box takes a seed too;  a box without `code` keeps wrapping", async () => {
      const box = await ElementFixture.render(
        `<epic-text-box type="notes"><script type="text/plain">Looks right to me.</script></epic-text-box>`
      )
      expect([field(box).value, getComputedStyle(field(box)).whiteSpace]).toEqual(["Looks right to me.", "pre-wrap"])
      expect(AnswerForm.forPage().gather().notes).toBe("")
      await type(box, "Looks right.")
      expect(AnswerForm.forPage().gather().notes).toBe("Looks right.")
    })
  })
})
