/**
 * The `UI` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `UI` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `UI.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - A keyword with a written accent is accepted without it too:  `(información|informacion)`.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { Wording } from "spell/parser/spell/rules/expressions"

import { Alert } from "./Alert"
import { AnswerWord } from "./AnswerWord"
import { Confirm } from "./Confirm"
import { CSSStyles } from "./CSSStyles"
import { UIDefaults } from "./UIDefaults"
import { EndPrintGroup } from "./EndPrintGroup"
import { Notify, NOTIFY_KINDS, TOAST_COLORS, TOAST_POSITIONS, TOAST_PROGRESS } from "./Notify"
import { Print } from "./Print"
import { ScrollToTop } from "./ScrollToTop"
import { OpenPrinting } from "./OpenPrinting"
import { ShowDatesAs } from "./ShowDatesAs"
import { ShowDrawn, ShowDrawnWith } from "./ShowDrawn"
import { TheResult } from "./TheResult"
import { WithoutClosing } from "./WithoutClosing"
import { PlaySound } from "./PlaySound"
import { StopSound } from "./StopSound"
import { LoadSound } from "./LoadSound"
import { Prompt } from "./Prompt"
import { TEXT_SIZES } from "./UI.shared"
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

// A toast's kind, for `notificar`:  `notificar éxito "¡Guardado!"` means `success`
UIEs.addRule(Wording.specialize({ ruleName: "notify_kind", meanings: NOTIFY_KINDS }), {
  syntax: "((info:información|informacion)|(success:éxito|exito)|(warning:aviso|advertencia)|(error:error))"
})

// A toast's colour, for `notificar ... en rojo`:  each meaning Spell UI's hue name
UIEs.addRule(Wording.specialize({ ruleName: "toast_color", meanings: TOAST_COLORS }), {
  syntax:
    "((red:rojo|roja)|(orange:naranja)|(yellow:amarillo|amarilla)|(olive:verde oliva|oliva)" +
    "|(teal:verde azulado|turquesa)|(green:verde)|(blue:azul)|(violet:violeta)" +
    "|(purple:morado|morada|púrpura|purpura)|(pink:rosa)|(brown:marrón|marron)|(grey:gris)|(black:negro|negra))"
})

// Where a toast goes, for `notificar ... arriba a la izquierda`:  each meaning Spell UI's `position`
UIEs.addRule(Wording.specialize({ ruleName: "toast_position", meanings: TOAST_POSITIONS }), {
  syntax:
    "((top_left:arriba a la izquierda)|(top_center:arriba al centro|arriba)|(top_right:arriba a la derecha)" +
    "|(centered:en el centro|en medio)|(bottom_left:abajo a la izquierda)|(bottom_center:abajo al centro|abajo)" +
    "|(bottom_right:abajo a la derecha))"
})

// A toast's progress bar, for `notificar ... con una barra de progreso arriba`:  where it goes, `_up` when it fills
UIEs.addRule(Wording.specialize({ ruleName: "toast_progress", meanings: TOAST_PROGRESS }), {
  syntax:
    "((top_up:con una barra de progreso que se llena arriba)" +
    "|(bottom_up:con una barra de progreso que se llena|con una barra de progreso que se llena abajo)" +
    "|(top:con una barra de progreso arriba)|(bottom:con una barra de progreso|con una barra de progreso abajo))"
})

////////////////
// ## Statements
////////////////

// El tamaño del texto de un diálogo, para `avisar ... en texto grande`
UIEs.addRule(Wording.specialize({ ruleName: "text_size", meanings: TEXT_SIZES }), {
  syntax: "((small:pequeño|chico)|(big:grande)|(huge:enorme))"
})

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

// How the program shows its dates (HyperTalk's short, long and abbreviated)
UIEs.addRule(
  Wording.specialize({
    ruleName: "shown_dates",
    meanings: ["short", "long", "abbreviated", "date_and_time", "timestamp", "plain", "reader"]
  }),
  {
    syntax:
      "((short:fechas cortas)|(long:fechas largas)|(abbreviated:fechas abreviadas)|(date_and_time:fechas y horas)|(timestamp:marcas de tiempo)|(plain:fechas simples)|(reader:las del lector))"
  }
)
UIEs.addRule(ShowDatesAs, {
  syntax: "las fechas se muestran como {style:shown_dates}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["las fechas se muestran como fechas cortas", 'core.showDatesAs("short")'],
        ["las fechas se muestran como fechas y horas", 'core.showDatesAs("date and time")'],
        ["las fechas se muestran como las del lector", 'core.showDatesAs("reader")']
      ]
    }
  ]
})

UIEs.addRule(ScrollToTop, {
  syntax: "desplazarse hasta arriba",
  tests: [{ compileAs: "statement", tests: [["desplazarse hasta arriba", "core.scrollToTop()"]] }]
})

UIEs.addRule(ShowDrawn, {
  syntax: "(mostrar|(hide:ocultar)) {name:text}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`mostrar "ganaste"`, `await core.showDrawn("ganaste")`],
        [`ocultar "ganaste"`, `core.hideDrawn("ganaste")`]
      ]
    }
  ]
})

UIEs.addRule(ShowDrawnWith, {
  syntax: "mostrar {name:text} con {thing:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        ;(scope as P.RootScope).variables.add("carta")
      },
      tests: [[`mostrar "editar carta" con carta`, [`const it = carta`, `await core.showDrawn("editar carta", it)`]]]
    }
  ]
})

UIEs.addRule(WithoutClosing, {
  syntax: "{call:statement} sin cerrar",
  tests: [{ compileAs: "statement", tests: [[`imprimir 1 sin cerrar`, ["core.keepOpen()", "core.console.log(1)"]]] }]
})

UIEs.addRule(WithoutClosing, {
  syntax: "{call:statement} sin cerrar el modal",
  tests: [
    {
      compileAs: "statement",
      tests: [[`imprimir 1 sin cerrar el modal`, ["core.keepOpen()", "core.console.log(1)"]]]
    }
  ]
})

UIEs.addRule(TheResult, {
  syntax: "el resultado",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`el resultado`, `core.result()`],
        [`el resultado es aceptar`, `(core.resultIs("ok"))`],
        [`el resultado no es cancelar`, `(!core.resultIs("cancel"))`],
        [`el resultado es descartar`, `(core.resultIs("descartar"))`]
      ]
    }
  ]
})

UIEs.addRule(AnswerWord, {
  roles: { match: "written value" },
  tests: [{ compileAs: "expression", tests: [[`el resultado no es descartar`, `(!core.resultIs("descartar"))`]] }]
})

UIEs.addRule(OpenPrinting, {
  syntax: "abrir impresión",
  tests: [{ compileAs: "statement", tests: [["abrir impresión", "core.openPrinting()"]] }]
})

UIEs.addRule(PlaySound, {
  syntax: "reproducir {sound:expression}",
  tests: [{ compileAs: "statement", tests: [[`reproducir "cry.ogg"`, `core.play("cry.ogg")`]] }]
})

UIEs.addRule(StopSound, {
  syntax: "parar {sound:expression}",
  tests: [{ compileAs: "statement", tests: [[`parar "cry.ogg"`, `core.stop("cry.ogg")`]] }]
})

UIEs.addRule(LoadSound, {
  syntax: "(cargar|precargar) {sound:expression}",
  tests: [{ compileAs: "statement", tests: [[`precargar "cry.ogg"`, `core.loadSound("cry.ogg")`]] }]
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
  syntax:
    "notificar {kind:notify_kind}? {message:expression} (titulado {title:expression})?" +
    " (en {color:toast_color} (inverted:invertido|invertida)?)? {position:toast_position}?" +
    " ((durante ({time:measure_literal}|{time:expression} {unit:unit_words}))|(untilClicked:hasta un clic|hasta que se haga clic))?" +
    " {progress:toast_progress}? (sideBySide:uno al lado del otro|en fila)? (keepRunning:sin pausa|sin pausar)?" +
    " (con {okButton:text})? (wait:y esperar)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`notificar "Yo!"`, `core.notify("Yo!")`],
        [`notificar "Yo!" con "entendido"`, `core.notify("Yo!", { button: "entendido" })`],
        [`notificar éxito "¡Guardado!"`, `core.notify("¡Guardado!", { class: "success" })`],
        [`notificar "¡Mira!" titulado "¿Mejor?"`, `core.notify("¡Mira!", { title: "¿Mejor?" })`],
        [`notificar "De colores" en rojo invertido`, `core.notify("De colores", { class: "inverted red" })`],
        [`notificar error "Ups" en negro`, `core.notify("Ups", { class: "error black" })`],
        [`notificar "¡Aquí!" arriba a la izquierda`, `core.notify("¡Aquí!", { position: "top left" })`],
        [`notificar "¡Aquí!" en el centro`, `core.notify("¡Aquí!", { position: "centered" })`],
        [`notificar "Adiós" durante 5 segundos`, `core.notify("Adiós", { time: 5, units: "seconds" })`],
        [`notificar "Adiós" durante 5 segundos y esperar`, `await core.notify("Adiós", { time: 5, units: "seconds" })`],
        [`notificar "Me quedo" hasta un clic`, `core.notify("Me quedo", { time: 0 })`],
        [`notificar "Mira" con una barra de progreso`, `core.notify("Mira", { showProgress: "bottom" })`],
        {
          input: `notificar "Mira" titulado "MIRA" con una barra de progreso que se llena arriba`,
          js: [`core.notify("Mira", {`, `  title: "MIRA",`, `  showProgress: "top",`, `  progressUp: true`, `})`]
        },
        [
          `notificar "Siguiente" arriba a la izquierda uno al lado del otro`,
          `core.notify("Siguiente", { position: "top left", horizontal: true })`
        ],
        [
          `notificar "Ocupado" con una barra de progreso arriba sin pausa`,
          `core.notify("Ocupado", { showProgress: "top", pauseOnHover: false })`
        ],
        {
          input: `notificar "¿Vale?" durante 5 segundos con "Sí"`,
          js: [`core.notify("¿Vale?", {`, `  time: 5,`, `  units: "seconds",`, `  button: "Sí"`, `})`]
        }
      ]
    }
  ]
})

UIEs.addRule(Alert, {
  syntax:
    "avisar {message:expression} ((titulado|titulada) {title:expression})? (en texto {size:text_size})?" +
    " (con {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`avisar "Yo!"`, `await core.alert("Yo!")`],
        [`avisar "Yo!" con "vale"`, `await core.alert("Yo!", "vale")`],
        [`avisar "¡Ganaste!" titulado "Solitario"`, `await core.alert("¡Ganaste!", { title: "Solitario" })`],
        [`avisar "¡Ganaste!" en texto grande`, `await core.alert("¡Ganaste!", { size: "big" })`],
        [`avisar "Pequeñito" en texto pequeño`, `await core.alert("Pequeñito", { size: "small" })`],
        {
          input: `avisar "¡Ganaste!" titulado "Solitario" en texto enorme con "Otra partida"`,
          js: [
            `await core.alert("¡Ganaste!", {`,
            `  title: "Solitario",`,
            `  size: "huge",`,
            `  okText: "Otra partida"`,
            `})`
          ]
        }
      ]
    }
  ]
})

UIEs.addRule(Warn, {
  syntax:
    "advertir {message:expression} ((titulado|titulada) {title:expression})? (en texto {size:text_size})?" +
    " (con {okButton:text})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`advertir "Yo!"`, 'await core.warn("Yo!")'],
        [`advertir "Yo!" con "vale"`, 'await core.warn("Yo!", "vale")'],
        [`advertir "¡Cuidado!" titulado "Borrando"`, 'await core.warn("¡Cuidado!", { title: "Borrando" })'],
        [
          `advertir "¡Cuidado!" en texto grande con "Vale"`,
          'await core.warn("¡Cuidado!", { size: "big", okText: "Vale" })'
        ]
      ]
    }
  ]
})

UIEs.addRule(Confirm, {
  syntax:
    "confirmar {message:expression} ((titulado|titulada) {title:expression})? (en texto {size:text_size})?" +
    " (con {okButton:text} ((y|e|o|u) {cancelButton:text})?)?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [`confirmar "Yo!"`, `await core.confirm("Yo!")`],
        [`confirmar "Yo!" con "Sí"`, `await core.confirm("Yo!", "Sí")`],
        [`confirmar "Yo!" con "Sí" y "No"`, `await core.confirm("Yo!", "Sí", "No")`],
        [`confirmar "Yo!" con "Sí" o "No"`, `await core.confirm("Yo!", "Sí", "No")`],
        [
          `confirmar "¿Repartir otra vez?" titulado "Solitario"`,
          `await core.confirm("¿Repartir otra vez?", { title: "Solitario" })`
        ],
        {
          input: `confirmar "¿Repartir otra vez?" titulado "Solitario" en texto grande con "Repartir" o "Ahora no"`,
          js: [
            `await core.confirm("¿Repartir otra vez?", {`,
            `  title: "Solitario",`,
            `  size: "big",`,
            `  okText: "Repartir",`,
            `  cancelText: "Ahora no"`,
            `})`
          ]
        }
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
        [`preguntar "¿Nombre para el bebé?"`, `const it = await core.prompt("¿Nombre para el bebé?")`],
        [
          `preguntar "Nombre del archivo:" con "Sin título"`,
          `const it = await core.prompt("Nombre del archivo:", "Sin título")`
        ]
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

UIEs.addRule(UIDefaults, {
  tests: [
    {
      title: "Los valores por defecto de una app:  una etiqueta de muestra por componente",
      compileAs: "statement",
      // sin un paquete de componentes cargado, tal cual;  con Spell UI, en sus nombres:  `UIDefaults.test.ts`
      tests: [
        [
          ["<ui-defaults>", '\t<es-boton apariencia="píldora"/>', "</ui-defaults>"],
          'core.useDefaults("", {\n  "es-boton": { apariencia: "píldora" }\n})'
        ]
      ]
    }
  ]
})
