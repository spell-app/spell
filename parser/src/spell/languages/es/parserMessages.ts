/**
 * What the parser says to the person WRITING a program, in Spanish (epic `spanish` P17):
 * its warnings, its parse errors, why a rule refused a line, and the long forms editors show as "Reads as".
 * - Each key is one of English's, `PARSER_MESSAGES` (`languages/en/parserMessages.ts`):  see it for where each shows.
 *   A key left out reads English;  `spell translate check es` reports it.
 * - Its examples are Spanish spell, in the glossary's words (`GLOSSARY.md`):
 *   `poner X a una nueva lista de texto`, `una carta es una cosa`.
 * - Where English writes `a {type}`, Spanish writes `{aType}`:  the code picks `un` or `una` by the type's gender.
 */
import type { SP } from "spell/parser/spell"

/** Spanish's parser messages, by English's keys. */
export const spanishParserMessages: Partial<SP.ParserMessages> = {
  ////////////////
  // ## Warnings
  ////////////////

  "did-you-mean": '¿Querías decir "{phrase}"?',
  "read-whole-everything": "todo lo que este programa guarda",
  "read-whole-field-named-by-a-value":
    "Encanto no sabe qué campo nombra esto, así que {what} se lee entero:  nombra el campo con palabras si puedes",
  "read-whole-element-reads-it": "Encanto no ve qué lee de ello este elemento, así que {what} se lee entero",
  "read-whole-library-reads-it": "Encanto no ve qué lee esta biblioteca, así que {what} se lee entero",
  "say-is-able": 'Di "{line}":  "{old}" deja de funcionar en una versión próxima',
  "say-when": 'Di "cuando:":  aquí "si:" deja de funcionar en una versión próxima',
  "untyped-parameter": 'Di qué es "{name}", p. ej. "({name} como {type})"',
  "untyped-property": 'Di qué es "{name}", p. ej. "{line} como {type}"',
  "untyped-list-property": 'Di qué contiene "{name}", p. ej. "{line} como una nueva lista de {items}"',
  "action-without-a-name": '"{text}" no nombra una acción:  di qué hace, como en "para barajarlo"',
  "made-from-each-other":
    '{circle}:  cada uno hace el siguiente al hacerse, así que ninguno puede hacerse nunca.  Guarda uno sin "nuevo", y hazlo en una acción',
  "statement-in-markup":
    '"{line}" se muestra como texto:  no puede ir dentro de un elemento en una línea propia.  Escríbelo entre llaves, como en "{para libro en sus libros: dibujar libro}"',
  "never-empty":
    '{AType} no es una lista, así que no tiene nada que vaciar:  di cuál, como en "si sus libros está vacío"',
  "untyped-list-property-is": 'Di qué contiene "{name}", p. ej. "{line} una lista de {items}"',
  "untyped-list-variable": 'Di qué contiene "{name}", p. ej. "poner {name} a una nueva lista de {items}"',
  "untyped-set-property": 'Di qué es "{name}":  decláralo, p. ej. "{aType} tiene {aName} como {type}"',
  "undeclared-member": '{AType} nunca dice que tiene {aName}:  decláralo, p. ej. "{aType} tiene {aName} como {type}"',
  "reads-after-wait":
    "Tras su primera espera, este valor no puede seguir lo que lee de otras cosas:  léelas antes de la espera",
  "cant-go-without-waiting": "Solo una llamada puede ir sin esperar:  esto tiene un valor o un cuerpo que esperar",
  "cant-wait-for-toast-that-stays":
    "No se puede esperar a un aviso que se queda:  los clics esperarían hasta que se cierre",
  "cant-wait-in-draw": "Un dibujo no puede esperar:  hazlo una propiedad que espere, y dibuja esa",
  "place-read-only":
    "El {place} es un lugar de tipo {kind}, que aquí es de solo lectura:  esto no puede cambiarlo.  Guarda lo que cambia en otro sitio, o léelo de un lugar que admita escritura",
  "key-written":
    'Una clave escrita aquí la puede leer cualquiera con el programa:  nómbrala, p. ej. "su clave es el secreto "CLAVE_RECETARIO"", y guárdala en un servidor',
  "key-not-a-name":
    '"{name}" parece una clave, no su nombre:  una clave nunca se escribe aquí.  Nómbrala en mayúsculas, p. ej. "su clave es el secreto "CLAVE_RECETARIO""',
  "key-needs-server-side":
    'Un programa en el navegador no puede leer "{name}":  este lugar necesita un pequeño servidor, que guarde la clave y responda por ella',
  "place-cant-announce":
    'Un lugar de tipo "{kind}" no puede avisar de lo que cambió, así que los cambios de otras personas no se ven hasta que esta página vuelva a leer:  agrega "- se revisa cada 30 segundos" debajo',
  "change-not-saved":
    '{what} no se guarda en un lugar, así que esto nunca se ejecutaría.  Di dónde se guarda, p. ej. "- se guarda en el recetario familiar";  o "cuando su título cambia:", para una de sus propiedades',
  "someone-else-needs-a-type":
    'Di qué cambia:  esto va debajo de un tipo guardado, p. ej. "- cuando otra persona la cambia:" debajo de una receta',
  "someone-else-alone":
    "Nadie más puede cambiar lo que se guarda aquí:  esto nunca se ejecutaría.  Hace falta un lugar que otras personas compartan",
  "someone-else-not-told":
    'Un lugar de tipo "{kind}" no puede avisar de lo que cambió, así que esto nunca se ejecutaría:  agrega "- se revisa cada 30 segundos" debajo',
  "people-here-only-you":
    "Ningún lugar aquí sabe quién más está presente, así que esto siempre eres solo tú:  hace falta una sala",
  "operation-outside-place":
    "Esta acción llega a un lugar solo en una línea debajo de ese lugar, así que aquí no hace nada:  muévela debajo del lugar",
  "operation-not-taken":
    'Un lugar de tipo "{kind}" no acepta una acción en una dirección propia, así que esto fallaría al ejecutarse:  hace falta un servidor web',
  "draw-items-of-a-thing":
    "Un {type} no es una lista, así que no tiene elementos que dibujar:  un dibujo propio lo dibuja él, en sus propias líneas",
  "type-from-itself":
    'Nada puede hacerse de sí mismo:  "{name}" ya es una clase de cosa, así que llama a esta de otra forma',
  "where-looks-through":
    "Esto no se puede enviar al lugar, que solo busca valores exactos:  lee cada {type} y las revisa aquí, hasta un límite",
  "sort-key-waits":
    "Un orden no puede esperar a su clave:  ordenaría sin ningún orden.  Ordena por un campo propio, o calcula antes la clave",
  "rider-only-in-a-drawing":
    "Esto muestra algo mientras una lectura no tiene nada que mostrar, así que solo va en un dibujo, debajo de la lectura:  una acción simplemente espera",
  "in-one-go-not-atomic":
    "Un lugar aquí no puede aplicar los cambios todos juntos:  van de uno en uno, así que otros pueden ver algunos por un momento",
  "no-save-step":
    '"{text}" no es un borrador:  un cambio se guarda al hacerlo, sin paso de guardar.  Para una pantalla con botón de cancelar:  "un borrador de ..."',
  "no-such-data-word":
    'Encanto no puede "{word}" eso:  di una vez dónde viven los datos, "x es un servidor web en ...", y "- vive en x", y luego "cada receta donde ..." los lee',
  "belongs-to-saved-needs-list":
    'Un {owner} los guarda, así que necesita una lista donde guardarlos:  agrega su "{items}" es una lista de {items}',
  "place-cloud-later": 'La nube aún no está:  nombra un lugar propio por ahora, p. ej. "x es una sala en ..."',
  "atmosphere-public":
    "Todo lo que se guarda en esta {kind} es público:  cualquiera puede leerlo, y queda ahí para siempre.  No guardes nada privado aquí",
  "atmosphere-your-own":
    'En esta {kind} cada persona cambia solo sus propios registros:  cambiar los de otra se rechaza, y "todos los presentes" son todos los que tienen registros aquí, no quienes miran ahora',
  "atmosphere-reads-here":
    'Esta {kind} solo entrega sus registros de página en página, así que "donde" y "ordenado por" los cargan en el navegador, hasta 50.000;  y guarda solo números enteros, sin decimales',
  "atmosphere-not-an-account": '"{address}" no es una cuenta:  empieza por "did:plc:" o "did:web:"',
  "atmosphere-not-a-corner":
    '"{address}" no es un rincón de una cuenta:  se lee como un dominio al revés, p. ej. "com.example.cookbook"',
  "atmosphere-not-a-collection":
    '"{address}" no es una colección allí:  se lee como un dominio al revés, y luego un nombre de letras y dígitos, p. ej. "com.example.recipe"',
  "version-step-no-rename-there":
    "Una cuenta de atmosphere no puede cambiar el nombre de lo guardado:  los registros antiguos de cada persona conservan sus nombres para siempre.  Esta línea solo cambia cómo se leen aquí;  otros programas siguen viendo los nombres antiguos, y tus registros nuevos los nuevos.  Para empezar de verdad de cero, guárdalos bajo un nombre de colección nuevo",
  "airtable-not-a-base":
    '"{address}" no es una base de Airtable:  su id empieza por "app", p. ej. "appXXXXXXXXXXXXXX", y está en la dirección de la base en Airtable',
  "airtable-last-save-wins":
    "Airtable no puede saber que otra persona llegó antes:  cuando dos personas cambian un campo, gana el último en guardar, sin aviso, también con lo que se edita en el propio Airtable.  Campos distintos se conservan los dos.  Para un árbitro que diga quién perdió, pon una sala delante",
  "airtable-worked-out-fields":
    "Airtable calcula por sí mismo sus fórmulas, búsquedas, resúmenes y recuentos, y solo se pueden leer:  a un programa que escribe uno se le deshace el cambio al ejecutarse, con un aviso que dice por qué",
  "airtable-calls-count":
    "Cada página de 100 filas es una petición, y todos los que usan esta base comparten 5 por segundo.  El plan gratuito de Airtable además se detiene en 1.000 peticiones al mes, que revisar cada 30 segundos gasta en unas 8 horas",
  "airtable-no-id-column":
    'Airtable crea sus propios ids, así que una fila nueva enviada otra vez tras perderse la respuesta sería una segunda fila:  agrega una columna de texto para los ids de Encanto, y "- su id es su "id encanto"" debajo',
  "airtable-needs-key":
    'Airtable no responde a nadie sin una clave:  agrega "- su clave es el secreto "CLAVE_AIRTABLE"" debajo, y guarda la clave en un servidor',
  "never-both": 'Una cosa nunca puede ser las dos a la vez, así que esto no encuentra nada:  ¿querías decir "o"?',
  "where-field-unknown":
    '{AType} no tiene "{field}":  decláralo allí, o di "el {field} es esa persona" si es el del programa',
  "hides-property": 'Aquí "{name}" oculta la propiedad "{name}":  usa otro nombre, o di "su {name}" para la propiedad',
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
  "no-dotted-field":
    'El nombre de un campo no lleva punto:  lo que hay dentro de "{field}" es una cosa aparte, un tipo con sus propios campos, y se lee con palabras',
  "cant-save-built-in-inline":
    "No se puede guardar el tipo {type} dentro:  viene incorporado, y todos los proyectos lo comparten",
  "cant-save-built-in-in-file":
    "No se puede guardar el tipo {type} en su propio archivo:  viene incorporado, y todos los proyectos lo comparten",
  "belongs-to-undeclared": 'Todavía no se puede decir {sentence}:  declara "{example}" antes',
  "belongs-to-built-in-list": "No se puede decir {sentence}:  cada lista tendría {aType} una sola vez",
  "belongs-to-not-a-list": "No se puede decir {sentence}:  {aList} no es una lista",
  "markdown-outside-outline":
    "Un bloque <markdown> va en el esquema de un tipo, como su descripción, o en un dibujo:  devolver <markdown>...</markdown>",
  "retired-type-word": '"{words}" ahora es "{replacement}":  di "{replacement}", o ejecuta `spell lint --fix`',
  "retired-word-gone":
    'Ya no hace falta "{words}", pues spell espera por sí solo:  quítalo, o ejecuta `spell lint --fix`',
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
  "spellx-one-line-tag":
    '{tag} se cierra en su propia línea, "... />":  pon el código más largo entre "{open}" y "</>"',
  "spellx-unclosed-head": '{tag} nunca termina:  ciérralo con ">", o con "/>" si nada va dentro',
  "spellx-unclosed-comment": '"<!--" nunca se cierra:  termina el comentario con "-->"',
  "chain-outside-markup":
    '{tag} elige lo que muestra un elemento, así que va dentro de uno:  para elegir todo el dibujo, escribe "{if} ..." en una línea propia',
  "spellx-otherwise-without-if": '{tag} necesita un "{if}" antes',
  "spellx-otherwise-after-closed-if": '{tag} sigue el "{if}" de arriba, pero un "</>" lo cerró:  quita el "</>"',
  "spellx-for-flag-first": 'Mueve "{flag}" después de los atributos de {tag}:  escrito primero, se lee como parte de la lista',
  "spellx-for-needs-as": '"{attribute}" en {tag} va en lo que rodea a sus elementos:  di cuál, con {as}="tarjetas"',
  "spellx-for-table-needs-cells": '{tag} dibuja una fila por elemento:  nombra sus columnas, <celda "Nombre">{su nombre}</celda>',
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
