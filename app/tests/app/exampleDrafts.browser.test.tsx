import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { UI } from "spell/ui"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { uiReady } from "spell/app/app/solid"
import { openChoices } from "spell/app/app/solid/modals"

/**
 * An example opened as it is, your edits your draft of it (epic `mockup` T52):
 * - leaving it with a draft, or Save in it (`editor.saveDraft()`), asks what to keep (`editor.askAboutExample()`):
 *   Update the Example alone on the left (for whoever may publish it), then Cancel, Discard Changes (after "are you
 *   sure?") and Save in My Apps
 * - it answers whether to go on:  Cancel, Escape, Keep Editing or no to Update stay, the draft as it was
 * - asked before the address changes, only when it leaves the project (`editor.asksBeforeLeaving()`)
 * - no draft, nothing asked
 * - `<Choices>`, the dialog it asks in:  a button per answer, Escape none
 * - The server's half (a save is a draft, the copy with your draft, Publish into the example):  spaces' `api.test.ts`.
 */

/** Undo for each test. */
const cleanups: (() => void)[] = []

/** What the test's server did. */
let discarded: string[] = []
let copied: { sourceId: string; withDraft?: boolean }[] = []
let published = 0

/** Your drafts of the example, as `GET /api/projects/drafts/` answers;  `mayPublish`:  a manager of `@spell`. */
let drafts: SPACES.DraftJSON[] = []
let mayPublish = false

beforeEach(() => {
  discarded = []
  copied = []
  published = 0
  drafts = [{ filePath: "/Counter.spell", person: "owen", clashes: false, mine: "mine", theirs: "theirs" }]
  mayPublish = false
  const spies = [
    vi.spyOn(SPACES.ProjectFiles.prototype, "drafts").mockImplementation(async () => ({
      drafts,
      versions: [],
      mayPublish,
      mayDesign: true,
      mayCreate: true
    })),
    vi.spyOn(SPACES.ProjectFiles.prototype, "discard").mockImplementation(async (filePath) => {
      discarded.push(filePath)
    }),
    vi.spyOn(SPACES.ProjectFiles.prototype, "publish").mockImplementation(async () => {
      published++
      return { published: drafts.map((draft) => draft.filePath) }
    }),
    vi.spyOn(SPACES.SpellProjectRoot.projects, "copyHere").mockImplementation(async (sourceId, options) => {
      copied.push({ sourceId, withDraft: options?.withDraft })
      return { path: "owen@spell/Counter", title: "Counter" } as SP.SpellProject
    }),
    vi.spyOn(editor, "showNotice").mockImplementation(() => undefined),
    vi.spyOn(editor, "showError").mockImplementation((error) => {
      throw error
    }),
    vi.spyOn(editor, "showEditor").mockImplementation(() => undefined)
  ]
  cleanups.push(() => {
    for (const spy of spies) spy.mockRestore()
  })
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("leaving an example with your draft (`editor.askAboutExample()`)", () => {
  test("asked once, with Discard Changes and Save in My Apps;  no Update the Example for someone who may not publish", async () => {
    const asked = choose("mine")
    await editor.leaveProject(example())
    expect(asked).toHaveBeenCalledOnce()
    const { header, choices, cancel } = asked.mock.calls[0]![0]
    expect(header).toBe("Keep your changes to Counter?")
    expect(choices.map((choice) => choice.text)).toEqual(["Discard Changes", "Save in My Apps"])
    expect(choices.some((choice) => choice.apart)).toBe(false)
    expect(cancel).toBe("Cancel")
  })

  test("Save in My Apps:  a copy in your apps with your draft;  leaving, it isn't shown, and it goes on", async () => {
    choose("mine")
    expect(await editor.askAboutExample(example(), "leaving")).toBe(true)
    expect(copied).toEqual([{ sourceId: "@spell/examples/Counter", withDraft: true }])
    expect(editor.showEditor).not.toHaveBeenCalled()
    expect(editor.showNotice).toHaveBeenCalledWith("Counter is in your apps now, with your changes.")
  })

  test("Discard Changes, then Discard:  your draft goes, nothing copied, and it goes on", async () => {
    choose("discard")
    const sure = confirm(true)
    expect(await editor.askAboutExample(example(), "leaving")).toBe(true)
    expect(sure.mock.calls[0]![0]).toMatchObject({
      header: "Discard your changes to Counter?",
      ok: "Discard",
      cancel: "Keep Editing",
      danger: true
    })
    expect(discarded).toEqual(["/Counter.spell"])
    expect(copied).toEqual([])
  })

  test("Discard Changes, then Keep Editing:  it stays, the draft as it was", async () => {
    choose("discard")
    confirm(false)
    expect(await editor.askAboutExample(example(), "leaving")).toBe(false)
    expect(discarded).toEqual([])
  })

  test("Cancel or Escape:  it stays, nothing copied or discarded", async () => {
    choose(undefined)
    expect(await editor.askAboutExample(example(), "leaving")).toBe(false)
    expect(discarded).toEqual([])
    expect(copied).toEqual([])
    expect(published).toBe(0)
  })

  test("no draft:  nothing asked, and it goes on", async () => {
    drafts = []
    const asked = choose("mine")
    expect(await editor.askAboutExample(example(), "leaving")).toBe(true)
    expect(asked).not.toHaveBeenCalled()
  })

  test("a guide is asked about too", async () => {
    const asked = choose(undefined)
    await editor.leaveProject(example("@spell/guides/how-calculator-works"))
    expect(asked).toHaveBeenCalledOnce()
  })

  test("an edit AutoSave was still waiting to keep is kept first", async () => {
    drafts = []
    const file = { isDirty: true, path: "@spell/examples/Counter/Counter.spell", save: vi.fn(async () => undefined) }
    const asked = choose(undefined)
    await editor.leaveProject(example("@spell/examples/Counter", [file]))
    expect(file.save).toHaveBeenCalled()
    expect(asked).toHaveBeenCalledOnce()
  })
})

describe("asked before the address changes, only when it leaves the example (`editor.asksBeforeLeaving()`)", () => {
  /** Show `shown` as the editor's project, with drafts of `drafted`, for the test. */
  function showing(shown: SP.SpellProject, drafted: string[]) {
    const project = vi.spyOn(editor, "project", "get").mockReturnValue(shown)
    const draftedFiles = vi.spyOn(editor, "draftedFiles", "get").mockReturnValue(drafted)
    cleanups.push(() => {
      project.mockRestore()
      draftedFiles.mockRestore()
    })
  }

  test("with a draft:  home or another project asks;  another file, Run or its site editor don't", () => {
    showing(example(), ["@spell/examples/Counter/Counter.spell"])
    expect(editor.asksBeforeLeaving("/")).toBe(true)
    expect(editor.asksBeforeLeaving("/edit/@spell/examples/Solitaire")).toBe(true)
    expect(editor.asksBeforeLeaving("/edit/@spell/examples/Counter/Other.spell")).toBe(false)
    expect(editor.asksBeforeLeaving("/run/@spell/examples/Counter")).toBe(false)
    expect(editor.asksBeforeLeaving("/site/@spell/examples/Counter")).toBe(false)
  })

  test("no draft and nothing unsaved, or not an example:  never", () => {
    showing(example(), [])
    expect(editor.asksBeforeLeaving("/")).toBe(false)
    showing(example("owen@spell/Counter"), ["owen@spell/Counter/Counter.spell"])
    expect(editor.asksBeforeLeaving("/")).toBe(false)
  })

  test("an edit not saved yet counts", () => {
    showing(example("@spell/examples/Counter", [{ isDirty: true, path: "@spell/examples/Counter/Counter.spell" }]), [])
    expect(editor.asksBeforeLeaving("/")).toBe(true)
  })
})

describe("Update the Example, for whoever may publish it (a manager of `@spell`)", () => {
  test("offered between the two;  after a second question, your draft is published into the example", async () => {
    mayPublish = true
    const asked = choose("update")
    const sure = confirm(true)
    await editor.leaveProject(example())
    expect(asked.mock.calls[0]![0].choices.map((choice) => choice.text)).toEqual([
      "Update the Example",
      "Discard Changes",
      "Save in My Apps"
    ])
    expect(asked.mock.calls[0]![0].choices[0]).toMatchObject({ value: "update", apart: true })
    expect(sure.mock.calls[0]![0]).toMatchObject({ header: "Change Counter for everyone?", danger: true })
    expect(published).toBe(1)
  })

  test("the second question answered no:  nothing published, it stays, the draft as it was", async () => {
    mayPublish = true
    choose("update")
    confirm(false)
    expect(await editor.askAboutExample(example(), "leaving")).toBe(false)
    expect(published).toBe(0)
    expect(discarded).toEqual([])
  })
})

describe("Save (⌘S) in an example (`editor.saveDraft()`)", () => {
  test("asks too;  Save in My Apps shows the copy", async () => {
    const shown = example()
    const project = vi.spyOn(editor, "project", "get").mockReturnValue(shown)
    const saveAll = vi.spyOn(editor, "saveAll").mockResolvedValue(undefined)
    cleanups.push(() => {
      project.mockRestore()
      saveAll.mockRestore()
    })
    // the example's files read again once its draft is gone:  the stand-in has none
    const reloads = editor as unknown as { reloadFiles: (filePaths: string[]) => Promise<void> }
    const reload = vi.spyOn(reloads, "reloadFiles").mockResolvedValue(undefined)
    cleanups.push(() => reload.mockRestore())
    choose("mine")
    await editor.saveDraft()
    expect(saveAll).toHaveBeenCalledOnce()
    expect(editor.showEditor).toHaveBeenCalledWith("owen@spell/Counter")
  })
})

describe("`<Choices>`:  a button per answer", () => {
  test("an answer set apart stands at the left, then Cancel, then the rest;  Cancel answers none", async () => {
    await uiReady
    const cancelled = openChoices({
      message: "Which?",
      choices: [
        { value: "drop", text: "Drop", color: "negative", apart: true },
        { value: "keep", text: "Keep", color: "primary" }
      ],
      cancel: "Cancel"
    })
    const modal = await shownChoices()
    await ElementFixture.settle(modal)
    const buttons = [...modal.querySelectorAll<HTMLElement>("ui-button")]
    expect(buttons.map((button) => button.textContent)).toEqual(["Drop", "Cancel", "Keep"])
    const [drop, cancel, keep] = buttons.map((button) => button.getBoundingClientRect())
    expect(cancel!.left - drop!.right).toBeGreaterThan(40)
    expect(keep!.left).toBeGreaterThan(cancel!.right)
    buttons[1]!.click()
    expect(await cancelled).toBeUndefined()
  })

  test("a close ✕ in its corner, which answers none;  off with `closable: false`", async () => {
    await uiReady
    const closed = openChoices({ message: "Which?", choices: [{ value: "a", text: "A" }] })
    const modal = await shownChoices()
    await ElementFixture.settle(modal)
    const close = await closeIconOf(modal)
    close.click()
    expect(await closed).toBeUndefined()

    const answered = openChoices({ message: "Which?", choices: [{ value: "a", text: "A" }], closable: false })
    const bare = await shownChoices()
    await ElementFixture.settle(bare)
    expect(bare.hasAttribute("closable")).toBe(false)
    bare.querySelector<HTMLElement>("ui-button")!.click()
    expect(await answered).toBe("a")
  })

  test("a click answers its value;  Escape answers none", async () => {
    await uiReady
    // Escape through a keyboard binding rather than `CloseWatcher`, so the test can press it
    UI.overlays.useCloseWatcher = false
    cleanups.push(() => (UI.overlays.useCloseWatcher = true))
    const clicked = openChoices({
      message: "Which?",
      choices: [
        { value: "a", text: "A" },
        { value: "b", text: "B", color: "primary" }
      ]
    })
    const modal = await shownChoices()
    await ElementFixture.settle(modal)
    const buttons = [...modal.querySelectorAll<HTMLElement>("ui-button")]
    expect(buttons.map((button) => button.textContent)).toEqual(["A", "B"])
    buttons[1]!.click()
    expect(await clicked).toBe("b")
    expect(document.querySelector(".ChoicesRoot")).toBeNull()

    const escaped = openChoices({ message: "Which?", choices: [{ value: "a", text: "A" }] })
    const second = await shownChoices()
    await ElementFixture.settle(second)
    await userEvent.keyboard("{Escape}")
    expect(await escaped).toBeUndefined()
  })
})

/** A stand-in for the example at `path`, with `files`. */
function example(path = "@spell/examples/Counter", files: object[] = []): SP.SpellProject {
  return { path, title: "Counter", files, getFile: () => undefined } as unknown as SP.SpellProject
}

/** `editor.askWithChoices()` answers `value`;  returns its spy. */
function choose(value: string | undefined) {
  const spy = vi.spyOn(editor, "askWithChoices").mockResolvedValue(value as never)
  cleanups.push(() => spy.mockRestore())
  return spy
}

/** `editor.confirm()` answers `ok`;  returns its spy. */
function confirm(ok: boolean) {
  const spy = vi.spyOn(editor, "confirm").mockResolvedValue(ok)
  cleanups.push(() => spy.mockRestore())
  return spy
}

describe("every dialog has a close ✕ that cancels (Owen, epic `mockup` P24)", () => {
  test("`editor.confirm()`:  its ✕ answers no", async () => {
    await uiReady
    const answer = editor.confirm({ header: "Sure?", message: "Really?" })
    const modal = await vi.waitFor(() => {
      const shown = [...document.querySelectorAll<HTMLElement>("ui-modal")].at(-1)
      if (!shown?.hasAttribute("closable")) throw new Error("no closable dialog yet")
      return shown
    })
    await ElementFixture.settle(modal)
    ;(await closeIconOf(modal)).click()
    expect(await answer).toBe(false)
  })
})

/** The close ✕ `modal` draws in its shadow root, once it's there. */
function closeIconOf(modal: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const close = modal.shadowRoot?.querySelector<HTMLElement>('[part~="close"]')
    if (!close) throw new Error("no close icon yet")
    return close
  })
}

/** The `<Choices>` showing now, once it's there. */
function shownChoices(): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const modal = document.querySelector<HTMLElement>(".Choices")
    if (!modal) throw new Error("no <Choices> yet")
    return modal
  })
}
