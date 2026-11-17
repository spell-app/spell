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
 * - leaving it with a draft (`editor.leaveProject()`), or Save in it (`editor.saveDraft()`), asks what to keep
 *   (`editor.askAboutExample()`):  Save as My App, Discard Changes, and for whoever may publish it, Update the Example
 * - Escape keeps the draft;  no draft, nothing asked
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
  test("asked once, with Discard Changes and Save as My App;  no Update the Example for someone who may not publish", async () => {
    const asked = choose("mine")
    await editor.leaveProject(example())
    expect(asked).toHaveBeenCalledOnce()
    const { header, choices } = asked.mock.calls[0]![0]
    expect(header).toBe("Keep your changes to Counter?")
    expect(choices.map((choice) => choice.text)).toEqual(["Discard Changes", "Save as My App"])
  })

  test("Save as My App:  a copy in your apps with your draft;  leaving, it isn't shown", async () => {
    choose("mine")
    await editor.leaveProject(example())
    expect(copied).toEqual([{ sourceId: "@spell/examples/Counter", withDraft: true }])
    expect(editor.showEditor).not.toHaveBeenCalled()
    expect(editor.showNotice).toHaveBeenCalledWith("Saved as Counter, in your apps.")
  })

  test("Discard Changes:  your draft goes, nothing copied", async () => {
    choose("discard")
    await editor.leaveProject(example())
    expect(discarded).toEqual(["/Counter.spell"])
    expect(copied).toEqual([])
  })

  test("Escape:  the draft stays, nothing copied or discarded", async () => {
    choose(undefined)
    await editor.leaveProject(example())
    expect(discarded).toEqual([])
    expect(copied).toEqual([])
    expect(published).toBe(0)
  })

  test("no draft:  nothing asked", async () => {
    drafts = []
    const asked = choose("mine")
    await editor.leaveProject(example())
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

describe("Update the Example, for whoever may publish it (a manager of `@spell`)", () => {
  test("offered between the two;  after a second question, your draft is published into the example", async () => {
    mayPublish = true
    const asked = choose("update")
    const sure = confirm(true)
    await editor.leaveProject(example())
    expect(asked.mock.calls[0]![0].choices.map((choice) => choice.text)).toEqual([
      "Discard Changes",
      "Update the Example",
      "Save as My App"
    ])
    expect(sure.mock.calls[0]![0]).toMatchObject({ header: "Update Counter for everyone?", danger: true })
    expect(published).toBe(1)
  })

  test("the second question answered no:  nothing published, the draft stays", async () => {
    mayPublish = true
    choose("update")
    confirm(false)
    await editor.leaveProject(example())
    expect(published).toBe(0)
    expect(discarded).toEqual([])
  })
})

describe("Save (⌘S) in an example (`editor.saveDraft()`)", () => {
  test("asks too;  Save as My App shows the copy", async () => {
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

/** The `<Choices>` showing now, once it's there. */
function shownChoices(): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const modal = document.querySelector<HTMLElement>(".Choices")
    if (!modal) throw new Error("no <Choices> yet")
    return modal
  })
}
