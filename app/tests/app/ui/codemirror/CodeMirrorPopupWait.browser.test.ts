import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { autocompletion, startCompletion } from "@codemirror/autocomplete"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"
import { CODE_POPUP_DEFAULTS, codeChoices, hoverDelay, showCodeChoices } from "spell/app/app/ui/codePopups"
import { CodeMirrorLanguage } from "spell/app/app/ui/codemirror/CodeMirrorLanguage"
import type { LanguageClient } from "spell/app/app/ui/codemirror/LanguageClient"
import { CodeMirrorPopups } from "spell/app/app/ui/codemirror/CodeMirrorPopups"
import { CodeMirrorSetup } from "spell/app/app/ui/codemirror/CodeMirrorSetup"

/**
 * The popups that show by themselves as Spell is typed wait for the typing to pause `hoverDelay()` (epic `codemirror`
 * I22, Owen:  "the auto-help pops up waayy too fast"):  the suggestion list, signature help.
 * - Keys typed 80 msec apart, as a quick typist's:  nothing shows between them.
 * - What's asked for by name (Ctrl+Space) shows at once.
 * - Settings… › "Delay before showing help" changes the wait, in editors already open too (T19).
 * - A real `CodeMirrorLanguage`, its language service and file stand-ins:  no project, no parse.
 */
describe("popups wait for a pause in the typing (I22)", () => {
  let view: EditorView | undefined

  beforeEach(() => {
    codeChoices.now = { ...CODE_POPUP_DEFAULTS, suggest: "everywhere", parameterHints: true }
  })

  afterEach(() => {
    view?.destroy()
    view = undefined
    codeChoices.now = CODE_POPUP_DEFAULTS
  })

  /** An editor of Spell holding `doc`, the caret at its end, with the language's suggestions and signature help. */
  async function editorOf(doc: string): Promise<EditorView> {
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 300px"
    document.body.append(host)
    const service = {
      completion: () => ({ items: [{ label: "action" }, { label: "actions" }] }),
      foldingRanges: () => [],
      documentSymbols: () => [],
      signatureHelp: () => ({ signatures: [{ label: "move (a card) to (a pile)", parameters: [] }] })
    } as unknown as LSP.SpellLanguageService
    // what answers its requests:  the stand-in service, as the page's own client asks it (`LanguageClient.inThread()`)
    const answers: Record<string, () => unknown> = {
      "textDocument/completion": () => service.completion(file, { line: 0, character: 0 }),
      "textDocument/signatureHelp": () => service.signatureHelp(file, { line: 0, character: 0 })
    }
    const client = {
      answersOnPage: () => true,
      request: async (method: string) => answers[method]?.() ?? null
    } as unknown as LanguageClient
    // the file always holds the editor's text, as one just parsed
    const file = {
      match: {},
      language: SP.Language.for("en"),
      get contents() {
        return view?.state.doc.toString()
      }
    } as unknown as SP.SpellFile
    const language = new CodeMirrorLanguage({ service, client, file, parseNow: () => {} })
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [
        autocompletion({ override: [language.completions], icons: false }),
        language.extensions(),
        CodeMirrorPopups.extension(),
        CodeMirrorSetup.extensions()
      ]
    })
    view = new EditorView({ parent: host, state })
    view.focus()
    // settled:  the settings' follower takes them in a microtask, and a new completion plugin starts what's pending
    await sleep(100)
    return view
  }

  /** Type `text` a key at a time, `gap` msec apart, as the keyboard's typing does;  fails if `popup` shows meanwhile. */
  async function type(code: EditorView, text: string, popup: string, gap = 80) {
    for (const key of text) {
      const at = code.state.selection.main.head
      code.dispatch({ changes: { from: at, insert: key }, selection: { anchor: at + 1 }, userEvent: "input.type" })
      await sleep(gap)
      expect(document.querySelector(popup), `${popup} showed while typing ${JSON.stringify(text)}`).toBeNull()
    }
    return performance.now()
  }

  /** How long after `since` `popup` shows, in msec. */
  async function showsAfter(popup: string, since: number): Promise<number> {
    await vi.waitUntil(() => document.querySelector(popup), { timeout: 3000, interval: 10 })
    return performance.now() - since
  }

  const SUGGESTIONS = ".cm-tooltip-autocomplete"
  const SIGNATURE = ".cmb-signature"
  const WAIT = hoverDelay() * 1000

  test("the suggestion list:  none between quick keys;  once the typing pauses, after the wait", async () => {
    const code = await editorOf("\t")
    const lastKey = await type(code, "<action the card <ac", SUGGESTIONS)
    const wait = await showsAfter(SUGGESTIONS, lastKey)
    expect(wait).toBeGreaterThanOrEqual(WAIT - 100)
    expect(wait).toBeLessThan(WAIT + 1000)
  })

  test("Ctrl+Space shows the list at once", async () => {
    const code = await editorOf("\t<act")
    const asked = performance.now()
    startCompletion(code)
    expect(await showsAfter(SUGGESTIONS, asked)).toBeLessThan(WAIT / 2)
  })

  test('Delay before showing help "Short":  the page\'s hover delay 400 msec, and the list waits that, in an editor already open', async () => {
    const code = await editorOf("\t")
    showCodeChoices({ ...codeChoices.now, popupDelay: "short" })
    try {
      expect(getComputedStyle(document.documentElement).getPropertyValue("--ui-hover-delay").trim()).toBe("400ms")
      expect(hoverDelay()).toBe(0.4)
      await sleep(50)
      const lastKey = await type(code, "<action the card <ac", SUGGESTIONS)
      const wait = await showsAfter(SUGGESTIONS, lastKey)
      expect(wait).toBeGreaterThanOrEqual(400 - 100)
      expect(wait).toBeLessThan(WAIT - 100)
    } finally {
      showCodeChoices({ ...codeChoices.now, popupDelay: "standard" })
    }
    expect(document.documentElement.style.getPropertyValue("--ui-hover-delay")).toBe("")
    expect(hoverDelay()).toBe(0.8)
  })

  test('Delay before showing help "Long":  1.5 seconds;  nothing shows before', async () => {
    const code = await editorOf("\t")
    showCodeChoices({ ...codeChoices.now, popupDelay: "long" })
    try {
      await sleep(50)
      const lastKey = await type(code, "<action the card <ac", SUGGESTIONS)
      const wait = await showsAfter(SUGGESTIONS, lastKey)
      expect(wait).toBeGreaterThanOrEqual(1500 - 100)
    } finally {
      showCodeChoices({ ...codeChoices.now, popupDelay: "standard" })
    }
  })

  test("signature help:  a space asks for it, but it waits for the typing to pause", async () => {
    const code = await editorOf("\tmove")
    const lastKey = await type(code, " the card to", SIGNATURE)
    const wait = await showsAfter(SIGNATURE, lastKey)
    expect(wait).toBeGreaterThanOrEqual(WAIT - 100)
  })
})

/** Wait `msec`. */
const sleep = (msec: number) => new Promise((resolve) => setTimeout(resolve, msec))
