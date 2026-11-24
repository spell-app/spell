import { describe, expect, it, onTestFinished, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import type { DOMInputElement } from "spell/ui/components/ui-input/UIInput"
import type { DOMFormControl } from "spell/ui/elements"
import { expectAccessible } from "spell/test-helpers/A11y"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Alignment } from "spell/test-helpers/Alignment"

import "spell/ui/components/ui-input"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/ui/components/ui-modal"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/ui-input/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** A text control's DOM element, with its properties. */
type Input = DOMFormControl & { value: string; rules: unknown; type: string; disabled: boolean }

/** Render one control;  returns the DOM element, its root and its native control. */
async function input(html: string) {
  const host = await ElementFixture.render<Input>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=input]")!
  const control = root.querySelector<HTMLInputElement>("[part~=control]")!
  return { host, root, control }
}

/** Collect `detail`s of `name` events. */
function record(host: Element, name: string) {
  const details: { value: string; originalEvent?: Event }[] = []
  host.addEventListener(name, (event) => details.push((event as CustomEvent).detail))
  return details
}

////////////////
// ## Classes
////////////////

describe("<ui-input> classes", () => {
  it.each([
    ["", "ui input"],
    ['size="small"', "ui small input"],
    ['size="medium"', "ui input"],
    ['state="error"', "ui error input"],
    ['color="teal" type="file"', "ui teal file input"],
    ['appearance="transparent" fluid inverted', "ui fluid inverted transparent input"],
    ['fluid="yes"', "ui fluid input"],
    ["disabled", "ui disabled input"],
    ['icon="search"', "ui icon input"],
    ['icon="search" icon-position="left"', "ui left icon input left-icon"],
    ["loading", "ui loading icon input"],
    ['label="http://"', "ui labeled input"],
    ['labeled="right" label="kg"', "ui right labeled input right-labeled"],
    ['labeled="corner" label="asterisk"', "ui corner labeled input corner-labeled"],
    [
      'labeled="left corner" label="asterisk" icon="user" icon-position="left"',
      "ui left icon left corner labeled input corner-labeled left-corner left-corner-labeled left-icon"
    ],
    ["action", "ui action input"],
    ['action="left"', "ui left action input left-action"]
  ])("<ui-input %s>", async (attributes, classes) => {
    const { root, control } = await input(`<ui-input ${attributes} aria-label="Field"></ui-input>`)
    expect(root.localName).toBe("div")
    expect(root.className).toBe(classes)
    expect(control.localName).toBe("input")
  })

  it("adds `action` / `labeled` for slotted content without the attribute", async () => {
    const { root } = await input(`<ui-input aria-label="Search">
      <span slot="label">$</span><ui-button slot="action">Go</ui-button>
    </ui-input>`)
    expect(root.className).toBe("ui labeled action input")
  })

  it("renders the contract order:  label, control, icon;  action after, left action before", async () => {
    const { root } = await input(`<ui-input label="http://" icon="search" aria-label="Site">
      <ui-button slot="action">Go</ui-button></ui-input>`)
    const order = [...root.children].map((child) => child.getAttribute("part") ?? child.localName)
    expect(order).toEqual(["label", "control", "icon", "slot"])
    expect(root.querySelector("[part~=label]")!.className).toBe("ui label")
    await expect.poll(() => root.querySelector("[part~=icon] svg")).not.toBeNull()
    const { root: left } = await input(
      `<ui-input action="left" aria-label="x"><ui-button slot="action">Go</ui-button></ui-input>`
    )
    expect([...left.children].map((child) => child.localName)).toEqual(["slot", "input"])
  })

  it("draws a corner label from an icon name, hidden from assistive tech", async () => {
    const { root } = await input(`<ui-input labeled="corner" label="asterisk" aria-label="x"></ui-input>`)
    const corner = root.querySelector<HTMLElement>("[part~=label]")!
    expect(corner.className).toBe("ui corner label")
    expect(corner.getAttribute("aria-hidden")).toBe("true")
    await expect.poll(() => corner.querySelector(".icon svg")).not.toBeNull()
  })

  it("passes type and constraints to the native control", async () => {
    const { control, host } = await input(
      `<ui-input type="number" min="1" max="9" step="2" required placeholder="Qty" autocomplete="off"></ui-input>`
    )
    expect(control.type).toBe("number")
    expect([control.min, control.max, control.step, control.required]).toEqual(["1", "9", "2", true])
    expect(control.placeholder).toBe("Qty")
    expect(control.getAttribute("autocomplete")).toBe("off")
    expect(host.type).toBe("number")
  })

  it("sets host states:  disabled, fluid, loading", async () => {
    const { host } = await input(`<ui-input disabled fluid loading aria-label="x"></ui-input>`)
    expect(host.matches(":state(disabled)")).toBe(true)
    expect(host.matches(":state(fluid)")).toBe(true)
    expect(host.matches(":state(loading)")).toBe(true)
  })
})

////////////////
// ## Value
////////////////

describe("<ui-input> value", () => {
  it("starts from the attribute;  the property is live and never reflects", async () => {
    const { host, control } = await input(`<ui-input value="Ada" aria-label="Name"></ui-input>`)
    expect(control.value).toBe("Ada")
    expect(host.value).toBe("Ada")
    host.value = "Grace"
    await ElementFixture.tick()
    expect(control.value).toBe("Grace")
    expect(host.getAttribute("value")).toBe("Ada")
  })

  it('`type="percent"`:  a number field showing the fraction as a percent, with a % label (epic `language` P34)', async () => {
    const { host, control, root } = await input(`<ui-input type="percent" value="0.18" aria-label="Tip"></ui-input>`)
    expect(control.type).toBe("number")
    expect(control.value).toBe("18")
    expect(root.querySelector("[part~=label]")?.textContent).toBe("%")
    host.value = "0.07"
    await ElementFixture.tick()
    expect(control.value).toBe("7")
    await userEvent.clear(control)
    await userEvent.type(control, "20")
    expect(host.value).toBe("0.2")
  })

  it("typing dispatches ui-input per keystroke, then ui-changed on commit", async () => {
    const { host, control } = await input(`<ui-input aria-label="Name"></ui-input>`)
    const inputs = record(host, "ui-typed")
    const changes = record(host, "ui-changed")
    await userEvent.type(control, "Ada")
    expect(inputs.map((detail) => detail.value)).toEqual(["A", "Ad", "Ada"])
    expect(inputs[0]!.originalEvent).toBeInstanceOf(Event)
    expect(host.value).toBe("Ada")
    control.blur()
    expect(changes).toEqual([expect.objectContaining({ value: "Ada" })])
  })

  it("keeps the host's value when a ui-input handler re-sets it", async () => {
    const { host, control } = await input(`<ui-input value="x" aria-label="Name"></ui-input>`)
    host.addEventListener("ui-typed", () => (host.value = "x"))
    await userEvent.type(control, "y")
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(host.value).toBe("x")
    expect(control.value).toBe("x")
  })

  it("follows a handler that transforms the value", async () => {
    const { host, control } = await input(`<ui-input aria-label="Code"></ui-input>`)
    host.addEventListener("ui-typed", (event) => (host.value = (event as CustomEvent).detail.value.toUpperCase()))
    await userEvent.type(control, "ab")
    await ElementFixture.tick()
    expect(host.value).toBe("AB")
    expect(control.value).toBe("AB")
  })
})

////////////////
// ## Forms
////////////////

describe("<ui-input> forms", () => {
  it("submits its value, resets to the attribute, skips a nameless field", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <ui-input name="first" value="Ada" aria-label="First"></ui-input>
      <ui-input value="none" aria-label="Unnamed"></ui-input>
      <ui-textarea name="bio" value="Hi" aria-label="Bio"></ui-textarea>
    </form>`)
    const [first] = form.querySelectorAll<Input>("ui-input")
    expect([...new FormData(form)]).toEqual([
      ["first", "Ada"],
      ["bio", "Hi"]
    ])
    first!.value = "Grace"
    await ElementFixture.tick()
    expect(new FormData(form).get("first")).toBe("Grace")
    form.reset()
    await ElementFixture.tick()
    expect(first!.value).toBe("Ada")
    expect(new FormData(form).get("first")).toBe("Ada")
  })

  it("is left out when disabled or inside a disabled fieldset;  readonly still submits", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <fieldset disabled><ui-input name="a" value="1" aria-label="A"></ui-input></fieldset>
      <ui-input name="b" value="2" disabled aria-label="B"></ui-input>
      <ui-input name="c" value="3" readonly aria-label="C"></ui-input>
    </form>`)
    await ElementFixture.tick()
    expect([...new FormData(form)]).toEqual([["c", "3"]])
    const inFieldset = form.querySelector<Input>("ui-input")!
    const control = inFieldset.shadowRoot!.querySelector("input")!
    expect(control.disabled).toBe(true)
    expect(inFieldset.shadowRoot!.querySelector("[part~=input]")!.classList.contains("disabled")).toBe(true)
  })

  it("submits chosen files as File entries", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><ui-input type="file" name="upload" multiple aria-label="Upload"></ui-input></form>`
    )
    const host = form.querySelector<Input>("ui-input")!
    const control = host.shadowRoot!.querySelector("input")!
    const transfer = new DataTransfer()
    transfer.items.add(new File(["a"], "a.txt", { type: "text/plain" }))
    transfer.items.add(new File(["b"], "b.txt", { type: "text/plain" }))
    control.files = transfer.files
    control.dispatchEvent(new Event("change", { bubbles: true }))
    await ElementFixture.tick()
    const files = new FormData(form).getAll("upload") as File[]
    expect(files.map((file) => file.name)).toEqual(["a.txt", "b.txt"])
    form.reset()
    await ElementFixture.tick()
    expect(new FormData(form).has("upload")).toBe(false)
  })

  it("a file input:  its element holds the files picked, and an empty value forgets them", async () => {
    const { host, control } = await input(
      `<ui-input type="file" multiple accept=".json" aria-label="Upload"></ui-input>`
    )
    const fileInput = host as unknown as DOMInputElement & Input
    expect(control.accept).toBe(".json")
    expect(control.multiple).toBe(true)
    expect(control.webkitdirectory).toBe(false)
    const changed = record(host, "ui-changed")
    const transfer = new DataTransfer()
    transfer.items.add(new File(["a"], "a.json"))
    transfer.items.add(new File(["b"], "b.json"))
    control.files = transfer.files
    control.dispatchEvent(new Event("change", { bubbles: true }))
    await ElementFixture.tick()
    expect(changed).toHaveLength(1)
    expect(fileInput.files.map((file) => file.name)).toEqual(["a.json", "b.json"])
    fileInput.value = ""
    await ElementFixture.tick()
    expect(fileInput.files).toEqual([])
    expect(control.value).toBe("")
  })

  it("a file input's `folder` picks folders;  `showPicker()` opens the native input's picker", async () => {
    const { host, control } = await input(`<ui-input type="file" folder aria-label="Upload a folder"></ui-input>`)
    expect(control.webkitdirectory).toBe(true)
    host.removeAttribute("folder")
    await ElementFixture.tick()
    expect(control.webkitdirectory).toBe(false)
    const opened: HTMLInputElement[] = []
    const showPicker = vi.spyOn(HTMLInputElement.prototype, "showPicker").mockImplementation(function (
      this: HTMLInputElement
    ) {
      opened.push(this)
    })
    onTestFinished(() => showPicker.mockRestore())
    ;(host as unknown as DOMInputElement).showPicker()
    expect(opened).toEqual([control])
    // `folder` means nothing on a text input
    const text = await input(`<ui-input folder aria-label="Name"></ui-input>`)
    expect(text.control.hasAttribute("webkitdirectory")).toBe(false)
  })

  it("Enter submits the form (implicit submission);  a textarea's Enter types a newline", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <ui-input name="q" aria-label="Query"></ui-input>
      <ui-textarea name="t" aria-label="Text"></ui-textarea>
    </form>`)
    const submits: SubmitEvent[] = []
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      submits.push(event as SubmitEvent)
    })
    const [inputHost] = form.querySelectorAll<Input>("ui-input")
    await userEvent.type(inputHost!.shadowRoot!.querySelector("input")!, "cats{Enter}")
    expect(submits).toHaveLength(1)
    const textarea = form.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    await userEvent.type(textarea, "a{Enter}b")
    expect(submits).toHaveLength(1)
    expect(textarea.value).toBe("a\nb")
  })

  it("Enter clicks the form's default submit button, so its name=value is sent", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <ui-input name="q" aria-label="Query"></ui-input>
      <button type="submit" name="go" value="yes">Go</button>
    </form>`)
    let submitter: HTMLElement | null = null
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      submitter = (event as SubmitEvent).submitter
    })
    await userEvent.type(form.querySelector("ui-input")!.shadowRoot!.querySelector("input")!, "x{Enter}")
    expect(submitter).toBe(form.querySelector("button"))
  })

  it("numbers (`type=number`, `inputmode` decimal / numeric):  end-aligned tabular figures;  text stays at the start", async () => {
    expect(look((await input(`<ui-input type="number" aria-label="Size"></ui-input>`)).control)).toEqual([
      "end",
      "tabular-nums"
    ])
    const { control: decimal } = await input(
      `<ui-input inputmode="decimal" labeled="right" label="%" aria-label="C"></ui-input>`
    )
    expect(decimal.inputMode).toBe("decimal")
    expect(look(decimal)).toEqual(["end", "tabular-nums"])
    expect(look((await input(`<ui-input aria-label="Name"></ui-input>`)).control)).toEqual(["start", "normal"])
    const { control: optedOut } = await input(
      `<ui-input type="number" style="--ui-input-numeric-align: start" aria-label="Size"></ui-input>`
    )
    expect(look(optedOut)).toEqual(["start", "tabular-nums"])

    /** `control`'s text alignment and number figures. */
    function look(control: HTMLInputElement) {
      const style = getComputedStyle(control)
      return [style.textAlign, style.fontVariantNumeric]
    }
  })

  it("Enter submits through a `<ui-button type=submit>`, with its name=value", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <ui-input name="q" aria-label="Query"></ui-input>
      <ui-button type="submit" name="go" value="yes">Add</ui-button>
    </form>`)
    const entries: [string, FormDataEntryValue][][] = []
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      entries.push([...new FormData(form)])
    })
    await userEvent.type(form.querySelector("ui-input")!.shadowRoot!.querySelector("input")!, "x{Enter}")
    expect(entries).toEqual([
      [
        ["q", "x"],
        ["go", "yes"]
      ]
    ])
  })
})

////////////////
// ## Validation
////////////////

describe("<ui-input> validation", () => {
  it("merges native constraints into the host's validity", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(`<form>
      <ui-input name="email" type="email" required aria-label="Email"></ui-input>
    </form>`)
    const host = form.querySelector<Input>("ui-input")!
    expect(host.validity.valueMissing).toBe(true)
    expect(host.validationMessage).not.toBe("")
    expect(form.checkValidity()).toBe(false)
    host.value = "not-an-email"
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(host.validity.valueMissing).toBe(false)
    expect(host.validity.typeMismatch).toBe(true)
    host.value = "ada@example.com"
    await ElementFixture.tick()
    await ElementFixture.tick()
    expect(host.validity.valid).toBe(true)
    expect(form.checkValidity()).toBe(true)
  })

  it("checks `pattern` against the whole value", async () => {
    const { host } = await input(`<ui-input pattern="[a-z]+" value="abc1" aria-label="Code"></ui-input>`)
    expect(host.validity.patternMismatch).toBe(true)
  })

  it("adds Fomantic `rules` (property):  their flags and prompts", async () => {
    const { host } = await input(`<ui-input value="abc" aria-label="Password"></ui-input>`)
    host.rules = ["minLength[6]", "contains[1]"]
    await ElementFixture.tick()
    expect(host).toMatchObject({
      validity: { tooShort: true, customError: true },
      validationMessage: "Password must be at least 6 characters"
    })
    host.value = "abc123"
    await ElementFixture.tick()
    expect(host.validity.valid).toBe(true)
  })

  it("accepts `rules` as a JSON attribute", async () => {
    const { host } = await input(`<ui-input rules='"email"' value="x" aria-label="Email"></ui-input>`)
    expect(host.validity.typeMismatch).toBe(true)
  })

  it("accepts a shorthand rule string as the attribute or the property (not JSON)", async () => {
    const { host } = await input(`<ui-input rules="email" value="x" aria-label="Email"></ui-input>`)
    expect(host.rules).toBe("email")
    expect(host.validity.typeMismatch).toBe(true)
    host.rules = "minLength[4]"
    await ElementFixture.tick()
    expect(host.rules).toBe("minLength[4]")
    expect(host.validity.tooShort).toBe(true)
  })

  it("shows :state(invalid) only after interaction (:user-invalid semantics)", async () => {
    const form = await ElementFixture.render<HTMLFormElement>(
      `<form><ui-input name="n" required aria-label="Name"></ui-input><button>Go</button></form>`
    )
    const host = form.querySelector<Input>("ui-input")!
    const control = host.shadowRoot!.querySelector("input")!
    expect(host.validity.valid).toBe(false)
    expect(host.matches(":state(invalid)")).toBe(false)
    expect(control.hasAttribute("aria-invalid")).toBe(false)
    expect(form.reportValidity()).toBe(false)
    await ElementFixture.tick()
    expect(host.matches(":state(invalid)")).toBe(true)
    expect(control.getAttribute("aria-invalid")).toBe("true")
    await userEvent.type(control, "Ada")
    await ElementFixture.tick()
    expect(host.matches(":state(invalid)")).toBe(false)
    form.reset()
    await ElementFixture.tick()
    expect(host.matches(":state(invalid)")).toBe(false)
  })

  it("leaving an edited field counts as interaction", async () => {
    const { host, control } = await input(`<ui-input minlength="3" aria-label="Name"></ui-input>`)
    await userEvent.type(control, "ab")
    expect(host.matches(":state(invalid)")).toBe(false)
    await userEvent.tab()
    await ElementFixture.tick()
    expect(host.validity.tooShort).toBe(true)
    expect(host.matches(":state(invalid)")).toBe(true)
  })
})

////////////////
// ## Labels
////////////////

describe("<ui-input> labels", () => {
  it("picks up a <label for> added (or retargeted) AFTER the control:  accessible name and internals.labels", async () => {
    const container = await ElementFixture.render<HTMLDivElement>(`<div><ui-input id="late"></ui-input></div>`)
    const host = container.querySelector<Input>("ui-input")!
    const control = host.shadowRoot!.querySelector("input")!
    await ElementFixture.tick()
    expect(control.getAttribute("aria-label")).toBeNull()
    // nested in an added subtree, as frameworks insert markup
    const row = document.createElement("p")
    row.innerHTML = `<span><label for="late">Late label</label></span>`
    container.prepend(row)
    expect([...host.labels]).toEqual([row.querySelector("label")])
    await expect.poll(() => control.getAttribute("aria-label")).toBe("Late label")
    await expectAccessible(container)
    row.querySelector("label")!.htmlFor = "elsewhere"
    await expect.poll(() => control.getAttribute("aria-label")).toBeNull()
    row.querySelector("label")!.htmlFor = "late"
    await expect.poll(() => control.getAttribute("aria-label")).toBe("Late label")
    row.remove()
    await expect.poll(() => control.getAttribute("aria-label")).toBeNull()
  })

  it("is labelled by <label for> across the shadow boundary (internals.labels)", async () => {
    const container = await ElementFixture.render<HTMLDivElement>(
      `<div><label for="email">E-mail address</label><ui-input id="email" name="email"></ui-input></div>`
    )
    const host = container.querySelector<Input>("ui-input")!
    const control = host.shadowRoot!.querySelector("input")!
    expect([...host.labels]).toEqual([container.querySelector("label")])
    await expect.poll(() => control.getAttribute("aria-label")).toBe("E-mail address")
    container.querySelector("label")!.textContent = "Email"
    await expect.poll(() => control.getAttribute("aria-label")).toBe("Email")
    container.querySelector("label")!.click()
    await expect.poll(() => host.shadowRoot!.activeElement).toBe(control)
    await expectAccessible(container)
  })

  it("takes a wrapping <label>'s text, and the host's aria-label first", async () => {
    const container = await ElementFixture.render<HTMLDivElement>(
      `<div><label>Name <ui-input></ui-input></label><ui-input aria-label="Direct"></ui-input></div>`
    )
    const [wrapped, direct] = container.querySelectorAll<Input>("ui-input")
    await expect.poll(() => wrapped!.shadowRoot!.querySelector("input")!.getAttribute("aria-label")).toBe("Name")
    expect(direct!.shadowRoot!.querySelector("input")!.getAttribute("aria-label")).toBe("Direct")
    direct!.setAttribute("aria-label", "Changed")
    await expect.poll(() => direct!.shadowRoot!.querySelector("input")!.getAttribute("aria-label")).toBe("Changed")
  })

  it("names its validation messages after the label", async () => {
    const container = await ElementFixture.render<HTMLDivElement>(
      `<div><label for="pw">Password</label><ui-input id="pw" value="x"></ui-input></div>`
    )
    const host = container.querySelector<Input>("ui-input")!
    await ElementFixture.tick()
    host.rules = "minLength[4]"
    await expect.poll(() => host.validationMessage).toBe("Password must be at least 4 characters")
  })
})

////////////////
// ## `<ui-textarea>`
////////////////

describe("<ui-textarea>", () => {
  it("renders a native textarea in the input box, with rows", async () => {
    const host = await ElementFixture.render<Input>(
      `<ui-textarea rows="3" state="warning" placeholder="Bio" required></ui-textarea>`
    )
    const root = host.shadowRoot!.querySelector("[part~=input]")!
    expect(root.className).toBe("ui warning input")
    const textarea = root.querySelector("textarea")!
    expect(textarea.rows).toBe(3)
    expect(textarea.required).toBe(true)
    expect(host.validity.valueMissing).toBe(true)
  })
})

// epic `ui-gaps` P14 (epic `epic-engine` Q24:  opt in;  Owen's standing rule:  every "tell me more" field grows)
describe("<ui-textarea grow>", () => {
  /** A growing textarea in a 300px column:  its DOM element, its native control, and typing `text` into it. */
  async function growing(attributes = "") {
    const wrapper = await ElementFixture.render<HTMLElement>(
      `<div style="width: 300px"><ui-textarea grow fluid aria-label="Notes" ${attributes}></ui-textarea></div>`
    )
    await ElementFixture.settle()
    const host = wrapper.querySelector<Input>("ui-textarea")!
    const control = host.shadowRoot!.querySelector<HTMLTextAreaElement>("textarea")!
    /** The control's height, after `text` is set as its value. */
    const heightFor = async (text: string) => {
      host.value = text
      await ElementFixture.settle()
      return control.getBoundingClientRect().height
    }
    /** One line of the field, in px. */
    const line = parseFloat(getComputedStyle(control).lineHeight)
    return { host, control, heightFor, line }
  }

  /** `count` lines of text. */
  const lines = (count: number) => Array.from({ length: count }, (_, index) => `line ${index + 1}`).join("\n")

  /** Run `test` twice:  with the browser's `field-sizing`, and measuring, as a browser without it does. */
  const bothWays = (name: string, test: (args: Awaited<ReturnType<typeof growing>>) => Promise<void>) => {
    it.each([["field-sizing"], ["measuring"]])(`${name} (%s)`, async (way) => {
      const { UI } = await import("spell/ui/core")
      const supports = UI.browser.supports
      const had = supports.fieldSizing
      if (way === "measuring") supports.fieldSizing = false
      onTestFinished(() => {
        supports.fieldSizing = had
      })
      const field = await growing()
      if (way === "measuring") field.control.style.setProperty("field-sizing", "fixed")
      await test(field)
    })
  }

  bothWays("starts one line tall, grows with its text, and shrinks again", async ({ heightFor, line }) => {
    const one = await heightFor("")
    const three = await heightFor(lines(3))
    expect(Math.round(three - one)).toBe(Math.round(2 * line))
    expect(await heightFor("")).toBe(one)
  })

  bothWays("stops at a third of the window, then scrolls", async ({ heightFor, control }) => {
    const tall = await heightFor(lines(200))
    // `33vh`
    expect(Math.abs(tall - innerHeight * 0.33)).toBeLessThan(1)
    expect(control.scrollHeight).toBeGreaterThan(control.clientHeight)
  })

  it("`max-rows`:  stops there;  `rows`:  starts there", async () => {
    const { heightFor, line, control } = await growing(`rows="2" max-rows="4"`)
    const two = await heightFor("")
    expect(control.rows).toBe(2)
    const four = await heightFor(lines(4))
    expect(Math.round(four - two)).toBe(Math.round(2 * line))
    expect(await heightFor(lines(20))).toBeCloseTo(four, 0)
  })

  it("a plain textarea keeps its fixed height:  no `grow`, no growing", async () => {
    const host = await ElementFixture.render<Input>(`<ui-textarea aria-label="Bio"></ui-textarea>`)
    await ElementFixture.settle()
    const control = host.shadowRoot!.querySelector<HTMLTextAreaElement>("textarea")!
    const before = control.getBoundingClientRect().height
    host.value = lines(30)
    await ElementFixture.settle()
    expect([
      control.getBoundingClientRect().height,
      getComputedStyle(control).getPropertyValue("field-sizing")
    ]).toEqual([before, "fixed"])
  })
})

describe("<ui-textarea send-on-enter>", () => {
  /** A textarea holding `value`, what it sent, and pressing a key in it. */
  async function box(value: string, attributes = "send-on-enter") {
    const host = await ElementFixture.render<Input>(`<ui-textarea ${attributes} aria-label="Message"></ui-textarea>`)
    host.value = value
    await ElementFixture.settle()
    const sent: string[] = []
    host.addEventListener("ui-send", (event) => sent.push((event as CustomEvent<{ value: string }>).detail.value))
    const control = host.shadowRoot!.querySelector<HTMLTextAreaElement>("textarea")!
    const press = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...init })
      control.dispatchEvent(event)
      return event
    }
    return { sent, press }
  }

  it("Enter sends what's typed, and types no new line", async () => {
    const { sent, press } = await box("Who's bringing chairs?")
    expect(press({}).defaultPrevented).toBe(true)
    expect(sent).toEqual(["Who's bringing chairs?"])
  })

  it("Shift-Enter types a new line, and sends nothing", async () => {
    const { sent, press } = await box("line")
    expect(press({ shiftKey: true }).defaultPrevented).toBe(false)
    expect(sent).toEqual([])
  })

  it("nothing but spaces sends nothing, and types no new line either", async () => {
    const { sent, press } = await box("   ")
    expect(press({}).defaultPrevented).toBe(true)
    expect(sent).toEqual([])
  })

  it("without it, Enter types a new line as ever", async () => {
    const { sent, press } = await box("line", "")
    expect(press({}).defaultPrevented).toBe(false)
    expect(sent).toEqual([])
  })
})

////////////////
// ## Joined buttons
////////////////

describe("<ui-input> joined buttons", () => {
  /** The first `<ui-button>`'s drawn box, and the field's native control, as painted. */
  async function joined(html: string) {
    const { host, control } = await input(html)
    const buttons = [...host.querySelectorAll("ui-button")]
    await Promise.all(buttons.map((button) => (button as unknown as { ready: Promise<unknown> }).ready))
    const boxes = buttons.map((button) => getComputedStyle(button.shadowRoot!.querySelector("[part~=button]")!))
    return { field: getComputedStyle(control), boxes }
  }

  it("takes the field's border, and its radius on the outer corners only", async () => {
    const { field, boxes } = await joined(
      `<ui-input style="--ui-input-radius: 10px" aria-label="A"><ui-button slot="action">Go</ui-button></ui-input>`
    )
    const [box] = boxes
    expect(box.borderTopLeftRadius).toBe("0px")
    expect(box.borderBottomLeftRadius).toBe("0px")
    expect(box.borderTopRightRadius).toBe("10px")
    expect(box.borderBottomRightRadius).toBe("10px")
    expect(box.boxShadow).toContain(`${field.borderTopColor} 0px 0px 0px ${field.borderTopWidth} inset`)
  })

  it('`action="left"` turns it round;  several buttons are square between them', async () => {
    const { boxes } = await joined(
      `<ui-input action="left" style="--ui-input-radius: 10px" aria-label="A"
        ><ui-button slot="action">A</ui-button><ui-button slot="action">B</ui-button></ui-input>`
    )
    const [first, last] = boxes
    expect([first.borderTopLeftRadius, first.borderTopRightRadius]).toEqual(["10px", "0px"])
    expect([last.borderTopLeftRadius, last.borderTopRightRadius]).toEqual(["0px", "0px"])
  })
})

////////////////
// ## Clearing
////////////////

describe("<ui-input clearable>", () => {
  /** The clear button's box, if it shows. */
  const clearBox = (host: Element) => host.shadowRoot!.querySelector<HTMLElement>("[part~=clear]")

  it('shows an `x` once there\'s text, on a `type="search"` field by itself', async () => {
    const { host, control } = await input(`<ui-input type="search" aria-label="Find"></ui-input>`)
    expect(clearBox(host)).toBeNull()
    await userEvent.type(control, "cats")
    await ElementFixture.settle()
    expect(clearBox(host)?.querySelector("ui-button")?.getAttribute("aria-label")).toBe("Clear")
    // out of the Tab order, as the browser's own clear button is
    const after = document.createElement("button")
    host.after(after)
    onTestFinished(() => after.remove())
    await userEvent.tab()
    expect(document.activeElement).toBe(after)
  })

  it("empties the field as typing would, then focuses it", async () => {
    const { host, control } = await input(`<ui-input clearable value="cats" aria-label="Find"></ui-input>`)
    const typed = record(host, "ui-typed")
    const changed = record(host, "ui-changed")
    await ElementFixture.settle()
    await userEvent.click(clearBox(host)!.querySelector("ui-button")!)
    await ElementFixture.settle()
    expect([host.value, control.value]).toEqual(["", ""])
    expect(typed.map((detail) => detail.value)).toEqual([""])
    expect(changed.map((detail) => detail.value)).toEqual([""])
    expect(host.shadowRoot!.activeElement).toBe(control)
    expect(clearBox(host)).toBeNull()
  })

  it('is off on a plain field, and `clearable="false"` turns a search field\'s off', async () => {
    for (const html of [
      `<ui-input value="cats" aria-label="A"></ui-input>`,
      `<ui-input type="search" clearable="false" value="cats" aria-label="A"></ui-input>`,
      `<ui-input type="search" disabled value="cats" aria-label="A"></ui-input>`,
      `<ui-input type="search" readonly value="cats" aria-label="A"></ui-input>`
    ]) {
      const { host } = await input(html)
      await ElementFixture.settle()
      expect(clearBox(host), html).toBeNull()
    }
  })

  it("takes the trailing icon's place, and sits in the end column beside a `left icon`", async () => {
    const { host, control } = await input(`<ui-input clearable icon="users" value="cats" aria-label="A"></ui-input>`)
    await ElementFixture.settle()
    const icon = host.shadowRoot!.querySelector<HTMLElement>("[part~=icon]")!
    expect(getComputedStyle(icon).visibility).toBe("hidden")
    const field = control.getBoundingClientRect()
    const clear = clearBox(host)!.getBoundingClientRect()
    expect(Math.abs(clear.right - field.right)).toBeLessThan(1)
    expect(Math.abs(clear.top + clear.height / 2 - (field.top + field.height / 2))).toBeLessThan(1)
    // the text never runs under it
    expect(Number.parseFloat(getComputedStyle(control).paddingRight)).toBeGreaterThanOrEqual(clear.width - 1)

    const left = await input(
      `<ui-input type="search" icon="search" icon-position="left" value="cats" aria-label="A"></ui-input>`
    )
    await ElementFixture.settle()
    expect(getComputedStyle(left.host.shadowRoot!.querySelector("[part~=icon]")!).visibility).toBe("visible")
    expect(Number.parseFloat(getComputedStyle(left.control).paddingRight)).toBeGreaterThanOrEqual(
      clearBox(left.host)!.getBoundingClientRect().width - 1
    )
  })

  it("lines its `x` up with the text, at every size", async () => {
    for (const size of ["mini", "small", "medium", "large"]) {
      const { host } = await input(
        `<ui-input size="${size}" type="search" icon="search" icon-position="left" value="cats" aria-label="A"></ui-input>`
      )
      await ElementFixture.settle()
      await (clearBox(host)!.querySelector("ui-button") as unknown as { ready: Promise<unknown> }).ready
      expect(Alignment.report(Alignment.scan({ within: "ui-input" })), size).toEqual([])
      host.remove()
    }
  })
})

////////////////
// ## Search fields and shortcuts
////////////////

/** Press `ctrl+F` on the page, as a person would;  returns the event, to see whether something took it. */
function pressCtrlF(target: EventTarget = document.body): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key: "f", code: "KeyF", ctrlKey: true, bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe('<ui-input type="search">', () => {
  it("shows a magnifying glass at its start;  an icon it names goes there too", async () => {
    const { root } = await input(`<ui-input type="search" aria-label="Find"></ui-input>`)
    expect(root.className).toBe("ui left icon input left-icon")
    const named = await input(`<ui-input type="search" icon="users" aria-label="Find"></ui-input>`)
    expect(named.root.className).toBe("ui left icon input left-icon")
  })
})

describe("<ui-input shortcut>", () => {
  /** The keys' box, if it shows. */
  const keysBox = (host: Element) => host.shadowRoot!.querySelector<HTMLElement>("[part~=shortcut]")

  it("shows its keys at its end while it's empty;  the clear x takes their place", async () => {
    const { host, control } = await input(`<ui-input type="search" shortcut="ctrl+F" aria-label="Find"></ui-input>`)
    expect(keysBox(host)?.querySelector("ui-keys")?.getAttribute("shortcut")).toBe("ctrl+F")
    expect(control.getAttribute("aria-keyshortcuts")).toBe("Control+F")
    await userEvent.type(control, "cats")
    await ElementFixture.settle()
    expect(keysBox(host)).toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=clear]")).not.toBeNull()
  })

  it("focuses the field while it shows, and stops the browser's find only then", async () => {
    const { host, control } = await input(`<ui-input shortcut="ctrl+F" value="cats" aria-label="Find"></ui-input>`)
    await ElementFixture.settle()
    const event = pressCtrlF()
    expect(event.defaultPrevented).toBe(true)
    expect(host.shadowRoot!.activeElement).toBe(control)
    expect([control.selectionStart, control.selectionEnd]).toEqual([0, 4])
    control.blur()

    // hidden:  the key is the browser's
    host.style.display = "none"
    expect(pressCtrlF().defaultPrevented).toBe(false)
  })

  it("leaves a key someone already handled alone", async () => {
    const { host } = await input(`<ui-input shortcut="ctrl+F" aria-label="Find"></ui-input>`)
    const other = document.createElement("div")
    other.tabIndex = 0
    document.body.append(other)
    onTestFinished(() => other.remove())
    other.addEventListener("keydown", (event) => event.preventDefault())
    pressCtrlF(other)
    expect(host.shadowRoot!.activeElement).toBeNull()
  })

  it("picks the field in an open modal over the page's, which the modal covers", async () => {
    const { host: page } = await input(`<ui-input shortcut="ctrl+F" aria-label="Page"></ui-input>`)
    const modal = await ElementFixture.render<HTMLElement & { visible: boolean }>(
      `<ui-modal><ui-input shortcut="ctrl+F" aria-label="Modal"></ui-input></ui-modal>`
    )
    const opened = new Promise((resolve) => modal.addEventListener("ui-opened", resolve, { once: true }))
    modal.visible = true
    await opened
    await ElementFixture.settle()
    // the modal focuses its field as it opens:  move the focus off, to see the key bring it back
    ;(document.activeElement as HTMLElement | null)?.blur()
    const inModal = modal.querySelector("ui-input")!
    pressCtrlF()
    expect(document.activeElement).toBe(inModal)
    expect(page.shadowRoot!.activeElement).toBeNull()
  })

  it("lines its keys up with the field's text", async () => {
    const { host } = await input(
      `<ui-input type="search" shortcut="ctrl+F" placeholder="Search" aria-label="A"></ui-input>`
    )
    await ElementFixture.settle()
    await (keysBox(host)!.querySelector("ui-keys") as unknown as { ready: Promise<unknown> }).ready
    expect(Alignment.report(Alignment.scan({ within: "ui-input" }))).toEqual([])
  })
})

////////////////
// ## Tokens from outside
////////////////

describe("<ui-input> tokens from outside", () => {
  /** The native control's top-left radius, which `--ui-input-radius` drives. */
  function radius(host: Element): string {
    return getComputedStyle(host.shadowRoot!.querySelector("[part~=control]")!).borderTopLeftRadius
  }

  it("takes a token set on the HOST", async () => {
    const { host } = await input(`<ui-input style="--ui-input-radius: 12px" aria-label="A"></ui-input>`)
    expect(radius(host)).toBe("12px")
  })

  it("takes a token set on an ANCESTOR", async () => {
    const wrapper = await ElementFixture.render(
      `<section style="--ui-input-radius: 12px"><div><ui-input aria-label="A"></ui-input></div></section>`
    )
    expect(radius(wrapper.querySelector("ui-input")!)).toBe("12px")
  })

  it("takes a token set through `::part(input)`", async () => {
    const wrapper = await ElementFixture.render(
      `<div><style>.themed::part(input) { --ui-input-radius: 12px }</style><ui-input class="themed" aria-label="A"></ui-input></div>`
    )
    expect(radius(wrapper.querySelector("ui-input")!)).toBe("12px")
  })

  it("takes a token set on `:root`", async () => {
    document.documentElement.style.setProperty("--ui-input-radius", "12px")
    onTestFinished(() => {
      document.documentElement.style.removeProperty("--ui-input-radius")
    })
    const { host } = await input(`<ui-input aria-label="A"></ui-input>`)
    expect(radius(host)).toBe("12px")
  })

  it("reaches a textarea too", async () => {
    const host = await ElementFixture.render(
      `<ui-textarea style="--ui-input-radius: 12px" aria-label="A"></ui-textarea>`
    )
    expect(radius(host)).toBe("12px")
  })
})

////////////////
// ## Accessibility
////////////////

describe("<ui-input> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await ElementFixture.tick()
    await expectAccessible(root)
  })
})
