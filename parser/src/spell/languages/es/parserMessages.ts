/**
 * What the parser says to the person WRITING a program, in Spanish (epic `spanish` P17):
 * its warnings, its parse errors, why a rule refused a line, and the long forms editors show as "Reads as".
 * - Each key is one of English's, `PARSER_MESSAGES` (`languages/en/parserMessages.ts`):  see it for where each shows.
 *   A key left out reads English;  `spell translate check es` reports it.
 * - Its examples are Spanish spell, in the glossary's words (`GLOSSARY.md`):
 *   `poner X a una nueva lista de texto`, `una carta es una cosa`.
 * - Where English writes `a {type}`, Spanish writes `{aType}`:  the code picks `un` or `una` by the type's gender.
 */
import type { SP } from "spell-parser/spell"

/** Spanish's parser messages, by English's keys. */
export const spanishParserMessages: Partial<SP.ParserMessages> = {
  ////////////////
  // ## Warnings
  ////////////////

  "did-you-mean": '¿Querías decir "{phrase}"?',
  "untyped-parameter": 'Di qué es "{name}", p. ej. "({name} como {type})"',
  "untyped-property": 'Di qué es "{name}", p. ej. "{line} como {type}"',
  "untyped-list-property": 'Di qué contiene "{name}", p. ej. "{line} como una nueva lista de {items}"',
  "untyped-list-variable": 'Di qué contiene "{name}", p. ej. "poner {name} a una nueva lista de {items}"',
  "untyped-set-property": 'Di qué es "{name}":  decláralo, p. ej. "{aType} tiene {aName} como {type}"',
  "undeclared-member": '{AType} nunca dice que tiene {aName}:  decláralo, p. ej. "{aType} tiene {aName} como {type}"',
  "rule-before-property": 'Declara "{name}" antes de su regla, p. ej. "- tiene {aName} como texto"',
  "always-the-same": '{name} siempre es {value}:  para darle un tipo, escribe "{name} es {type}"',
  "not-a-property-body-line":
    "Bajo una propiedad van solo sus reglas y sus frases:  esta línea funciona igual, pero escríbela después de la propiedad, no debajo",
  "named-twice": 'Hay más de una cosa de tipo {type} llamada "{name}":  esto encuentra la primera que se creó',
  "position-not-a-kind": '"{text}":  {aKind} no es uno de unos valores fijos;  di en qué lista, "... en ..."',
  "example-text": "texto",
  "example-number": "un número",
  "example-yes-or-no": "sí o no",

  ////////////////
  // ## Parse errors
  ////////////////

  "dont-understand": 'No entiendo "{text}"',
  "outline-line-outside":
    'Una línea sin sujeto, o con "su", habla de un tipo solo en su esquema, con sangría bajo p. ej. "una carta es una cosa donde:"',
  "inline-and-nested-body": "Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo",
  "not-an-element": "<{tag}> no es un elemento:  escribe la etiqueta propia de Spell UI, p. ej. <ui-form>",
  /** A bare tag in a spellx drawing that no pack has (epic `elemental-spell` P7). */
  "spellx-unknown-component":
    "<{tag}> no es un componente de ningún paquete de aquí (buscado:  {packs}):  revisa su nombre, o añade su paquete a los paquetes del proyecto",
  /** A control or handler tag inside an element in a spellx drawing (epic `elemental-spell` P7, C29). */
  "spellx-tag-in-markup":
    "<{tag} ...> aún no puede ir dentro de un elemento:  escríbelo en una línea propia del dibujo, fuera del elemento",
  "markdown-hole":
    'No entiendo "{{hole}}" en <markdown>:  un hueco es spell, p. ej. {la puntuación del juego};  escribe \\{ para una llave',

  ////////////////
  // ## Refused lines
  ////////////////

  "cant-add-to-built-in-type":
    "No se puede añadir {property} al tipo {type}:  viene incorporado, y todos los proyectos lo comparten",
  "a-property": "una propiedad",
  "cant-add-built-in-member": "No se puede añadir {property} al tipo {type}:  cada cosa ya tiene uno, incorporado",
  "cant-retype-built-in-member":
    "No se puede añadir {property} al tipo {type} como {datatype}:  cada {on} ya tiene uno, incorporado, como {builtInType}",
  "no-members-on-property-kind":
    "{AKind} es uno de los valores que lista {aType}:  no puede tener propiedades ni frases propias",
  "no-such-type": 'No hay ningún tipo "{type}":  decláralo, p. ej. "{example}"',
  "example-type": "{aType} es una cosa",
  "example-list-type": "{aList} es una lista de {items}",
  "property-starts-its": 'Una propiedad empieza con "su":  escribe su "{name}" es ...',
  "phrase-without-body": "{phrase} no tiene cuerpo:  escribe {phrase} siempre, o {phrase} si ...",
  "phrase-without-blank":
    '"{phrase}" no tiene hueco:  pon entre paréntesis la palabra que cambia, p. ej. "es un (palo)", o di cuándo es verdad, "{phrase}" si ...',
  "blank-without-values":
    '"({word})" no nombra ninguna propiedad de {aType} con una lista de valores, p. ej. su "palo" es uno de tréboles, diamantes, corazones o espadas',
  "source-without-values":
    '"sus {name}" no es una propiedad de {aType} con una lista de valores, p. ej. su "palo" es uno de tréboles, diamantes, corazones o espadas',
  "version-step-before-2": "Un paso de versión empieza en la versión 2:  un archivo sin versión es la versión 1",
  "upgrade-before-2": "Una actualización empieza en la versión 2:  un archivo sin versión es la versión 1",
  "already-a-short-name": '"{name}" ya es el nombre corto de {type}',
  "aka-names-a-type": '"{aka}" ya nombra un tipo:  {type}',
  "type-declared-twice": 'Ya hay {words}, {where}:  para añadirle algo, escribe "{words}:"',
  "on-line": "en la línea {line}",
  "on-line-of-file": "en la línea {line} de {file}",
  "cant-save-built-in-inline":
    "No se puede guardar el tipo {type} dentro:  viene incorporado, y todos los proyectos lo comparten",
  "cant-save-built-in-in-file":
    "No se puede guardar el tipo {type} en su propio archivo:  viene incorporado, y todos los proyectos lo comparten",
  "belongs-to-undeclared": 'Todavía no se puede decir {sentence}:  declara "{example}" antes',
  "belongs-to-built-in-list": "No se puede decir {sentence}:  cada lista tendría {aType} una sola vez",
  "belongs-to-not-a-list": "No se puede decir {sentence}:  {aList} no es una lista",
  "markdown-outside-outline":
    "Un bloque <markdown> va en el esquema de un tipo, como su descripción, o en un dibujo:  devolver <markdown>...</markdown>",
  "retired-type-word": '"{words}" ahora es "{replacement}":  di "{replacement}"',
  "css-not-a-view": 'Solo una vista tiene su propio <css>:  "{type}" no es una vista:  di "una ... es una vista"',
  "css-outside-outline": "Solo una vista tiene su propio <css>:  ponlo en el esquema de un tipo",
  "value-line-outside-getter":
    'Una línea del cuerpo de una propiedad calculada:  ponla debajo de una, p. ej. "el color de una carta es:"',
  "cant-set-worked-out": "No se puede poner {what}:  spell lo calcula",
  "cant-set-belongs-to": "No se puede poner {what}:  es {theHolder} que lo contiene -- muévelo a {aHolder}",
  "the-property": "{theProperty}",
  "the-property-of-a-type": "{theProperty} de {aType}",

  ////////////////
  // ## Spellx
  ////////////////

  "spellx-unknown-word": '"{tag}" no es una palabra de spellx:  ¿querías decir "{suggestion}"?',
  "spellx-unknown-word-here": '"{tag}" no es una palabra de spellx:  aquí, usa una de {words}',
  "spellx-unknown-attribute": '{tag} no tiene "{attribute}":  ¿querías decir "{suggestion}"?',
  "spellx-unknown-attribute-here": '{tag} no tiene "{attribute}":  lleva {attributes}',
  "spellx-unexpected-closer": '"{closer}" no cierra nada:  quítalo',
  "spellx-mismatched-closer": '"{closer}" no puede cerrar {open}:  escribe "</>"',
  "spellx-unclosed-tag": '{tag} nunca se cierra:  termínalo con "</>"',
  "spellx-unclosed-head": '{tag} nunca termina:  ciérralo con ">", o con "/>" si nada va dentro',
  "spellx-otherwise-without-if": '{tag} necesita un "{if}" antes',
  "spellx-otherwise-after-closed-if": '{tag} sigue el "{if}" de arriba, pero un "</>" lo cerró:  quita el "</>"',
  "spellx-missing-phrase": '{tag} necesita palabras después de su "{word}"',
  "spellx-indented-less": "Esta línea tiene menos sangría que el resto de {tag}:  dale un paso más que {tag}",
  "spellx-nested-template": '{tag} no puede ir dentro de {outer}:  cierra {outer} primero, con "</>"',
  "spellx-outside-template": '{tag} va dentro de una plantilla, p. ej. "{template}"',
  "spellx-misplaced-tag": "{tag} no puede ir aquí:  {where}",
  "spellx-where-control": "va dentro de un dibujo;  una acción lo dice como una línea",
  "spellx-where-member": "va entre los miembros de su plantilla, junto al dibujo",
  "spellx-part-in-drawing": 'Una parte se dibuja en su propio {draw} junto al dibujo:  aquí, "{place}" la coloca',
  "spellx-not-yet": "{tag} aún no se puede leer:  llega con una versión posterior de spellx",

  ////////////////
  // ## Long forms
  ////////////////

  "long-form-subject": "{aType}",
  "long-form-property": "{theProperty} de {aType}",
  "long-form-has": "{aType} tiene {aProperty}",
  "long-form-has-as": "{aType} tiene {aProperty} como {specifier}",
  "long-form-has-one-of": "{aType} tiene {aProperty} como uno de {values}",
  "long-form-has-list": "{aType} tiene {aProperty} como una nueva lista de {items}",
  "long-form-belongs-to-one": "{aType} pertenece a {aList}",
  "long-form-phrase-for": '{aType} "{phrase}" para {sources}',
  "long-form-source": "sus {plural}",
  "long-form-and": " y "
}
