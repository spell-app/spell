import { lazy, type Component } from "solid-js"

import { editor } from "spell/app/app/editor"
import { editorHostNames } from "spell/app/app/layout/editorNames"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import type {
  CodeMirrorEditorProps,
  ConsoleLineEditorProps,
  CodeSliceProps,
  DiffViewProps,
  FileEditorProps
} from "spell/app/app/solid/codemirror"

/**
 * The app's Solid CodeMirror editors, loaded on first use:
 * the editor is a big part of the app's code, and only the editor page needs it, after the program compiles and runs.
 * - Each MUST go inside a `<Loading>`, whose fallback shows while it loads,
 *   e.g. `<Loading fallback={<LazyCodeMirror.Loading />}>`.
 * - SIDE EFFECT, once loaded:  listens to the files' states, so edits compile soon (`editor.onFileEdited()`),
 *   and puts the side bar's edits through them (`editor.codeEditorEdits`).
 * - SIDE EFFECT, once loaded:  hands the editor a scope explorer on its language service,
 *   for the Types tab (`editor.setScopeExplorer()`).
 * - SIDE EFFECT, once loaded:  hands the language service the names the editor fills in its own Spell
 *   (`editorHostNames()`), so renaming one there is an error as it's typed (epic `editor` I123).
 * - SIDE EFFECT, once loaded:  puts `SpellCodeMirror` on `globalThis` for console debugging,
 *   as `debug.ts` does for everything else.
 * - Every CodeMirror editor follows the code pane's settings by itself (`CodeMirrorPopups`, `codeChoices`).
 * - NOTE: `spell/app/app/solid/codemirror` is NOT in the `spell/app/app/solid` barrel:
 *   anything importing it statically would pull CodeMirror into the main bundle.
 *   Import its TYPES only, elsewhere.
 */
export const LazyCodeMirror = {
  /** `<CodeMirrorEditor>` -- see `spell/app/app/solid/codemirror/CodeMirrorEditor`. */
  CodeMirrorEditor: lazy<Component<CodeMirrorEditorProps>>(async () => ({
    default: (await loadCodeMirror()).CodeMirrorEditor
  })),
  /** `<FileEditor>` -- see `spell/app/app/solid/codemirror/FileEditor`. */
  FileEditor: lazy<Component<FileEditorProps>>(async () => ({
    default: (await loadCodeMirror()).FileEditor
  })),
  /** `<CodeSlice>`, a few lines of a file -- see `spell/app/app/solid/codemirror/CodeSlice`. */
  CodeSlice: lazy<Component<CodeSliceProps>>(async () => ({
    default: (await loadCodeMirror()).CodeSlice
  })),
  /** `<DiffView>`, two texts side by side -- see `spell/app/app/solid/codemirror/DiffView`. */
  DiffView: lazy<Component<DiffViewProps>>(async () => ({
    default: (await loadCodeMirror()).DiffView
  })),
  /** `<ConsoleLineEditor>`, the Spell Console's line -- see `spell/app/app/solid/codemirror/ConsoleLineEditor`. */
  ConsoleLineEditor: lazy<Component<ConsoleLineEditorProps>>(async () => ({
    default: (await loadCodeMirror()).ConsoleLineEditor
  })),
  /**
   * The module itself, loaded once and connected:  for what isn't a component, e.g. the language service
   * an action's rename asks (`Inspector.renameAction()`, epic `editor` I111).
   */
  load: () => loadCodeMirror(),
  /** What to show while CodeMirror loads. */
  Loading() {
    return <div class="CodeMirrorEditor">{appTexts.text("loadingEditor")}</div>
  }
}

/** The `spell/app/app/solid/codemirror` module, as `LazyCodeMirror` loads it. */
export type CodeMirrorModule = typeof import("spell/app/app/solid/codemirror")

/** The `spell/app/app/solid/codemirror` module, loaded once and connected to `editor` -- see `LazyCodeMirror`. */
let loading: Promise<CodeMirrorModule> | undefined

/** Load `spell/app/app/solid/codemirror` once, and connect it -- see `LazyCodeMirror`. */
function loadCodeMirror(): Promise<CodeMirrorModule> {
  loading ??= import("spell/app/app/solid/codemirror").then(async (module) => {
    const { SpellCodeMirror } = module
    // what a person asks of the code answered off the page's thread, where the worker can load the projects
    if (!isStaticBuild && typeof Worker !== "undefined") {
      const { startLanguageWorker } = await import("spell/app/app/ui/codemirror/startLanguageWorker")
      SpellCodeMirror.languageWorker = startLanguageWorker
    }
    SpellCodeMirror.onEdit((file) => editor.onFileEdited(file))
    SpellCodeMirror.onTaken((file) => editor.onFileTextTaken(file))
    editor.codeEditorEdits = (file, edits, way) => SpellCodeMirror.states.applyEdits(file, edits, way)
    editor.compileElsewhere = (project) => SpellCodeMirror.states.client.compile(project)
    editor.oldFormsElsewhere = (file) => SpellCodeMirror.states.oldForms(file)
    // the Types tab's tree, from the same language service:  `spell/app/lsp` is already in CodeMirror's chunk
    const { LSP } = await import("spell/app/lsp")
    const { service } = SpellCodeMirror
    editor.setScopeExplorer(new LSP.ScopeExplorer(service))
    service.hostNames.push(editorHostNames((name) => appTexts.text("editorNameNeeded", { name })))
    Object.assign(globalThis, { SpellCodeMirror })
    return module
  })
  return loading
}
