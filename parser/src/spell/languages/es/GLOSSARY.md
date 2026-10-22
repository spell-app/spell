# Spell in Spanish:  the translators' glossary (epic `spanish`, P5-P7)

The Spanish pack's words:  whoever translates a rule into Spanish, a person or an AI, uses THESE words,
so the grammar reads as one language.
- `spell lang packs fix es --ai` hands this page to `claude` with each rule it translates.
- A new word chosen for a rule belongs here too.

Where a keyword has a written accent, the syntax accepts it WITHOUT the accent too (Owen's pick):  `(sí|si)`,
`(número|numero)`, `(está|esta)`, `(más|mas)`, `(después|despues)`.  Names people choose keep their accents.

## Small words

| English | Spanish in a syntax |
| --- | --- |
| a / an | `(un|una)` (plural `unos|unas` where English allows a plural) |
| the | `(el|la|los|las)`;  optional `the?` is `(el|la|los|las)?` |
| of | `(de|del)` -- `del` is `de el` |
| to (a place, a list) | `(a|al)` -- `al` is `a el` |
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
| its | `(su|sus)` |
| it (the subject) | left out:  Spanish drops it (`subject_implied`);  where a word is needed, `(él|el|ella)` is NOT used |
| if | `si` |
| then | `entonces` |
| else / otherwise | `(si no|sino|de lo contrario)` |
| otherwise it is | `de lo contrario es` |
| true / false | `verdadero` / `falso` |
| yes / no | `(sí|si)` / `no` |
| ok / cancel | `(aceptar|ok)` / `cancelar` |
| always / never | `siempre` / `nunca` |
| nothing / undefined | `(nada|indefinido)` |
| new | `(nuevo|nueva|nuevos|nuevas)` |
| list / thing / type / app | `lista` / `cosa` / `tipo` / `(aplicación|aplicacion)` |
| named / called | `(llamado|llamada)` |
| number words zero-ten | `cero`, `(uno|una|un)`, `dos`, `tres`, `cuatro`, `cinco`, `seis`, `siete`, `ocho`, `nueve`, `diez` |
| ordinals | `(primer|primero|primera)`, `(segundo|segunda)`, `(tercer|tercero|tercera)`, `(cuarto|cuarta)`, `(quinto|quinta)`, `(sexto|sexta)`, `(séptimo|septimo|séptima|septima)`, `(octavo|octava)`, `(noveno|novena)`, `(décimo|decimo|décima|decima)`, `(penúltimo|penultimo|penúltima|penultima)`, `(último|ultimo|última|ultima)`, `final`;  top `arriba`, bottom `abajo` |

## Verbs

| English | Spanish |
| --- | --- |
| is / is not | `(es|está|esta)` / `(no es|no está|no esta)` |
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
| is empty | `está vacío` (accept `(vacío|vacio|vacía|vacia)`) |
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
| wait for / pause for N seconds | `esperar (a)?` / `pausar N segundos` |
| start / stop / end / finish / cancel | `iniciar` / `detener` / `terminar` / `terminar` / `cancelar` |
| test / expect that / should be | `probar` (`para probar ...`) / `esperar que` / `(debería|deberia) ser` |
| on (an event) / trigger / fire | `al` / `(disparar|lanzar)` |
| create a X | `crear (un|una) X` |
| a new X with p = v | `(un nuevo|una nueva) X con p = v` |
| draw its front / back | `dibujar su (frente|dorso)` -- meanings `front` / `back` (a word rule, Owen's pick) |

## Rules for translating a module

1. For every registration in `<module>.en.ts`, write ONE in `<module>.es.ts`, same class, SAME ORDER, on the Spanish
   module parser that file exports (`<module>Es`).
2. Word rules (`Negatable`, `Wording`, `Synonyms` and their `specialize(...)`):  register the SAME rule names with
   Spanish forms, the same named groups (meanings).
3. Tests:  translate each test's INPUT;  keep a person's own names (`thing`, `other`, `theList`, `Card`) as English
   did, so the expected `js` / `ts` stay EXACTLY the English test's.  Translate only spell's own words.
   - Where the compiled names come FROM the words (a quoted phrase `"está boca arriba"` => `estáBocaArriba`), the
     output follows the Spanish words:  write what the writers really write, and check it reads right.
4. Spanish word order:  adjectives after the noun don't matter to the parser (a name is looked up whole);
   ordinals still come first (`la primera carta`).
5. Gender agreement isn't checked (P8 warns):  accept every article form.
6. If a rule CLASS reads or writes an English word in its code (the guard test, `tests/spell/languages/noEnglishInRules.test.ts`,
   only catches reads), make it a word rule registered in BOTH `.en.ts` and `.es.ts`, keeping English's output identical.
7. Tests for a module:  `tests/spell/rules/es/<module>/<module>.test.ts`, as the English one, calling
   `unitTestModuleRules(SP.spanish.parser, "<module>", ...)` (`SP` from `spell-lang/spell`).
8. A Spanish phrasing you had to choose that a native speaker might choose differently:  a CALM judgement call,
   `epic add spanish#J "<title>" --calm --details "<p>chose ... over ... because ...</p>"` (run from
   /Users/owen/www/spell.worktrees/spanish).
