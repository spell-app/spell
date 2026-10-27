/**
 * Spanish's own small words:  the tables spell's rules read while parsing Spanish (epic `spanish` P5).
 * - The same shape as English's (`SP.LanguageWords`);  rules read the language in play, never these directly.
 * - Keywords typed without their accent (`si`, `numero`) are accepted too (Owen, the bedtime page, 2026-10-22):
 *   each list holds both spellings where people drop one.
 */
import type { P } from "spell/parser/parser"
import type { SP } from "spell/parser/spell"

/** Spanish's words:  see `SP.LanguageWords` for what each list is for. */
export const spanishWords: SP.LanguageWords = {
  /**
   * Words which may never be a one-word name, so they stay spell's:  Spanish's for the roles English's 8 play
   * (`is`, `if`, `the`, `in`, `of`, `with`, `to`, `no`), its articles all.
   * - English's were found by the blacklist analysis (P2);  Spanish's are its counterparts, to be checked the same way.
   */
  blacklist: {
    es: 1,
    si: 1,
    el: 1,
    la: 1,
    los: 1,
    las: 1,
    en: 1,
    de: 1,
    con: 1,
    a: 1,
    no: 1
  },

  /** Words which end a member's name of several words:  `de` ends `el rango corto de`, `como` a declaration ... */
  memberStopWords: new Set([
    "de",
    "del",
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "uno",
    "es",
    "son",
    "está",
    "esta",
    "están",
    "estan",
    "tiene",
    "tienen",
    "en",
    "a",
    "al",
    "y",
    "o",
    "u",
    "si",
    "donde",
    "cuyo",
    "cuya",
    "cuyos",
    "cuyas",
    "como",
    "con",
    "para",
    "desde",
    "entonces",
    "sino",
    "no",
    "por",
    "sobre"
  ]),

  /** Stop words which may still START a member's name, e.g. `con comodines` (with jokers), `en juego` (in play). */
  memberLeadingWords: new Set(["con", "para", "desde", "en", "por", "sobre", "al"]),

  /** Little words after which a method's name keeps its receiver's type:  `actualizar_el_total_de_calculadora`. */
  danglingWords: new Set([
    "de",
    "del",
    "a",
    "al",
    "desde",
    "en",
    "sobre",
    "para",
    "con",
    "sin",
    "antes",
    "después",
    "despues",
    "entre",
    "hacia",
    "bajo",
    "contra"
  ]),

  /** Words which end a type's name of several words:  `alias`, as in `una cuenta bancaria alias cuenta es una cosa`. */
  typeNameStopWords: new Set(["alias"]),

  /** The word between a list and what it holds:  `lista de cartas`. */
  listOfWord: "de",
  // `cerrando`, `abriendo`:  an event still happening, which a handler can cancel (`send`, epic `elemental-spell` P9)
  ongoingEventName: /(ando|iendo|yendo)$/,
  // las acciones de la propia aplicación, como las nombra un menú (`define_menu`, épica `elemental-spell` P10)
  appActions: { deshacer: "undo", rehacer: "redo" },
  // el ejemplo de un cuaderno, en un dibujo (`example_block`, épica `elemental-spell` P16)
  exampleTag: "ejemplo",

  /** The old words for views, each an error naming its new word (epic `elemental-spell`, Q61). */
  retiredTypeWords: {
    dibujable: "vista",
    "cosa dibujable": "vista",
    "cosa-dibujable": "vista",
    "lista dibujable": "lista visible",
    "lista-dibujable": "lista visible"
  },

  /**
   * Spellx's words in Spanish (epic `elemental-spell`):  see `SP.SpellxWords`.
   * - Spell is `encanto` in Spanish (Q36):  `<encanto-vista>`.
   * - With their accents (Q49);  each also without, as a person may type it, which the editor upgrades.
   * - A template's short name is `alias` here, as in Spanish spell's `una cuenta bancaria alias cuenta`;
   *   what English calls an alias is a `frase` (J7).
   */
  spellx: {
    prefix: "encanto",
    templates: {
      vista: "view",
      cosa: "thing",
      página: "page",
      pagina: "page",
      aplicación: "app",
      aplicacion: "app",
      "plantilla-de-página": "page template",
      "plantilla-de-pagina": "page template",
      "plantilla-de-aplicación": "app template",
      "plantilla-de-aplicacion": "app template",
      cuaderno: "notebook"
    },
    declarations: {
      propiedad: "property",
      frase: "alias",
      acción: "action",
      accion: "action",
      dibujar: "draw",
      evento: "event",
      probar: "test",
      menú: "menu",
      menu: "menu",
      grupo: "group"
    },
    notes: { descripción: "description", descripcion: "description", comentario: "comment" },
    handlers: { al: "on", cuando: "when", mientras: "while" },
    controls: {
      si: "if",
      "si no si": "otherwise if",
      "sino si": "otherwise if",
      "de lo contrario si": "otherwise if",
      "si no": "otherwise",
      sino: "otherwise",
      "de lo contrario": "otherwise",
      "para cada": "for each"
    },
    attributes: {
      nombre: "name",
      alias: "aka",
      plantilla: "template",
      "uno-de": "one-of",
      frase: "alias",
      descripción: "description",
      descripcion: "description",
      atajo: "shortcut",
      "activa-cuando": "enabled-when",
      "elegida-cuando": "selected-when",
      "seleccionada-cuando": "selected-when",
      "se-deshace-como": "undone-as",
      icono: "icon",
      "barra-de-menú": "menu-bar",
      "barra-de-menu": "menu-bar",
      bloqueado: "locked",
      // la página de la que se convirtió un cuaderno (P18):  solo la lee el editor
      grupo: "group"
    },
    // el gemelo de cada etiqueta en el código de spell:  la línea que se lee (P6) -- ver `SP.SpellxTwinWords`
    twins: {
      template: "{a name} {name} es {a super} {super} :",
      templateAka: "{a words} {words} alias {aka} es {a super} {super} :",
      singleton: "{words} es {a super} {super} :",
      supers: {
        view: "vista",
        thing: "cosa",
        page: "página",
        app: "aplicación",
        "page template": "página",
        "app template": "aplicación",
        notebook: "cuaderno"
      },
      property: {
        list: "su {name} es uno de {one-of}",
        listBody: "su {name} es uno de {one-of} :",
        body: "su {name} es :",
        value: "su {name} es",
        bare: "tiene {a words} {words}"
      },
      // el sujeto de una frase queda implícito, como en el esquema:  `- "es un (palo)"`
      propertyAlias: "{quoted alias}",
      alias: "{name}",
      aliasBlock: "{name} :",
      action: "para {words} :",
      actionDetails: {
        shortcut: "atajo {shortcut}",
        "enabled-when": "activa cuando {enabled-when}",
        "selected-when": "seleccionada cuando {selected-when}",
        "undone-as": "se deshace como {quoted undone-as}",
        icon: "icono {quoted icon}"
      },
      test: "para probar {words} :",
      event: "envía {name}",
      eventWith: "con",
      eventParam: "{param} como {a value} {value}",
      eventAnd: "y",
      draw: "para dibujar eso :",
      drawPart: "para dibujar su {words} :",
      placePart: "dibujar su {words}",
      menu: "su {name} es un menú de",
      menuAnd: "y",
      menuBar: "su barra de menú es {quoted menu-bar}",
      group: "grupo {name}",
      notebookContent: "para dibujar su contenido :",
      notebookLocked: "su candado es bloqueado",
      start: "iniciar {words}",
      handlers: { on: "al {phrase} :", when: "cuando {phrase} :", while: "mientras {phrase} :" },
      controls: {
        if: "si {phrase}",
        "otherwise if": "de lo contrario si {phrase}",
        otherwise: "de lo contrario",
        "for each": "para cada {phrase}"
      }
    }
  },

  /**
   * The kind of a property's values, by Spanish's word order:  `palo de carta`, from a carta's `su "palo" es uno de ...`.
   * - Its plural is its first word's, `palos de carta`, as for any name with `de` in it.
   */
  propertyKindName: "{property} de {type}",

  /**
   * Words which name `it` as an object:  `imprimir eso`, `obtener su nombre`, then `imprimir eso`.
   * - Spanish attaches the pronoun to its verb (`imprimirlo`), which spell's words can't split, so `eso` ("that").
   * - `ello` too, the plain pronoun.
   */
  itWords: new Set(["eso", "ello"]),

  /**
   * A verb with `it` fused onto its end:  `barajarla`, `dibujarlo`, `voltearlas` => `barajar`, `dibujar`, `voltear`.
   * - Only an infinitive (`-ar`, `-er`, `-ir`) then `lo`, `la`, `los` or `las`:  `para barajarla:` in a type's outline body.
   */
  fusedIt: /^(\p{L}+(?:ar|er|ir|ár|ér|ír))(?:lo|la|los|las)$/iu,

  /** `al` is `a el`, `del` is `de el`:  a method's words and its calls may say either. */
  contractions: { al: "a el", del: "de el" },

  /**
   * Spanish's words for the built-in types' members:  `el largo de la lista`, `el año de la fecha`.
   * - A list's `name` is `nombre`:  `el nombre de la pila` reads and sets `pila.name`.
   */
  builtInMembers: {
    name: ["nombre"],
    length: ["largo", "longitud"],
    size: ["tamaño", "tamano"],
    characters: ["caracteres"],
    year: ["año", "ano"],
    day: ["día", "dia"],
    selection: ["selección", "seleccion"]
  },

  /** How a file's raw text declares things, found before it's parsed -- see `SP.DeclarationPatterns`. */
  declarations: {
    /**
     * A line declaring a type, its name captured:  `una carta es una cosa`, `un mazo es una lista de cartas`.
     * - Its groups, in order:
     *   1. a one-word name
     *   2. a name of several words, before `es un` / `es una` or `alias`,
     *      quoted too:  `una "carta de juego" es una cosa`
     *   3. `crear un tipo llamado ...`'s name
     *   4. a one-of-a-kind app's name, `solitario es una aplicación`
     */
    typeDeclaration:
      /^[ \t]*(?:-[ \t]+)?(?:un[oa]?[ \t]+["']?([\p{L}\p{M}\d_-]+)["']?[ \t]+es\b|un[oa]?[ \t]+["']?((?:(?!(?:es|alias)\b)[\p{L}\p{M}\d_-]+[ \t]+){1,3}(?!(?:es|alias)\b)[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:es[ \t]+un[oa]?|alias)\b|crear[ \t]+un[ \t]+tipo[ \t]+(?:llamado|nombrado)[ \t]+([\p{L}\p{M}\d_-]+)|(?!(?:un[oa]?|el|la|los|las|su|sus)\b)((?:(?!es\b)[\p{L}\p{M}\d_-]+[ \t]+){0,3}(?!es\b)[\p{L}\p{M}\d_-]+)[ \t]+es[ \t]+una[ \t]+aplicaci[oó]n\b)/gimu,
    /**
     * A line naming its kind, its groups an article (if any), its name and its kind's words, up to 4 of each:
     * `una "página de puntos" es una página`, `puntuaciones altas es una página de puntos:`.
     * - The kind ends at `donde`, `con`, a `:` or the line's end.
     */
    kindDeclaration:
      /^[ \t]*(?:-[ \t]+)?(un[oa]?[ \t]+)?(?!(?:sus?|el|la|los|las|un[oa]?)[ \t])["']?((?:(?!(?:es|alias)\b)[\p{L}\p{M}\d_-]+[ \t]+){0,3}(?!(?:es|alias)\b)[\p{L}\p{M}\d_-]+)["']?(?:[ \t]+alias[ \t]+["']?[\p{L}\p{M}\d_-]+["']?)?[ \t]+es[ \t]+un[oa]?[ \t]+((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)(?=[ \t]*(?:donde\b|con\b|:|$))/gimu,
    /** A line declaring a value kind, its PLURAL name captured:  `- "palos" como uno de ...`. */
    valueKindDeclaration:
      /^[ \t]*(?:-[ \t]+)?["']([\p{L}\p{M}\d_-]+)["'][ \t]+como[ \t]+(?:uno[ \t]+de|o[ \t]+bien)\b/gimu,
    /**
     * A body's line declaring a property with a list of values, its words captured (group 1, or 2 after `tiene`):
     * `- su "palo" es uno de ...`, `- "palo" es o bien ...`, `- tiene un palo como uno de ...`.
     * - Not a value kind's `- "palos" como uno de ...`:  `como` only after `tiene`.
     */
    propertyListDeclaration:
      /^[ \t]+-[ \t]+(?:(?:sus?[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:es|son)|tiene[ \t]+(?:un[oa]?[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+como)[ \t]+(?:un[oa][ \t]+de|o[ \t]+bien)\b/iu,
    /**
     * A line starting a method:  `para mover una carta`, `animación repartir`.
     * - Not a loop, which starts `para cada` too:  `para cada carta en el mazo:`.
     */
    methodLine: /^(?:para(?![ \t]+cada\b)|(?:crear[ \t]+)?animaci[oó]n)[ \t]/iu,
    /** A line re-opening a type, its name captured:  `una carta:`, `un solitario donde:`. */
    reopenedType: /^un[oa]?[ \t]+([\p{L}\p{M}\d_-]+(?:[ \t]+[\p{L}\p{M}\d_-]+){0,3})[ \t]*(?:donde[ \t]*)?:[ \t]*$/iu
  }
}

/** Every way a person may WRITE a built-in type in Spanish, lowercased and singular => its datatype. */
export const spanishTypeWords: P.TypeWords = {
  texto: "text",
  cadena: "text",
  número: "number",
  numero: "number",
  fracción: "number",
  fraccion: "number",
  decimal: "number",
  entero: "integer",
  carácter: "character",
  caracter: "character",
  opción: "choice",
  opcion: "choice",
  booleano: "choice",
  "sí o no": "choice",
  "si o no": "choice",
  "verdadero o falso": "choice",
  fecha: "date",
  lista: "list",
  arreglo: "list",
  cosa: "thing",
  aplicación: "app",
  aplicacion: "app",
  vista: "view",
  "lista visible": "viewable list",
  "lista-visible": "viewable list",
  página: "page",
  pagina: "page",
  // a view with a front and a back:  `de` and `a` are grammar words, so not `vista de dos caras`
  "vista reversible": "two sided view",
  "vista-reversible": "two sided view",
  // a page of prose, examples and its own templates (epic `elemental-spell` P16)
  cuaderno: "notebook",
  // the old words, still read so a line keeps its meaning:  each an error naming its new word -- see `retiredTypeWords`
  dibujable: "view",
  "cosa dibujable": "view",
  "cosa-dibujable": "view",
  "lista dibujable": "viewable list",
  "lista-dibujable": "viewable list",
  nada: "nothing",
  indefinido: "nothing",
  nulo: "nothing"
}
