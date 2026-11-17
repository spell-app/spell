import { For, Show, createSignal, onSettled, untrack } from "solid-js"
import { render, type JSX } from "@solidjs/web"

import { setDebugGlobal } from "spell/util"
import { after, type CancelablePromise } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { codeLook, showBubbly, showCodeChoices } from "spell/app/app/ui/codePopups"
import { EDITOR_HOTKEYS, editorHotkeys } from "spell/app/app/pages/editorHotkeys"
import { CodeSettings, CodeSettingsPanel } from "spell/app/app/solid"
import { uiReady } from "spell/app/app/solid/loadUI"
import {
  CodeMirrorEditor,
  CodeMirrorMerge,
  CodeMirrorSetup,
  CodeSlice,
  FileEditor,
  SpellCodeMirror,
  type CompiledLanguage
} from "spell/app/app/solid/codemirror"
import { CodeMirrorMenu } from "./CodeMirrorMenu"

// Every Solid computation follows spell cells (the project's files)
import "spell/app/app/solid/cellsBridge"
// Spell's project groups (`@spell/examples` ...), so the project resolves
import "spell/app/spaces/models/projectGroups"
import "./CodeMirrorTest.css"

/****************
 * ### `<CodeMirrorTest>`
 * The CodeMirror demo page (epic `editor` P30), `/demo/codemirror.html` on the editor's dev server:
 * Solitaire's Spell in the app's code editor, CodeMirror 6, alone, for trying it and for headless checks
 * (epic `codemirror` J3).
 * - Three views, by the bar's buttons:
 *   - Edit:  Solitaire.spell, Card.spell or Card.editor.html (a property editor page, made here, never saved).
 *     Switching files keeps each one's undo, folds and selection (`FileStates`).
 *     Under a Spell file, a slice of it (`<CodeSlice>`):  the end of one block, cut, and the whole of the next;
 *     typing in one shows in the other.
 *   - Diff:  Publish's clash dialog's two sides, in the merge view
 *   - Compiled:  the file's compiled JavaScript, TypeScript or Python
 * - The look, bubbly or not, as the code pane's "Settings…" says (`codeLook`), by the bar too, or `?look=off`.
 * - The page's language (English, Español) and look (light, dark), by the bar too, or `?lang=es&scheme=dark`:
 *   CodeMirror's words follow the app's (`appTexts.lang`).
 * - Line numbers, off or on, as the app's View › Line Numbers (`?lines=on`).
 * - Settings…, the code pane's card (`<CodeSettingsPanel>`):  each choice changes the editors live
 *   (`CodeSettings`, `codeChoices`;  epic `codemirror` P5).
 * - The editor page's keys (`editorHotkeys()`), so ⌘Z with the focus off the code reaches the code's undo (I167),
 *   and the right-click menu's Cut, Copy and Paste are the Edit menu's;  Save (⌘S) saves the file now.
 * - `?project=@spell/examples/CajaDeRecetas`:  another project, its first file shown, e.g. a Spanish one for its
 *   accent fixes as you type.
 * - `?highlights=on`:  marks the uses of the word at the caret, which the app has off.
 * - `?view=diff`, `?file=Card`, `?target=python`:  a view, a file or a language at once.
 * - Each edit is saved 2 seconds after it, as the app's AutoSave saves;
 *   but NOTHING is written:  every write the page would send to the server is answered here (`answerWrites()`).
 * - What it measures, for a probe to read:  the debug global `codemirrorTest` (`timings`, `latencies`).
 * - Its position in the import graph:  a demo page's entry, importing CodeMirror's folders statically, as only it may.
 ****************/
function CodeMirrorTest(props: { project: SP.SpellProject }) {
  const query = new URLSearchParams(location.search)
  const [fileName, setFileName] = createSignal(
    FILE_QUERIES[query.get("file") ?? ""] ??
      spellFileQuery(query.get("file")) ??
      (query.get("project") ? nameOf(props.project.spellFiles[0]!.path) : "Solitaire.spell")
  )
  const [look, setLook] = createSignal(codeLook.isBubbly ? "on" : "off")
  const [target, setTarget] = createSignal<CompiledLanguage>(
    (query.get("target") as CompiledLanguage | null) ?? "javascript"
  )
  const [view, setView] = createSignal<TestView>((query.get("view") as TestView | null) ?? "edit")
  const [lang, setLang] = createSignal(query.get("lang") === "es" ? "es" : "en")
  const [scheme, setScheme] = createSignal(query.get("scheme") === "dark" ? "dark" : "light")
  const [lines, setLines] = createSignal(query.get("lines") === "on" ? "on" : "off")
  const fileOf = (name: string): SP.AnySpellFile =>
    name === EDITOR_PAGE
      ? editorPage(props.project)
      : props.project.spellFiles.find((file) => file.path.endsWith(`/${name}`))!
  const spellFileOf = (name: string) => fileOf(name) as SP.SpellFile
  const changeLook = (next: string) => {
    setLook(next)
    showBubbly(next === "on")
  }
  const changeLang = (next: string) => {
    setLang(next)
    void showLanguage(next)
  }
  const changeScheme = (next: string) => {
    setScheme(next)
    showScheme(next)
  }
  const changeLines = (next: string) => {
    setLines(next)
    if (codeMirror) CodeMirrorSetup.showLineNumbers(codeMirror.view, next === "on")
  }
  /** The CodeMirror editor, once it shows a file. */
  let codeMirror: SpellCodeMirror | undefined
  // the editor page's keys, never in Run here
  editorHotkeys(() => false)
  return (
    <div class="CodeMirrorTest">
      <header>
        <h1>CodeMirror test</h1>
        <Choice
          label="View"
          value={view()}
          options={[
            ["edit", "Edit"],
            ["diff", "Diff"],
            ["compiled", "Compiled"]
          ]}
          onPick={(next) => setView(next as TestView)}
        />
        <Show when={view() !== "diff"}>
          <Choice
            label="File"
            value={fileName()}
            options={[
              ["Solitaire.spell", "Solitaire.spell"],
              ["Card.spell", "Card.spell"],
              [EDITOR_PAGE, EDITOR_PAGE]
            ]}
            onPick={setFileName}
          />
        </Show>
        <Show when={view() === "compiled"}>
          <Choice
            label="Target"
            value={target()}
            options={[
              ["javascript", "JavaScript"],
              ["typescript", "TypeScript"],
              ["python", "Python"]
            ]}
            onPick={(next) => setTarget(next as CompiledLanguage)}
          />
        </Show>
        <Choice
          label="Bubbly look"
          value={look()}
          options={[
            ["on", "Bubbly"],
            ["off", "Not bubbly"]
          ]}
          onPick={changeLook}
        />
        <Choice
          label="Language"
          value={lang()}
          options={[
            ["en", "English"],
            ["es", "Español"]
          ]}
          onPick={changeLang}
        />
        <Choice
          label="Look"
          value={scheme()}
          options={[
            ["light", "Light"],
            ["dark", "Dark"]
          ]}
          onPick={changeScheme}
        />
        <Choice
          label={appTexts.text("lineNumbers")}
          value={lines()}
          options={[
            ["off", "No line numbers"],
            ["on", appTexts.text("lineNumbers")]
          ]}
          onPick={changeLines}
        />
        <ui-button size="small" icon="cog" onClick={() => CodeSettings.toggleShowing()}>
          {appTexts.text("codeSettings")}
        </ui-button>
      </header>
      <Show when={CodeSettings.isShowing}>
        <div class="CodeMirrorTestSettings">
          <CodeSettingsPanel />
        </div>
      </Show>
      <Show when={view() === "edit"}>
        <Sides
          codemirror={
            <CodeMirrorSide
              file={fileOf(fileName())}
              onOpen={(path) => setFileName(nameOf(path))}
              onMount={(editor) => {
                codeMirror = editor
                if (untrack(lines) === "on") CodeMirrorSetup.showLineNumbers(editor.view, true)
              }}
            />
          }
        />
        <Show when={fileName() !== EDITOR_PAGE ? fileName() : undefined} keyed>
          {(name) => {
            const lines = sliceOf(spellFileOf(name))
            return <Sides class="Slices" codemirror={<CodeSlice file={fileOf(name)} {...lines} />} />
          }}
        </Show>
      </Show>
      <Show when={view() === "diff"}>
        <Sides codemirror={<CodeMirrorDiff clash={clashOf(spellFileOf("Card.spell"))} />} />
      </Show>
      <Show when={view() === "compiled"}>
        <Show when={`${fileName() === EDITOR_PAGE ? "Card.spell" : fileName()}:${target()}`} keyed>
          {(shown) => {
            const [name, language] = shown.split(":") as [string, CompiledLanguage]
            const text = compiledOf(spellFileOf(name), language)
            return <Sides codemirror={<CodeMirrorCompiled text={text} language={language} />} />
          }}
        </Show>
      </Show>
    </div>
  )
}

/** What the page shows. */
type TestView = "edit" | "diff" | "compiled"

/** The CodeMirror editor, with its caption. */
function Sides(props: { codemirror: JSX.Element; class?: string }) {
  return (
    <div class={["CodeMirrorTestSides", props.class]}>
      <section class="CodeMirror">
        <h2>CodeMirror 6</h2>
        <div class="Pane">{props.codemirror}</div>
      </section>
    </div>
  )
}

/** A row of buttons picking one of `options`, each `[value, words]`. */
function Choice(props: { label: string; value: string; options: string[][]; onPick: (value: string) => void }) {
  return (
    <ui-buttons size="small" aria-label={props.label}>
      <For each={props.options}>
        {(option) => (
          <ui-button
            size="small"
            color={props.value === option[0] ? "primary" : undefined}
            onClick={() => props.onPick(option[0]!)}
          >
            {option[1]}
          </ui-button>
        )}
      </For>
    </ui-buttons>
  )
}

////////////////
// ## CodeMirror's side
////////////////

/**
 * `file` in a CodeMirror editor, with the page's right-click menu.
 * - ONE editor for every file:  a new `file` is shown in it, each file's state kept (`<FileEditor>`).
 */
function CodeMirrorSide(props: CodeMirrorSideProps) {
  const started = nowMsec()
  return (
    <div class="Editor">
      <FileEditor
        file={props.file}
        onOpen={(location) => {
          props.onOpen(location.path)
          return true
        }}
        onContextMenu={(editor, at) => void CodeMirrorMenu.open(editor, at)}
        onReferences={(editor, at, locations) => CodeMirrorMenu.openReferences(editor, at, locations)}
        hotkeys={TEST_HOTKEYS}
        highlights={new URLSearchParams(location.search).get("highlights") === "on"}
        onMount={(editor) => {
          timings.codemirror ??= { madeMsec: nowMsec() - started }
          afterPaint(() => (timings.codemirror!.firstDrawAtMsec ??= nowMsec()))
          setDebugGlobal({ codemirror: editor, codemirrorStates: SpellCodeMirror.states })
          props.onMount(editor)
        }}
      />
    </div>
  )
}

/** Props for `<CodeMirrorSide>`. */
type CodeMirrorSideProps = {
  /** the file shown */
  file: SP.AnySpellFile
  /** show the file at `path`, e.g. a definition's */
  onOpen: (path: string) => void
  /** the editor's made */
  onMount: (editor: SpellCodeMirror) => void
}

/** Publish's two sides in CodeMirror's merge view. */
function CodeMirrorDiff(props: { clash: Clash }) {
  let merge: CodeMirrorMerge | undefined
  let element!: HTMLDivElement
  onSettled(() => {
    merge = new CodeMirrorMerge(element, {
      theirs: props.clash.theirs,
      mine: props.clash.mine,
      words: { take: appTexts.text("publishClashTake"), putBack: appTexts.text("publishClashPutBack") }
    })
    setDebugGlobal({ codemirrorMerge: merge })
    return () => merge?.destroy()
  })
  return <div class="Editor" ref={(div: HTMLDivElement) => (element = div)} />
}

/** Compiled code in CodeMirror, read only. */
function CodeMirrorCompiled(props: { text: string; language: CompiledLanguage }) {
  return (
    <div class="Editor">
      <CodeMirrorEditor value={props.text} extensions={SpellCodeMirror.codeExtensions(props.language)} />
    </div>
  )
}

////////////////
// ## The page's data
////////////////

/** A file's two sides, as Publish's clash dialog shows them. */
type Clash = { theirs: string; mine: string }

/** `file` as published, and a draft of it with a few changes:  what the clash dialog shows. */
function clashOf(file: SP.SpellFile): Clash {
  const theirs = file.contents ?? ""
  const mine = theirs
    .replace("Ace is low:  ace = 1 ... king = 13", "Ace is low:  ace = 1, king = 13")
    .replace(
      'it "is a number card" if it is not a face card\n',
      'it "is a number card" if it is not a face card\n\tit "is a picture card" if it is a face card\n'
    )
    .replace("its value should be 12", "its value should be 12  // a queen")
    .replace('\t\t"♠" otherwise\n', '\t\t"♠" if it is a spade\n')
  return { theirs, mine }
}

/** `file` compiled to `language`, as the editor's compiled-code pane shows it. */
function compiledOf(file: SP.SpellFile, language: CompiledLanguage): string {
  return SpellCodeMirror.service.compiled(file, COMPILED_TARGETS[language])
}

/** Each compiled language's target, as the language service names it. */
const COMPILED_TARGETS = { javascript: "js", typescript: "ts", python: "py" } as const

/** The property editor page the page shows:  an HTML file, made here, never saved. */
const EDITOR_PAGE = "Card.editor.html"

/** The file each `?file=` shows. */
const FILE_QUERIES: Record<string, string> = { Card: "Card.spell", editor: EDITOR_PAGE, Solitaire: "Solitaire.spell" }

/** A `?file=` naming one of the project's Spell files itself, `StarWars.api.spell` (epic `language` I141). */
function spellFileQuery(file: string | null): string | undefined {
  return file?.endsWith(".spell") ? file : undefined
}

/**
 * `project`'s property editor page for its cards, `Card.editor.html`:  a page as "New Property Editor..." makes one,
 * tweaked by hand (an element alone, a group, a line of text), so the bubbly look's every HTML shape shows.
 */
function editorPage(project: SP.SpellProject): SP.AnySpellFile {
  const file = SP.SpellProject.getFileForPath(`${project.path}/${EDITOR_PAGE}`)
  file.contents ??= CARD_EDITOR_PAGE
  return file
}

/** The text of `editorPage()`. */
const CARD_EDITOR_PAGE = `<ui-property-editor schema="Card" label="Card">
  <ui-property name="rank" as="dropdown"></ui-property>
  <ui-property name="suit" as="buttons" hint="Its symbol and colour follow."></ui-property>
  <ui-property-group label="Look" collapsible>
    <ui-property name="direction" as="toggle"></ui-property>
    <p>Face up or down, <b>as dealt</b>.</p>
  </ui-property-group>
  <ui-divider />
</ui-property-editor>
`

/**
 * The lines of `file` a slice shows:  the last two of the block before `its "shorthand" is`, cut, then the whole of it
 * -- or its first ten lines, when it has none.
 */
function sliceOf(file: SP.SpellFile): { from: number; to: number } {
  const lines = (file.contents ?? "").split("\n")
  const head = lines.findIndex((line) => line.includes('"shorthand" is'))
  if (head < 0) return { from: 1, to: 10 }
  return { from: head - 1, to: head + 5 }
}

/** A file's name, from its path. */
function nameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

////////////////
// ## Measuring
////////////////

/** When each editor was made and first drawn, in msec from the page's start:  for a probe to read. */
const timings: {
  /** Solitaire loaded and parsed, the editor's starting point */
  projectReadyAtMsec?: number
  codemirror?: { madeMsec: number; firstDrawAtMsec?: number }
} = {}

/**
 * How long each key typed took to show, in msec:  from its `keydown` to the frame after it's drawn.
 * - Read by a probe that types into the editor.
 */
const latencies: number[] = []

/** Note each key's latency, page-wide. */
function measureTyping() {
  document.addEventListener(
    "keydown",
    () => {
      const started = nowMsec()
      afterPaint(() => latencies.push(nowMsec() - started))
    },
    { capture: true }
  )
}

/** Msec since the page started loading. */
function nowMsec(): number {
  return performance.now()
}

/** Call `done` once the browser has drawn the next frame. */
function afterPaint(done: () => void) {
  requestAnimationFrame(() => setTimeout(done, 0))
}

////////////////
// ## The page
////////////////

/**
 * Answer every write the page would send to the server here, so nothing is saved:
 * a compile's build files, preferences, a file saved.
 * - Reads go through.
 */
function answerWrites() {
  const fetchBefore = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
    if (method === "GET" || method === "HEAD") return fetchBefore(input, init)
    return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }))
  }
}

/** The page light or dark:  Spell UI's class on `<html>`, and the scheme. */
function showScheme(scheme: string) {
  const root = document.documentElement
  root.classList.toggle("ui-dark", scheme === "dark")
  root.classList.toggle("ui-light", scheme !== "dark")
  root.style.colorScheme = scheme
}

/** The page's words in `lang`:  the app's (Spell UI's with them), which CodeMirror's follow. */
async function showLanguage(lang: string) {
  document.documentElement.lang = lang
  await appTexts.useLanguage(lang)
}

/**
 * Save `file` 2 seconds after its last edit (the phase's Goal, and the app's AutoSave):
 * answered here, nothing written.
 * - One wait per file:  an edit to another file doesn't put this one's off.
 */
function saveSoon(file: SP.AnySpellFile) {
  saveWaits.get(file.path)?.cancel()
  const wait = after(SAVE_AFTER_MSEC / 1000, () => {
    saveWaits.delete(file.path)
    saves.push(file.path)
    return Promise.resolve(file.save(undefined)).catch((error: unknown) =>
      console.warn(`CodeMirror test:  couldn't save ${file.path}`, error)
    )
  })
  saveWaits.set(file.path, wait)
}

/**
 * The editor page's keys, as the page's CodeMirror editor takes them:  Save saves the file shown now, as nothing here
 * has the app's project for `editor.saveAll()`.
 */
const TEST_HOTKEYS = {
  ...EDITOR_HOTKEYS,
  saveAll: { ...EDITOR_HOTKEYS.saveAll, run: () => saveAllNow() }
}

/** Save every file waiting to be, now. */
function saveAllNow() {
  for (const [path, wait] of saveWaits) {
    wait.cancel()
    saveWaits.delete(path)
    saves.push(path)
  }
}

/** How long after its last edit a file is saved, in msec. */
const SAVE_AFTER_MSEC = 2000

/** Each file's wait to be saved, by path. */
const saveWaits = new Map<string, CancelablePromise<unknown>>()

/** Each file saved, by path, in order:  for a probe to read. */
const saves: string[] = []

/** Load Solitaire, parse it, and draw the page. */
async function start() {
  answerWrites()
  SpellCodeMirror.onEdit(saveSoon)
  measureTyping()
  const query = new URLSearchParams(location.search)
  showScheme(query.get("scheme") === "dark" ? "dark" : "light")
  // what Settings… has chosen, as the app starts on
  showCodeChoices(CodeSettings.choices)
  if (query.get("look") === "off") showBubbly(false)
  await uiReady
  if (query.get("lang") === "es") await showLanguage("es")
  const project = new SP.SpellProject(SP.SpellProject.projectIdForImport(query.get("project") ?? PROJECT))
  await project.load()
  await project.parse()
  timings.projectReadyAtMsec = nowMsec()
  setDebugGlobal({ codemirrorTest: { project, timings, latencies, saves } })
  render(() => <CodeMirrorTest project={project} />, document.getElementById("codemirror-test")!)
}

/** The project the page shows, unless `?project=` names another (`@spell/examples/CajaDeRecetas`, for Spanish). */
const PROJECT = "@spell/examples/Solitaire"

void start().catch((error: unknown) => console.error("CodeMirror test:  couldn't start", error))
