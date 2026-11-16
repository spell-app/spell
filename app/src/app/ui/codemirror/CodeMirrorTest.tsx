import { For, Show, createComponent, createSignal, onSettled, untrack } from "solid-js"
import { render, type JSX } from "@solidjs/web"
import type { MergeView } from "@codemirror/merge"

import { setDebugGlobal } from "spell/util"
import { after, type CancelablePromise } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { uiReady } from "spell/app/app/solid/loadUI"
import {
  CodeMirrorEditor,
  CodeMirrorMenu,
  CodeMirrorSetup,
  FileEditor,
  SpellCodeMirror
} from "spell/app/app/solid/codemirror"

// Every Solid computation follows spell cells (the project's files)
import "spell/app/app/solid/cellsBridge"
// Spell's project groups (`@spell/examples` ...), so the project resolves
import "spell/app/spaces/models/projectGroups"
import "./CodeMirrorTest.css"

/****************
 * ### `<CodeMirrorTest>`
 * The CodeMirror test page (epic `editor` P30), `/demo/codemirror.html` on the editor's dev server:
 * Solitaire's Spell in Monaco and in CodeMirror 6, side by side, so Owen can judge a move.
 * - Three views, by the bar's buttons:
 *   - Edit:  the same file in both editors, Solitaire.spell or Card.spell;  typing in one shows in the other.
 *     Switching files keeps each one's undo, folds and selection, in both (CodeMirror's `FileStates`).
 *   - Diff:  Publish's clash dialog's two sides, CodeMirror's merge view above Monaco's diff editor
 *   - Compiled:  the file's compiled javascript in both
 * - The page's language (English, Español) and look (light, dark), by the bar too, or `?lang=es&scheme=dark`:
 *   CodeMirror's words follow the app's (`appTexts.lang`).
 * - Line numbers, off or on, as the app's View › Line Numbers:  CodeMirror's alone (`?lines=on`).
 * - `?only=cm` or `?only=monaco`:  one editor alone, for measuring it (`?view=diff`, `?file=Card` likewise).
 * - Each edit is saved 2 seconds after it, as the app's AutoSave saves (after 800 msec);
 *   but NOTHING is written:  every write the page would send to the server is answered here (`answerWrites()`).
 * - What it measures, for a probe to read:  the debug global `codemirrorTest` (`timings`, `latencies`).
 * - Its position in the import graph:  a demo page's entry;  Monaco loads lazily, as in the app.
 ****************/
function CodeMirrorTest(props: { project: SP.SpellProject }) {
  const query = new URLSearchParams(location.search)
  const [fileName, setFileName] = createSignal(query.get("file") === "Card" ? "Card.spell" : "Solitaire.spell")
  const [view, setView] = createSignal<TestView>((query.get("view") as TestView | null) ?? "edit")
  const [lang, setLang] = createSignal(query.get("lang") === "es" ? "es" : "en")
  const [scheme, setScheme] = createSignal(query.get("scheme") === "dark" ? "dark" : "light")
  const [lines, setLines] = createSignal(query.get("lines") === "on" ? "on" : "off")
  const only = query.get("only")
  const fileOf = (name: string) => props.project.spellFiles.find((file) => file.path.endsWith(`/${name}`))!
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
              ["Card.spell", "Card.spell"]
            ]}
            onPick={setFileName}
          />
        </Show>
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
      </header>
      <Show when={view() === "edit"}>
        <Sides
          only={only}
          monaco={<MonacoSide file={fileOf(fileName())} />}
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
      </Show>
      <Show when={view() === "diff"}>
        <Sides
          only={only}
          monaco={<MonacoDiff clash={clashOf(fileOf("Card.spell"))} />}
          codemirror={<CodeMirrorDiff clash={clashOf(fileOf("Card.spell"))} />}
        />
      </Show>
      <Show when={view() === "compiled"}>
        <Show when={fileName()} keyed>
          {(name) => (
            <Sides
              only={only}
              monaco={<MonacoCompiled text={compiledOf(fileOf(name))} />}
              codemirror={<CodeMirrorCompiled text={compiledOf(fileOf(name))} />}
            />
          )}
        </Show>
      </Show>
    </div>
  )
}

/** What the page shows. */
type TestView = "edit" | "diff" | "compiled"

/** The two editors side by side, each with its caption;  `only` one of them, when asked. */
function Sides(props: { only: string | null; monaco: JSX.Element; codemirror: JSX.Element }) {
  return (
    <div class="CodeMirrorTestSides">
      <Show when={props.only !== "cm"}>
        <section class="Monaco">
          <h2>Monaco (today's editor)</h2>
          <div class="Pane">{props.monaco}</div>
        </section>
      </Show>
      <Show when={props.only !== "monaco"}>
        <section class="CodeMirror">
          <h2>CodeMirror 6</h2>
          <div class="Pane">{props.codemirror}</div>
        </section>
      </Show>
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
  file: SP.SpellFile
  /** show the file at `path`, e.g. a definition's */
  onOpen: (path: string) => void
  /** the editor's made */
  onMount: (editor: SpellCodeMirror) => void
}

/** Publish's two sides in CodeMirror's merge view. */
function CodeMirrorDiff(props: { clash: Clash }) {
  let merge: MergeView | undefined
  let element!: HTMLDivElement
  onSettled(() => {
    merge = SpellCodeMirror.merge(element, { theirs: props.clash.theirs, mine: props.clash.mine })
    setDebugGlobal({ codemirrorMerge: merge })
    return () => merge?.destroy()
  })
  return <div class="Editor" ref={(div: HTMLDivElement) => (element = div)} />
}

/** Compiled javascript in CodeMirror, read only. */
function CodeMirrorCompiled(props: { text: string }) {
  return (
    <div class="Editor">
      <CodeMirrorEditor value={props.text} extensions={SpellCodeMirror.codeExtensions()} />
    </div>
  )
}

////////////////
// ## Monaco's side
////////////////

/** `spell/app/app/solid/monaco`, loaded once, lazily, as the app loads it. */
let monacoModule: Promise<MonacoModule> | undefined
type MonacoModule = typeof import("spell/app/app/solid/monaco")

/** Load Monaco and its Spell, once;  the time it took goes in `timings`. */
function loadMonaco(): Promise<MonacoModule> {
  monacoModule ??= (async () => {
    const started = nowMsec()
    const module = await import("spell/app/app/solid/monaco")
    timings.monaco = { loadMsec: nowMsec() - started }
    return module
  })()
  return monacoModule
}

/** Draw `make(module)` once Monaco has loaded. */
function WithMonaco(props: { make: (module: MonacoModule) => JSX.Element }) {
  const [module, setModule] = createSignal<MonacoModule>()
  onSettled(() => {
    void loadMonaco().then((loaded) => setModule(() => loaded))
  })
  return (
    <Show when={module()} keyed fallback={<p class="Loading">Loading Monaco…</p>}>
      {(loaded) => props.make(loaded)}
    </Show>
  )
}

/** `file` in today's Monaco editor, its model the app's (`SpellMonaco.models`). */
function MonacoSide(props: { file: SP.SpellFile }) {
  return (
    <WithMonaco
      make={(module) => {
        // its models stay while the page shows the project:  read once, as it mounts
        module.SpellMonaco.models.use(untrack(() => props.file.project))
        return createComponent(module.MonacoEditor, {
          get model() {
            return module.SpellMonaco.models.modelFor(props.file)
          },
          onMount: (editor) => {
            const madeAt = nowMsec()
            timings.monaco = { ...timings.monaco, madeAtMsec: madeAt }
            afterPaint(() => (timings.monaco!.firstDrawAtMsec ??= nowMsec()))
            setDebugGlobal({ monaco: editor })
          }
        })
      }}
    />
  )
}

/** Publish's two sides in Monaco's diff editor, as `<PublishClash>` shows them. */
function MonacoDiff(props: { clash: Clash }) {
  return (
    <WithMonaco
      make={(module) =>
        createComponent(module.DiffView, { theirs: props.clash.theirs, mine: props.clash.mine, onChange: () => {} })
      }
    />
  )
}

/** Compiled javascript in Monaco, read only. */
function MonacoCompiled(props: { text: string }) {
  return (
    <WithMonaco
      make={(module) =>
        createComponent(module.MonacoEditor, {
          value: props.text,
          language: "javascript",
          options: { readOnly: true, lineNumbers: "on", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }
        })
      }
    />
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

/** `file`'s compiled javascript, as the editor's compiled-code pane shows it. */
function compiledOf(file: SP.SpellFile): string {
  return SpellCodeMirror.service.compiled(file, "js")
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
  /** Solitaire loaded and parsed, both editors' starting point */
  projectReadyAtMsec?: number
  codemirror?: { madeMsec: number; firstDrawAtMsec?: number }
  monaco?: { loadMsec?: number; madeAtMsec?: number; firstDrawAtMsec?: number }
} = {}

/**
 * How long each key typed took to show, in msec:  from its `keydown` to the frame after it's drawn.
 * - Read by a probe that types into one editor alone (`?only=cm`, `?only=monaco`).
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
 * Answer every write the page would send to the server here, so nothing is saved:  a compile's build files,
 * preferences, a file saved.  Reads go through.
 */
function answerWrites() {
  const fetchBefore = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
    if (method === "GET" || method === "HEAD") return fetchBefore(input, init)
    return Promise.resolve(new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }))
  }
}

/** The page light or dark:  Spell UI's class on `<html>`, which Monaco's colours follow too, and the scheme. */
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
 * Save `file` 2 seconds after its last edit (the phase's Goal;  the app's AutoSave waits 800 msec):
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

/** How long after its last edit a file is saved, in msec. */
const SAVE_AFTER_MSEC = 2000

/** Each file's wait to be saved, by path. */
const saveWaits = new Map<string, CancelablePromise<unknown>>()

/** Each file saved, by path, in order:  for a probe to read. */
const saves: string[] = []

/** Load Solitaire, parse it, and draw the page. */
async function start() {
  answerWrites()
  SpellCodeMirror.states.onEdit = saveSoon
  measureTyping()
  const query = new URLSearchParams(location.search)
  showScheme(query.get("scheme") === "dark" ? "dark" : "light")
  await uiReady
  if (query.get("lang") === "es") await showLanguage("es")
  const project = new SP.SpellProject(SP.SpellProject.projectIdForImport(PROJECT))
  await project.load()
  await project.parse()
  timings.projectReadyAtMsec = nowMsec()
  setDebugGlobal({ codemirrorTest: { project, timings, latencies, saves } })
  render(() => <CodeMirrorTest project={project} />, document.getElementById("codemirror-test")!)
}

/** The project the page shows. */
const PROJECT = "@spell/examples/Solitaire"

void start().catch((error: unknown) => console.error("CodeMirror test:  couldn't start", error))
