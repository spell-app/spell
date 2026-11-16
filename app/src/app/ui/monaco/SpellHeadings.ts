import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { monaco } from "./monaco"

/**
 * Heading comments -- `#`, `##` ... at the start of a line, after any indent -- in bold, in every spell model.
 * - By DECORATION, NOT theme:  each heading gets classes `spell-heading spell-heading-<level>`, styled in
 *   `MonacoEditor.css` -- so any theme works, and each level can be styled on its own.
 * - Found by `CodeEditorFeatures.headingIn()`, straight from the text:  no waiting for a parse.
 *   CodeMirror's twin is `CodeMirrorHeadings` (epic `codemirror` P5).
 * - On the MODEL, so every editor showing it gets them.
 */
export class SpellHeadings {
  /**
   * Decorate the headings of models in `languages` -- those there now, and each made from now on -- as they're edited.
   * - Call once, e.g. from `SpellMonaco.register()`.
   */
  static watch(languages: readonly string[]): monaco.IDisposable {
    for (const model of monaco.editor.getModels()) SpellHeadings.follow(model, languages)
    return monaco.editor.onDidCreateModel((model) => SpellHeadings.follow(model, languages))
  }

  /**
   * Keep `model`'s heading decorations up to date, while it's in one of `languages`.
   * - Recomputes every line on each change:  spell files are small, and it's one regex a line.
   */
  private static follow(model: monaco.editor.ITextModel, languages: readonly string[]): void {
    let ids: string[] = []
    update()
    model.onDidChangeContent(update)
    model.onDidChangeLanguage(update)

    /** Replace `model`'s heading decorations with those for its text now. */
    function update() {
      const decorations = languages.includes(model.getLanguageId()) ? SpellHeadings.decorationsFor(model) : []
      ids = model.deltaDecorations(ids, decorations)
    }
  }

  /** Decorations for `model`'s headings:  each from its first `#` to the end of its line. */
  static decorationsFor(model: monaco.editor.ITextModel): monaco.editor.IModelDeltaDecoration[] {
    const decorations: monaco.editor.IModelDeltaDecoration[] = []
    for (let line = 1; line <= model.getLineCount(); line++) {
      const heading = CodeEditorFeatures.headingIn(model.getLineContent(line))
      if (!heading) continue
      const range = new monaco.Range(line, heading.start + 1, line, heading.end + 1)
      decorations.push({ range, options: { inlineClassName: `spell-heading spell-heading-${heading.level}` } })
    }
    return decorations
  }
}
