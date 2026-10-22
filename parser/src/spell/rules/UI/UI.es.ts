/**
 * The `UI` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `UI` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `UI.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - A keyword with a written accent is accepted without it too:  `(información|informacion)`.
 */
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Wording } from "spell-lang/spell/rules/expressions"

import { Alert } from "./Alert"
import { Confirm } from "./Confirm"
import { CSSStyles } from "./CSSStyles"
import { EndPrintGroup } from "./EndPrintGroup"
import { Notify } from "./Notify"
import { Print } from "./Print"
import { Prompt } from "./Prompt"
import { Warn } from "./Warn"

/** Spanish's `UI` rules. */
export const UIEs = new SpellParser({ module: "UI" })

////////////////
// ## Word rules:  Spanish's words for each of English's, under the same names and meanings
////////////////

// Which kind of message, for `print`:  `imprimir aviso "Yo!"` means `warning`
UIEs.addRule(
  Wording.specialize({ ruleName: "print_kind", meanings: ["info", "warning", "error", "group", "collapsed_group"] }),
  {
    syntax:
      "((info:información|informacion)|(warning:aviso|advertencia)|(error:error)|(group:grupo)" +
      "|(collapsed_group:grupo plegado|grupo cerrado))"
  }
)

////////////////
// ## Statements
////////////////

UIEs.addRule(Print, {
  syntax: "imprimir {operator:print_kind}? [expressions:{expression} ,]",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`imprimir "Yo!"`, `core.console.log("Yo!")`],
        [`imprimir información "Yo!"`, `core.console.info("Yo!")`],
        [`imprimir aviso "Yo!"`, `core.console.warn("Yo!")`],
        [`imprimir advertencia "Yo!"`, `core.console.warn("Yo!")`],
        [`imprimir error "Yo!"`, `core.console.error("Yo!")`],
        [`imprimir grupo "Yo!"`, `core.console.group("Yo!")`],
        [`imprimir grupo plegado "Yo!"`, `core.console.groupCollapsed("Yo!")`]
      ]
    }
  ]
})

UIEs.addRule(EndPrintGroup, {
  syntax: "terminar (el)? grupo (de impresión|de impresion)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`terminar el grupo`, `core.console.groupEnd()`],
        [`terminar grupo de impresión`, `core.console.groupEnd()`]
      ]
    }
  ]
})

UIEs.addRule(Notify, {
  syntax: "notificar {message:expression} (con {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`notificar "Yo!"`, `core.notify("Yo!")`],
        [`notificar "Yo!" con "entendido"`, `core.notify("Yo!", "entendido")`]
      ]
    }
  ]
})

UIEs.addRule(Alert, {
  syntax: "avisar {message:expression} (con {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`avisar "Yo!"`, `await core.alert("Yo!")`],
        [`avisar "Yo!" con "vale"`, `await core.alert("Yo!", "vale")`]
      ]
    }
  ]
})

UIEs.addRule(Warn, {
  syntax: "advertir {message:expression} (con {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`advertir "Yo!"`, `await core.warn("Yo!")`],
        [`advertir "Yo!" con "vale"`, `await core.warn("Yo!", "vale")`]
      ]
    }
  ]
})

UIEs.addRule(Confirm, {
  syntax: "confirmar {message:expression} (con {okButton:text} ((y|e|o|u) {cancelButton:text})?)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`confirmar "Yo!"`, `await core.confirm("Yo!")`],
        [`confirmar "Yo!" con "Sí"`, `await core.confirm("Yo!", "Sí")`],
        [`confirmar "Yo!" con "Sí" y "No"`, `await core.confirm("Yo!", "Sí", "No")`],
        [`confirmar "Yo!" con "Sí" o "No"`, `await core.confirm("Yo!", "Sí", "No")`]
      ]
    }
  ]
})

UIEs.addRule(Prompt, {
  syntax: "preguntar {message:expression} (con {defaultValue:expression})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`preguntar "¿Nombre para el bebé?"`, `await core.prompt("¿Nombre para el bebé?")`],
        [`preguntar "Nombre del archivo:" con "Sin título"`, `await core.prompt("Nombre del archivo:", "Sin título")`]
      ]
    }
  ]
})

UIEs.addRule(CSSStyles, {
  tests: [
    {
      title: "reconoce css",
      tests: [
        [`""`, `core.installStyles(undefined, \`""\`)`],
        [`".Card {\\n\\theight:30px;\\n}\\n"`, `core.installStyles(undefined, \`".Card {\\n\\theight:30px;\\n}\\n"\`)`]
      ]
    }
  ]
})
