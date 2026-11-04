# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/py/` of the kit's parser folder (`spell/parser/py`).

**READ the parser folder's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the folder's layout, and the house style every folder shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- Everything spell has for Python, in one place (epic `python-target` P21):
  - its TypeScript ([index.ts](index.ts) ...):  what writes Python, `spell/parser/py` (`PY`)
  - [core/](core/pyproject.toml):  `spell_core`, what compiled Python imports
  - NOT here:  `spell_quart`, Python's web server, which serves a program as a web app on Quart.
    It's in the spaces package, [its Python side](../../../app/src/spaces/server/py/pyproject.toml)
    ([spaces' AGENTS.md](../../../app/src/spaces/AGENTS.md);  epic `people-and-orgs` P14).
- A folder of the kit's parser folder, its entry `spell/parser/py`:
  no `package.json` of its own (epic `repo-split` P11).
  - Its TypeScript is the folder's own files (`index.ts`, `PyWriter.ts` ...), as every folder's.
  - `core/` is a uv project of its own, beside them:  yarn, TypeScript, oxlint and oxfmt don't look in it.
- It imports only `spell/parser/parser` and `spell/util`.
  - The parser's helpers the writers share come through its barrel, `P`:
    - `P.ProgramWriter`
    - `P.JSWriter`
    - `P.Naming`
    - `P.forEachNode()`
    - `P.jsShapes` (`unwrapped()`, `isCoreCall()` ...)
- `spell` imports it, for its targets (`SP.TARGETS`).
- The parser folder's checks (its `package.json` scripts) cover both:
  - the TypeScript:  tsc, oxlint / oxfmt and vitest (its project, `py`)
  - then `core/`:  ruff and pytest
- Tests live in the parser folder's `tests/py/`, at the same paths as the code they test:
  - TypeScript, found by vitest (the parser folder's `vitest.config.ts`, its `py` project):
    - [PyWriter.ts](PyWriter.ts) => [PyWriter.test.ts](../../tests/py/PyWriter.test.ts)
  - `core/tests/` => `tests/py/core/tests/`
    - Its pytest finds them by its `testpaths`;  the parser folder's checks hand ruff their folder too.

## The writers (the TypeScript)

- `PY.PyWriter`:  the `py` target's writer, Python on asyncio
  - It writes `<Project>.spell.py`, into the project's build folder (`build/`, "Projects" in spell's PARSING.md).
  - It builds on `PY.PyBaseWriter` (on `P.ProgramWriter`), which writes all but waiting.
  - It writes Python as a person would:
    - PEP 8's names, e.g. `Card.RANKS`, and `class_` for a keyword
    - Python's own words:  `for number in range(1, 101):`, `x is None`, f-strings
    - type hints where spell knows the kind:  `rank: Rank`, its `Literal` above its class;  `event: KeyDownEvent`, each
      event a program handles declared at the end of the module (epic `rust` P1, P2)
  - It calls `spell_core`'s one object, `core`, only where Python has no word for what spell says.
  - A function that waits is `async def`, and every call of it awaits it.
    A program that never waits is plain Python (one target since P22).
    - A `create()` that waits too:  `spell_core` runs it to its end as the thing is made,
      its pauses not waiting (`core.run_at_once()`), as javascript's constructor runs it.
- `PY.ElementsWriter`:  a Python program's DRAWING half, in javascript, `<Project>.elements.spell.js` (P19)
  - For a page that draws the program running in Python, from the state Python sends.
  - It extends `P.JSWriter`:
    - the classes as they are
    - the program's top-level steps left out
    - each thing it keeps:  an `export let`, bound from the state (`adopt()`)
  - A top-level function, a call in a drawing's handler, and an event:
    each is a message to Python, by Python's names.
- `PY.pyText`:  Python's punctuation
  - blocks by their indent, text in quotes, docstrings
  - a long call broken one item a line, as Black (Python's usual formatter) does
- `PY.quartApp()`:  a program's web app, `<Project>.app.py` (P20)
  - Each compile rewrites it only while nobody has edited it (`PY.isUneditedApp()`).
  - It's committed beside the project's source.
  - Its program and page file are built into the project's build folder.
    - It names that folder inside the checkout's `build/`, and spell_quart finds the checkout's:

      ```py
      OUTPUTS = built_folder("spaces/@spell/examples/solitaire")
      ```

    - The name comes from `QuartAppSpec.outputs`:  the project index's `buildFolder`.
      - `.` for `spell run`'s temporary folder
    - No `../` in it (epic `people-and-orgs` J33).

## `spell_core` (`core/`)

- What spell compiled to Python imports, for what Python has no word of its own for.
  - Compiled code imports `core`, and the classes it extends:  `from spell_core import core, Thing, List, App, prop, h`.
  - That `core` has the JavaScript core's methods, snake_cased, e.g. `random_item_of()`.
  - Each module is the twin of one in `spell/parser/core`,
    e.g. `positions.py` of [positions.ts](../core/positions.ts).
  - `core` stands in for the running program's own core (`using_core()`):  one per web visitor.
  - Standard library only (decision Q33):  any standard module is fine;  a package from outside it, ask Owen first.
- A uv project, [pyproject.toml](core/pyproject.toml) with its `uv.lock`:  Python 3.12 or later.
  - Tests are pytest's, in the parser folder's `tests/py/core/tests/`;  lint and format, ruff.
  - The parser folder's checks run them, from its root (its `package.json` scripts):

    ```sh
    uv run --directory src/py/core pytest -q                                     # yarn test
    uv run --directory src/py/core ruff check . ../../../tests/py/core/tests    # yarn lint, and --fix in yarn lint:fix
    uv run --directory src/py/core ruff format . ../../../tests/py/core/tests   # yarn format
    ```

- It runs a compiled program with `python -m spell_core.run <program> --seed n`.
  - cli's [`runPython()`](../../../app/src/cli/commands/runCommand.ts) runs it through uv in this project.
  - Its flags:
    - `--no-pauses`:  a pause doesn't wait
    - `--page`:  print what it drew, as HTML
    - `--state`:  print its state as JSON by id
- `PageSession` (`spell_core.page`):  a program's side of a page that draws it.
  - `python -m spell_core.page <program> --seed n` talks to a page over stdin and stdout, a JSON line each.
- References (`spell_core.references`, P27):  a thing named in text.
  - e.g. `Card#queen-of-spades`, `Tableau#1`
  - The javascript core's words (view's `references.ts`), read the same way.
  - A page's message may name things so:  an event's `"target"`, a call's `"on"`.
    - The handler gets the thing as `event.target`, and as `event.card`.
    - `{"$id": ...}` still works.
  - A place counts the things a page was sent, in the order it was sent them:  the order its copies were made in.
  - The program's own core reads them too:  its places count the things that core made, in order.
    - Its methods, in `spell_core.reference_methods`:
      - `core.thing_for_reference()`
      - `thing_named()`
      - `thing_at_place()`
      - `reference_for()`
    - Not counted:  a plain `List`, a thing made inside a test, a helper's scratch result (made `core.quietly()`).
    - A name falls back to a thing the program keeps at its top level, as javascript's does.
- A program of views (P28) draws its own elements (`<solitaire-card>`) on the page:
  the page's javascript defines them.
  - Each view class still names its tag, `element_tag = "solitaire-card"`, as javascript's names it
    (epic `spanish` I5).
  - So the page Python prints (`--page`) draws each view as its element, as javascript's does:
    its own drawing inside, a viewable list's items' elements in its `<slot>` (`core.draw_thing()`).
- `play_page()` (`spell_core.playing`, P30):  a test plays a program the way its page does, by the page's messages.
  - `game.trigger("card-click", card=game.ref(card))`, `game.call("deal_the_cards")`:  each answered by its patch.
  - `game.thing(id)`, `game.named("stock")`:  what the page holds now, by id.
  - After each, the patches so far must add up to the whole state, else `PatchMismatchError`.
  - The contract's 300 clicks per game play through it
    ([patches_in_a_game.py](../../tests/py/core/tests/patches_in_a_game.py)).
- Five checks keep it in step with the javascript core ([core's AGENTS.md](../core/AGENTS.md)):
  - the core's method list ([core.declarations.json5](../core/core.declarations.json5)):
    `spell_core` has each name, or lists it, with why, in [not_ported_yet.json5](core/not_ported_yet.json5)
  - seeded random:  both read [seededRandom.expected.json5](../../tests/core/seededRandom.expected.json5)
  - state by id:  both write and read [stateById.expected.json5](../../tests/core/stateById.expected.json5)
  - saved by id:  both write and read [savedById.expected.json5](../../tests/core/savedById.expected.json5)
  - Those three are with the JavaScript core's tests (`tests/core/`).
  - the core contract (cli's [contract.test.ts](../../../app/tests/cli/contract.test.ts)):
    a compiled program prints exactly what javascript prints
- The terminal-drawing study (P15) is in `core/experiments/terminal`.
  - Its tests need their own uv group, `study`, so the runs above leave them out.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `PY` ~== `spell/parser/py`
