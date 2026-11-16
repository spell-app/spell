/****************
 * ### `CodeMirrorTexts`
 * CodeMirror's own words, in the page's language:  its find panel, folds, suggestions, problems and merge view
 * (epic `editor` P30, the CodeMirror test).
 * - CodeMirror asks for each word it shows through ONE facet, `EditorState.phrases`:  a table from its English to
 *   ours, handed to the editor as it's made, or swapped in later (a `Compartment`) when the page's language changes.
 * - So nothing needs building:  a language is one more table here.
 *   Monaco's words are English unless its translated bundles are swapped in when the app is built.
 * - The few words the test's own right-click menu adds that `AppTexts` has no key for:  `ownWords`.
 * - Plain data, no CodeMirror:  the editor reads it (`SpellCodeMirror`).
 ****************/
export class CodeMirrorTexts {
  /** CodeMirror's phrases in `lang`, from its English;  `{}` for English, its own. */
  static phrasesFor(lang: string): Record<string, string> {
    return PHRASES[lang] ?? {}
  }

  /** One of the test's own words in `lang`, English when it has none. */
  static text(key: CodeMirrorTextKey, lang: string): string {
    return OWN_WORDS[lang]?.[key] ?? OWN_WORDS.en![key]
  }
}

/** The test's own words:  its right-click menu's rows that `AppTexts` has no key for. */
export type CodeMirrorTextKey = "goToDefinition" | "find"

/** The test's own words, by language. */
const OWN_WORDS: Record<string, Record<CodeMirrorTextKey, string>> = {
  en: {
    goToDefinition: "Go to Definition",
    find: "Find…"
  },
  es: {
    goToDefinition: "Ir a la definición",
    find: "Buscar…"
  }
}

/**
 * CodeMirror's English, to each language's:  every phrase its packages ask for (`state.phrase(...)`), as of
 * `@codemirror/*` 6.x -- `$` is a number it fills in.
 * - Find and replace (`@codemirror/search`), go to line, folds (`@codemirror/language`), suggestions
 *   (`@codemirror/autocomplete`), problems (`@codemirror/lint`), the merge view (`@codemirror/merge`), the editor's own.
 */
const PHRASES: Record<string, Record<string, string>> = {
  es: {
    // find and replace
    Find: "Buscar",
    Replace: "Reemplazar",
    next: "siguiente",
    previous: "anterior",
    all: "todos",
    "match case": "mayúsculas",
    regexp: "expresión regular",
    "by word": "palabra entera",
    replace: "reemplazar",
    "replace all": "reemplazar todos",
    close: "cerrar",
    "current match": "coincidencia actual",
    "on line": "en la línea",
    "replaced match on line $": "reemplazada la coincidencia en la línea $",
    "replaced $ matches": "$ coincidencias reemplazadas",
    "Go to line": "Ir a la línea",
    go: "ir",
    // folds
    "Folded lines": "Líneas plegadas",
    "Unfolded lines": "Líneas desplegadas",
    "Fold line": "Plegar la línea",
    "Unfold line": "Desplegar la línea",
    "folded code": "código plegado",
    unfold: "desplegar",
    to: "a",
    // suggestions and problems
    Completions: "Sugerencias",
    Diagnostics: "Problemas",
    "No diagnostics": "Ningún problema",
    // the merge view
    "Revert this chunk": "Tomar este cambio",
    Accept: "Aceptar",
    Reject: "Rechazar",
    "$ unchanged lines": "$ líneas sin cambios",
    // the editor's own
    "Control character": "Carácter de control",
    "Selection deleted": "Selección borrada"
  }
}
