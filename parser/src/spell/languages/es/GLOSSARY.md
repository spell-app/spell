# Spell in Spanish:  the translators' glossary (epic `spanish`, P5-P7)

The Spanish pack's words:  whoever translates a rule into Spanish, a person or an AI, uses THESE words,
so the grammar reads as one language.
- `spell translate fix es --ai` hands this page to `claude` with each rule it translates.
- A new word chosen for a rule belongs here too.

Where a keyword has a written accent, the syntax accepts it WITHOUT the accent too (Owen's pick):

```text
(sí|si)   (número|numero)   (está|esta)   (más|mas)   (después|despues)
```

Names people choose keep their accents.

## Small words

| English | Spanish in a syntax |
| --- | --- |
| a / an | `(un|una)` (plural `unos|unas` where English allows a plural) |
| the | `(el|la|los|las)`;  optional `the?` is `(el|la|los|las)?` |
| of | `(de|del)` -- `del` is `de el`;  a method's words and its calls may say either |
| to (a place, a list) | `(a|al)` -- `al` is `a el`;  a method's words and its calls may say either |
| to (starting a method) | `para` |
| in / into / at | `en` |
| on | `(en|sobre)` |
| from | `(de|desde)` |
| with | `con` |
| without | `sin` |
| for | `para` |
| by | `por` |
| before / after | `antes de` / `(después|despues) de` |
| and | `y` (`e` before an i- word:  accept `(y|e)`) |
| or | `(o|u)` |
| nor | `ni` |
| not | `no` (goes BEFORE the verb:  `no es`, `no tiene`, `no empieza con`) |
| either | `o bien` |
| neither ... nor | `ni ... ni` |
| as | `como` |
| aka | `alias` |
| one of | `(uno|una) de` |
| each / every | `cada` |
| all | `(todos|todas)` |
| where | `donde` |
| whose | `(cuyo|cuya|cuyos|cuyas)` |
| which / that | `que` |
| its | `(su|sus)`:  a plural name says `sus ... son`, `- sus "comodines" son sí o no` (`su "x" es` too) |
| it (the subject) | left out:  Spanish drops it (`subject_implied`;  before `es` / `está` / `puede` in an expression, `implied_it`:  `si es un trébol`);  where a word is needed, `(él|el|ella)` is NOT used |
| if | `si` |
| then | `entonces` |
| else / otherwise | `(si no|sino|de lo contrario)` |
| otherwise it is | `de lo contrario es`:  the other value, never a comparison, in a getter's line and inside an expression alike, `"↑" si está boca arriba de lo contrario es "↓"` |
| true / false | `verdadero` / `falso` |
| yes / no | `(sí|si)` / `no` |
| ok / cancel | `(aceptar|ok)` / `cancelar` |
| always / never | `siempre` / `nunca` |
| nothing / undefined | `(nada|indefinido)` |
| new | `(nuevo|nueva|nuevos|nuevas)` |
| list / thing / type / app | `lista` / `cosa` / `tipo` / `(aplicación|aplicacion)` |
| a property's kind of values, `card suit` | Spanish's order, `palo de carta` (`{property} de {type}`, the pack's `propertyKindName`);  plural `palos de carta` |
| a class's list of values, `card suits` | `palos de carta` |
| a place's kinds | `servicio web`, `servicio de grafos`, `carpeta`, `archivo`, `sala en vivo`, `hoja`, `este dispositivo`, `en memoria`, `la nube` |
| x is a web service at "..." | `x es un servicio web en "..."` |
| it is saved in the place | `se guarda en el lugar` (and `su propio archivo` keeps its meaning) |
| recipes are at "...", a recipe's title is called "..." | `las recetas están en "..."`, `el título de una receta se llama "..."` |
| its key is the secret "...", it is checked every 30 seconds | `su clave es el secreto "..."`, `se revisa cada 30 segundos` |
| its versions are in "...", its ids are in "..." | `sus versiones están en "..."`, `sus identificadores están en "..."` |
| while waiting, if there are none, if that fails | `mientras espera`, `si no hay (ninguno\|ninguna)` (agrees with what its loop reads), `si falla` |
| all or nothing | `todo o nada` |
| a draft of, save, cancel | `un borrador de`, `guardar`, `cancelar` |
| refresh, try again | `recargar` (`actualizar` means a version upgrade), `reintentar` |
| when a recipe changes | `cuando cambia una receta` |
| when someone else changes it | `cuando otra persona (lo\|la) cambia`:  agrees with its type, `la` for a `receta` |
| the current person, the people here | `la persona actual`, `las personas presentes` |
| sorted by | `(ordenado\|ordenada\|ordenados\|ordenadas) por`:  agrees with its list, `cada receta, ordenada`, `las recetas, ordenadas` |
| named / called | `(llamado|llamada)` |
| number words zero-ten | `cero`, `(uno|una|un)`, `dos`, `tres`, `cuatro`, `cinco`, `seis`, `siete`, `ocho`, `nueve`, `diez` |
| ordinals | `(primer|primero|primera)`, `(segundo|segunda)`, `(tercer|tercero|tercera)`, `(cuarto|cuarta)`, `(quinto|quinta)`, `(sexto|sexta)`, `(séptimo|septimo|séptima|septima)`, `(octavo|octava)`, `(noveno|novena)`, `(décimo|decimo|décima|decima)`, `(penúltimo|penultimo|penúltima|penultima)`, `(último|ultimo|última|ultima)`, `final`;  top `arriba`, bottom `abajo` |

## Verbs

| English | Spanish |
| --- | --- |
| is / is not | `(es|está|esta)` / `(no es|no está|no esta)`;  its plurals `son`, `están` too |
| are / are not | `(son|están|estan)` / `(no son|no están|no estan)` |
| is a / is not a | `(es un|es una|son unos|son unas)` / `(no es un|no es una|...)` |
| has / have / does not have | `tiene` / `tienen` / `no tiene(n)` |
| can / cannot | `(puede|pueden)` / `no (puede|pueden)` |
| will / won't | `va a` / `no va a` (rare:  keep simple) |
| belongs to one | `pertenece a (un|una)` |
| can belong to many | `puede pertenecer a (muchos|muchas)` |
| is saved in its own file / inline | `se guarda en su propio archivo` / `se guarda dentro` |
| must be | `debe ser` |
| at least / at most | `al menos` / `(como mucho|a lo sumo)` |
| starts with / ends with | `empieza con` / `termina con` |
| includes / contains | `(incluye|contiene)` |
| exists | `existe` |
| there is a / there is no | `hay (un|una)` / `no hay (ningún|ninguna|ningun)` |
| is empty | `está vacío` (accept `(vacío|vacio|vacía|vacia)`, and the plurals `están vacíos` / `vacías`) |
| is greater / less than (or equal to) | `es mayor que` / `es menor que` (`o igual a`) |
| plus / minus / times / divided by | `más` / `menos` / `por` / `dividido (por|entre)` |
| return | `devolver` |
| get | `obtener` |
| set X to Y | `(poner|fijar) X (a|en) Y` |
| X is Y (assignment) | `X es Y` |
| print / show / draw / say | `imprimir` / `mostrar` / `dibujar` / `decir` |
| alert / confirm / prompt / warn / notify | `avisar` / `confirmar` / `preguntar` / `advertir` / `notificar` |
| add X to L / remove X from L / move X to L | `(agregar|añadir|anadir) X a L` / `(quitar|eliminar) X de L` / `mover X a L` |
| shuffle / randomize / reverse / empty / clear | `(barajar|mezclar)` / `(barajar|mezclar)` / `invertir` / `vaciar` / `vaciar` |
| repeat N times | `repetir N veces` |
| for each X in L | `para cada X en L` |
| a random X (a kind's value) | `(un|una) X (al azar|aleatorio|aleatoria)`:  `un palo de carta al azar` |
| pause for N seconds | `pausar N segundos` (`esperar (a)?`, retired with `wait for`) |
| start / stop / end / finish / cancel | `iniciar` / `detener` / `terminar` / `terminar` / `cancelar` |
| test / expect that / should be | `probar` (`para probar ...`) / `esperar que` / `(debería|deberia) ser` |
| on (an event) / trigger / fire | `al` / `(disparar|lanzar)`;  an event's name may hold `en`, `de`, `del`, `sobre` between its words, ending at `con`:  `al clic en carta con una carta`, `disparar evento clic en carta con carta = eso` |
| create a X | `crear (un|una) X` |
| a new X with p = v | `(un nuevo|una nueva) X con p = v` |
| to create it (what runs as it's made) | `para crearlo` (`crearla`, `crear eso`), or `para crear un mazo` -- the `create()` hook (`create_method`) |
| to shuffle it (`it` fused into the verb) | `- para barajarlo:` (`-la`, `-los`, `-las`):  its calls say `barajar el mazo` |
| to draw it / to draw each item | `para dibujarlo` (`dibujarla`, `dibujar eso`) / `para dibujar cada elemento` -- meanings `draw` / `draw_each_item` (the `draw_method` word rule);  the item is `el elemento` |

## Rules for translating a module

1. For every registration in `<module>.en.ts`, write ONE in `<module>.es.ts`:
   - the same class, in the SAME ORDER
   - on the Spanish module parser that file exports (`<module>Es`)
2. Word rules:  register the SAME rule names with Spanish forms, and the same named groups (meanings).
   - `Negatable`
   - `Wording`
   - `Synonyms`
   - and their `specialize(...)`
3. Tests:  translate each test's INPUT, and only spell's own words.
   - Keep a person's own names as English did (`thing`, `other`, `theList`, `Card`):
     so the expected `js` / `ts` stay EXACTLY the English test's.
   - Where the compiled names come FROM the words, the output follows the Spanish words:
     a quoted phrase `"está boca arriba"` => `estáBocaArriba`.
     Write what the writers really write, and check it reads right.
4. Spanish word order:  adjectives after the noun don't matter to the parser (a name is looked up whole);
   ordinals still come first (`la primera carta`).
5. Gender agreement isn't checked (P8 warns):  accept every article form.
6. If a rule CLASS reads or writes an English word in its code:
   make it a word rule, registered in BOTH `.en.ts` and `.es.ts`, keeping English's output identical.
   - The guard test only catches reads:
     [noEnglishInRules.test.ts](../../../../tests/spell/languages/noEnglishInRules.test.ts).
7. Tests for a module, as the English one's:
   a file of their own, calling the Spanish parser (`SP` from `spell/parser/spell`):

   ```text
   tests/spell/rules/es/<module>/<module>.test.ts
   unitTestModuleRules(SP.spanish.parser, "<module>", ...)
   ```

8. A Spanish phrasing you had to choose, which a native speaker might choose differently:
   a CALM judgement call, run from /Users/owen/www/spell.worktrees/spanish:

   ```sh
   epic add spanish#J "<title>" --calm --details "<p>chose ... over ... because ...</p>"
   ```
