# Words Prototype:  every proposed line, tried on the real parser

Epic `data`, P10, 2026-10-31.  T8:  the first time any proposed Spell line was compiled.

- What it's from:  [wordsPrototype.test.ts](/parser/tests/spell/parserTests/wordsPrototype.test.ts), which pins each row.
  `WORDS_TABLE=<path> yarn vp test run --project spell tests/spell/parserTests/wordsPrototype.test.ts` writes the table below.
- The rules that read the new lines:  [wordsPrototype.rules.ts](/parser/tests/spell/parserTests/wordsPrototype.rules.ts).
  They're on a clone of the parser, for that test alone.  No project sees them, and they compile to a call nothing defines.
- So "compiles with a rule" means a line can be READ, among the rules there are, with no collision.
  It doesn't mean it does anything yet.  Connecting words to places is The Words (P11).
- What really runs:  `every recipe where ...`, `..., sorted by ...`, and the lines marked "ran" in the Note column.

Since P13 (Live And Presence), `the people here`, `when a recipe changes:` and `when someone else changes it:` are real words.
Since P15 (Words Settled), so are `me` and `my name` (`yo`, `mi nombre`), which replaced `the current person`, and Q17's C, `to publish a recipe is at "/recipes/publish"`.
The table below is as P10 found it;  the test pins them as they are now, and every word in the whole recipe box compiles with no prototype rule.

## What it found, that nobody expected

1. **A line that compiles can be wrong.**  Five proposed lines compile today to something else, with no error:
   - `when someone else changes it:` => an event of that name, which never comes (o3 feared a property;  it's an event)
   - `when a recipe changes:` => the event `a-recipe-changes`, which nobody sends
   - `the total of its prices` => a property called `total`, which isn't there
   - `its cook is "Ana" or "Bo"`, which the Overview said already works, and `is either "Ana" or "Bo"` => always true:  every recipe (I13)
2. **`is saved in` collides with `is saved in its own file`.**  With any expression after `in`, `its own` reads as a property.
   Only a place's name may follow.
3. **`draw the recipe` in a loop draws nothing** (I14), so the Overview's shelf would be empty.
4. **`to publish (a recipe) is at "..."` couldn't compile** (Q14's form):  `to ...` took every word up to the text as a name.  Q17 chose the one line, with no parentheses:  built in P15.
5. **`cancel search` inside a handler is today's `cancel <event>`**, and drops the name.
6. **`save the draft`:  the Overview's own box has a `draft`, a text.**  It's refused, saying there's no save step.
7. **A saved type is known only below its declaration.**  A line above sees just the name, as every type is stubbed.
8. **`cada receta, ordenadas por`** can't agree (J58).
9. What held up better than feared:  every kind of place reads, both languages, multi-word kinds with `at` and `de` in them,
   `each person's own at protocol account`, `a recipe's title is called`.  Kinds as types (Q2) work:  a test adds `a supabase project`.

## I1's cause

Two causes, one behind the other:
- `its "m" is recipes in its stuff where ...` read as a stored property of type `recipes`, then words nothing reads.
  A rule's priority is compared before its length, and the stored property's is higher.
  - Only that shape failed:  `its "m" is the recipes in ...`, and `"m" is recipes in ...`, always worked.
  - Fixed:  a stored property's line said with `its` that stops short of its line gives way (J57).
- `every recipe where ...` and `..., sorted by ...` didn't exist in any form.  Added, English and Spanish.

## What The Words must decide

1. `every recipe` for a saved type:  it has to know the type is saved while it's parsed, as the waiting pass needs to.
   Note it with the stubs, before a project parses, as a type's name is.  Or have a line above the type mean memory, which is wrong.
2. Q17:  how a named operation is said.  Settled in P15:  C, `to publish a recipe is at "..."`, under a place.
3. What `where` and `sorted by` compile to for a saved type:  today `core.filter(core.everyThing(T), fn)` runs a function per item,
   and a place wants a filter it can hand on.  Recognising the simple shapes at compile time is the choice.
4. `belongs to one`:  the prototype takes a non-list owner only if it's saved.  The Overview's `ingredient` itself says nothing of a place:
   does belonging to a saved recipe make it saved, and where's its `the recipe of an ingredient` kept?
5. I13:  what `is "Ana" or "Bo"` means, and `either` with text.  I14:  `draw the x` as a drawn line.  I15:  a sort key that waits.
6. `cancel search` in a handler:  an action's name should win over an event's, when it declares one.
7. Riders attach to the read above them, as `otherwise` does to its `if`.  The prototype only reads them, one line at a time.
8. Spanish:  gender in `ninguna`, `otra persona lo cambia`, `ordenada`;  `para quitar eso` rather than `para quitarla`;  every word through the glossary.
9. `sortedBy()`'s text order ignores case, and takes no account of accents, in either core:  `ñ` sorts after `z`.
10. What drives the things:  `thingsFrom()` only runs when called (J20), so a read needs a memo or link to call it, and `result.leave()` when it's gone.
    Actions reach writes by `core.runAction()`, `core.meanwhile()`.  None of this was tried here:  connecting is P11's.

## The table

"wrong":  compiles, to something else.  With a rule, each line is only read, as above.
| Line | Spanish | en today | en with rule | es today | es with rule | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `family cookbook is a web service at "https://api.example.com/v1"` | `recetario familiar es un servicio web en "https://api.example.com/v1"` | compiles | compiles | compiles | compiles |  |
| `family cookbook is a graph service at "https://api.example.com/gql"` | `recetario familiar es un servicio de grafos en "https://api.example.com/gql"` | compiles | compiles | compiles | compiles |  |
| `family cookbook is a folder at "recipes"` | `recetario familiar es una carpeta en "recetas"` | compiles | compiles | compiles | compiles |  |
| `family cookbook is a file at "recipes.json5"` | `recetario familiar es un archivo en "recetas.json5"` | compiles | compiles | compiles | compiles |  |
| `family cookbook is this device` | `recetario familiar es este dispositivo` | compiles | compiles | compiles | compiles | no kind and no address:  its own rule, so a library can't add one of this shape |
| `family cookbook is a live room at "wss://rooms.example.com/family"` | `recetario familiar es una sala en vivo en "wss://rooms.example.com/family"` | compiles | compiles | compiles | compiles |  |
| `family cookbook is a sheet at "recipes.csv"` | `recetario familiar es una hoja en "recetas.csv"` | compiles | compiles | compiles | compiles |  |
| `family cookbook is an airtable base at "appXXXXXXXXXXXXXX"` | `recetario familiar es una base de airtable en "appXXXXXXXXXXXXXX"` | fails | compiles | fails | compiles |  |
| `family cookbook is an at protocol account at "did:plc:abc123"` | `recetario familiar es una cuenta de at protocol en "did:plc:abc123"` | fails | compiles | fails | compiles | `at` both starts the kind's name and follows it:  it reads, because a type's name is read longest first |
| `family cookbook is each person's own at protocol account:` | `recetario familiar es la propia cuenta de at protocol de cada persona:` | fails | compiles | fails | compiles | the one that doesn't fit `is a ... at`:  its own rule, with no address |
| `family cookbook is a web service at "https://api.example.com/v1":` | `recetario familiar es un servicio web en "https://api.example.com/v1":` | compiles | compiles | compiles | compiles | a place's details:  each its own rule, in the place's outline body |
| `family cookbook is a web service at "https://api.example.com/v1":` | `recetario familiar es un servicio web en "https://api.example.com/v1":` | compiles | compiles | compiles | compiles | Q14's form, with its parentheses, still reads |
| `family cookbook is a web service at "https://api.example.com/v1":` | `recetario familiar es un servicio web en "https://api.example.com/v1":` | compiles | compiles | compiles | compiles | Q17's C:  one line, no parentheses;  a known type's name is what's sent, and with none, nothing is.  Only under a place |
| `family cookbook is the cloud` | `recetario familiar es la nube` | fails | compiles | fails | compiles | after the seven back-ends (Q3):  the words are ready for it |
| `- it is saved in the family cookbook` | `- se guarda en el recetario familiar` | fails | compiles | fails | compiles | only a place's name may follow:  any expression there reads `its own file` as a property, `own` |
| `- it is saved in its own file` | `- se guarda en su propio archivo` | compiles | compiles | compiles | compiles | works today, and keeps its meaning |
| `an ingredient belongs to one recipe` | `un ingrediente pertenece a una receta` | fails | fails | fails | fails | refused when its owner isn't a list and isn't saved, as today.  A saved owner:  below, `the collisions` |
| `every recipe` | `cada receta` | compiles | compiles | compiles | compiles | a scratch list of what the program made;  for a saved type, a change of meaning, in The Words |
| `the recipes` | `las recetas` | compiles | compiles | compiles | compiles |  |
| `the first recipe` | `la primera receta` | compiles | compiles | compiles | compiles | the first made;  for a saved type, the oldest |
| `every recipe where it is quick` | `cada receta donde es rápida` | compiles | compiles | compiles | compiles | new in this phase, in the real parser (`every_thing_where`):  ran |
| `every recipe where its title includes the search` | `cada receta donde su título incluye la búsqueda` | compiles | compiles | compiles | compiles | new in this phase:  ran |
| `every recipe, sorted by its title` | `cada receta, ordenada por su título` | compiles | compiles | compiles | compiles | new in this phase (`list_sorted_by`):  ran.  The Overview's `cada receta, ordenadas` can't agree:  `cada` is one |
| `the first 20 recipes where it is quick` | `las primeras 20 recetas donde es rápida` | compiles | compiles | compiles | compiles |  |
| `the number of recipes where it is quick` | `el número de recetas donde es rápida` | compiles | compiles | compiles | compiles |  |
| `the total of its prices` | `el total de sus precios` | wrong | compiles | wrong | compiles | today it silently reads a property called `total`, which isn't there.  The rule takes only a list |
| `its "matches" is every recipe where its title includes the search, sorted by its title` | `sus "coincidencias" es cada receta donde su título incluye la búsqueda, ordenada por su título` | compiles | compiles | compiles | compiles | I1's sentence:  ran |
| `the nickname of its cook` | `el apodo de su cocinero` | compiles | compiles | compiles | compiles |  |
| `the number of its ingredients` | `el número de sus ingredientes` | compiles | compiles | compiles | compiles |  |
| `every recipe where its title is "Ana" or "Bo"` | `cada receta donde su título es "Ana" o "Bo"` | compiles | compiles | compiles | compiles | fixed in The Words (I13):  either of them.  Ran |
| `every recipe where its title is either "Ana" or "Bo"` | `cada receta donde su título es o bien "Ana" o "Bo"` | compiles | compiles | compiles | compiles | fixed in The Words (I13):  either of them.  Ran |
| `every recipe where its title is "Ana" or its title is "Bo"` | `cada receta donde su título es "Ana" o su título es "Bo"` | compiles | compiles | compiles | compiles | what does work, today:  ran |
| `every recipe where its title is "Ana" and its title is "Bo"` | `cada receta donde su título es "Ana" y su título es "Bo"` | compiles | compiles | compiles | compiles | can never be true, and nothing says so:  the warning is The Words' |
| `while waiting:` | `mientras espera:` | fails | compiles | fails | compiles | no `while` loop to collide with, whatever a program has called `waiting` |
| `if there are none:` | `si no hay ninguna:` | fails | compiles | fails | compiles | `ninguna` agrees with its type:  `ninguno` for a masculine one |
| `if that fails:` | `si falla:` | fails | compiles | fails | compiles |  |
| `add (a new recipe with title = "x") to the recipes` | `agregar (una nueva receta con título = "x") a las recetas` | compiles | compiles | compiles | compiles |  |
| `add (a new recipe with title = the draft, cook = me) to the recipes` | `agregar (una nueva receta con título = el borrador, cocinero = yo) a las recetas` | compiles | compiles | compiles | compiles | real since Live And Presence (P13) |
| `remove the recipe from the recipes` | `quitar la receta de las recetas` | compiles | compiles | compiles | compiles |  |
| `set the title of the recipe to "x"` | `poner el título de la receta a "x"` | compiles | compiles | compiles | compiles |  |
| `all or nothing:` | `todo o nada:` | compiles | compiles | compiles | compiles |  |
| `set d to a draft of the recipe` | `poner d a un borrador de la receta` | compiles | compiles | compiles | compiles |  |
| `save the draft` | `guardar el borrador` | fails | fails | fails | fails | the Overview's box has its own `draft`, a text:  refused, naming why.  Of a real draft:  below, `the collisions` |
| `clear the draft` | `limpiar el borrador` | compiles | compiles | compiles | compiles |  |
| `- to remove it:` | `- para quitar eso:` | compiles | compiles | compiles | compiles | the Spanish is `quitar eso`:  `para quitarla` reads as a name, and `quitarla de ...` doesn't |
| `when a recipe changes:` | `cuando cambia una receta:` | fails | compiles | fails | compiles | an event nobody sent, until Live And Presence (P13).  Here a recipe's in no place, so it's refused:  it would never run |
| `refresh the recipes` | `recargar las recetas` | compiles | compiles | compiles | compiles |  |
| `me` | `yo` | compiles | compiles | compiles | compiles | real since Live And Presence (P13) |
| `the people here` | `las personas presentes` | compiles | compiles | compiles | compiles | real since Live And Presence (P13) |
| `- when someone else changes it:` | `- cuando otra persona lo cambia:` | fails | compiles | fails | compiles | an event of that name, which never came, until Live And Presence (P13).  Here a recipe's in no place, so it's refused |
| `- when its title changes:` | `- cuando su título cambia:` | compiles | compiles | compiles | compiles | the Overview's `when its X changes` |
| `cancel search` | `cancelar búsqueda` | compiles | compiles | compiles | compiles | inside a handler, today's `cancel <event>` still takes it:  below, `the collisions` |
| `- to search:` | `- para buscar:` | compiles | compiles | compiles | compiles | language's;  the Overview had no Spanish for it |
| `- to load the scores:` | `- para cargar los puntajes:` | compiles | compiles | compiles | compiles |  |
| `- to find the scores:` | `- para buscar los puntajes:` | compiles | compiles | compiles | compiles |  |
| `- to fetch the scores:` | `- para traer los puntajes:` | compiles | compiles | compiles | compiles |  |
| `publish the recipe` | `publicar la receta` | fails | compiles | fails | compiles | Q14's call:  no verb of its own, an action declared under the place, called from anywhere |
| `try again` | `reintentar` | compiles | compiles | compiles | compiles |  |
| `start the recipe box` | `iniciar la caja de recetas` | compiles | compiles | compiles | compiles |  |
