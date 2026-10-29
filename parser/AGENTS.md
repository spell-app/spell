# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others)
working in `parser/`, the kit's parser folder (its yarn workspace is still named `spell-parser`).

## The parser folder

- A FOLDER of the kit `spell`, at `~/www/spell/parser/` (epic `repo-split` P20):
  once spell-parser (`github.com/spell-app/spell-parser`, public;  cut from spell-app with its history in epic
  `repo-split` P8), merged in with its history.
  - `git` here is the kit's repo, and CI is the kit's one workflow (the kit's AGENTS.md, "CI").
  - The rules across the kit and its folders:  [its AGENTS.md](../AGENTS.md).
- It holds the language and what it stands on (each in "Folders", below):
  - `parser`:  the rule-based parser, and Rulex
  - `markdown`:  GitHub markdown on the parser
  - `core`:  the runtime compiled spell runs on
  - `py`:  Python's writers, and `spell_core`, a uv project
  - `spell`:  the language
  - `spellx`:  spell's tag-shaped form, `.spellml` files
  - `cli`:  the language's `spell` commands
- It may use the kit's own `src/`:  util's helpers (by name, `spell/util`) and the toolchain;
  and, in `cli` only, the kit's command line (`spell/cli`) and its server's command runs (`spell/server`, loaded only
  by `spell translate --review`).
  - Every arrow points DOWN:  `parser/` is the lowest of the kit's big folders, so nothing in the kit's `src/` may
    import it (the lint's `spell/no-upward-import`).
- Its code is part of the kit's ONE npm package, `spell`;  `spell-parser` is a held npm name, not published again.
- Its [package.json](package.json) is a FOLDER MANIFEST, not a package of its own:
  - a private yarn workspace of the kit's ONE install:  `yarn install` at `~/www/spell`, never here,
    and no `yarn.lock` here
  - its scripts, its settings (`"spell": { "commands" }`, `"spellTypes"`, `"spellPublish"`) and its dependencies;
    no `exports`
- ALL its code is under ONE [src/](src/), a folder each (below).
  - A file's import name is `spell/parser/`, then its path under `src/`, no extension
    (epic `repo-split` P14, Q47;  P20):
    - `spell/parser/parser` (a folder's barrel, its `index.ts`), `spell/parser/parser/rules/Rule`,
      `spell/parser/core/model`
    - the SAME name inside this folder and from every other:  no `$/` aliases, no `#` imports, no `../`;
      same-folder peers stay `./Peer`
  - The KIT's `package.json` `exports` map every name to its file (the kit's AGENTS.md, "Imports across repos"):
    - one wildcard entry, `./parser/*`, for every file
    - an explicit entry for each folder barrel other folders import (`./parser/parser`, `./parser/parser/rulex`,
      `./parser/spell/test` ...):  `tsx` won't load a folder through the wildcard
    - TypeScript here reads every folder's names as SOURCE (the `spell-source` condition, in
      [tsconfig.json](tsconfig.json)).
    - Vite, Vitest, `tsx` and oxlint read the source (`default`), adding the extension themselves.
  - The sub-folders have NO `package.json` of their own:  their dependencies are the folder manifest's.
  - TypeScript sees two programs (its `"spellTypes"`):
    the kit's `spell-types` builds both into `dist-types/` (git-ignored), for the app's node program,
    which reads the other folders' declarations (the kit's AGENTS.md, "Imports across repos").
    - [tsconfig.json](tsconfig.json):  the browser-safe code, `parser`, `markdown`, `core`, `py`'s writers, `spell`
      and `spellx`
    - [tsconfig.node.json](tsconfig.node.json), what needs node:
      the cli, spell's `node/` and `test/`, the parser's test helpers, core's declarations writer, the scripts and
      configs
  - ONE [vite.config.ts](vite.config.ts) (lint, format),
    and ONE [vitest.config.ts](vitest.config.ts), a project per folder.
- Another folder's file is imported by its name too (`spell/util`, `spell/ui/...`), an entry of the kit's
  `package.json` `exports`.
- `agents/` (WWOD and the three logs):  a link to the kit's `agents/` (git-ignored here).
  - Every `yarn install` at the kit makes it (its `postinstall`).

## Folders

Each folder links to its own `AGENTS.md`:  read it before working there.
- Import:  its barrel's name, the same from this folder and every other.

| Folder | Import | Namespace | What it is |
| --- | --- | --- | --- |
| [parser](src/parser/AGENTS.md) | `spell/parser/parser` | `P` | the generic rule-based parser;  Rulex is an opt-in side-effect import, `spell/parser/parser/rulex` |
| [markdown](src/markdown/AGENTS.md) | `spell/parser/markdown` | `MD` | GitHub-flavoured markdown on the parser, drawing `ui-*` markup |
| [core](src/core/AGENTS.md) | `spell/parser/core` | `SC` | the runtime compiled spell runs on |
| [py](src/py/AGENTS.md) | `spell/parser/py` | `PY` | Python's writers (its TypeScript) and `spell_core` (`core/`, a uv project) |
| [spell](src/spell/AGENTS.md) | `spell/parser/spell` | `SP` | the spell LANGUAGE on the parser, and `PARSING.md`;  its page for people is [README-spell.md](README-spell.md) |
| [spellx](src/spellx/AGENTS.md) | `spell/parser/spellx` | `SX` | spellx, spell's tag-shaped form:  the chunk tree a `.spellml` file reads into (spell's own parser reads and compiles it);  its page for people is [README-spellx.md](README-spellx.md) |
| [cli](src/cli/AGENTS.md) | `spell/parser/cli` | | the language's `spell` commands (`commands.ts`), and their types |

- Outside `src/`, and never imported:
  - `tests/`
  - `scripts/`:  markdown's spec tools
  - `docs/`:  images, and spell's old notes in `docs/spell/`
  - the configs

## Tests

- Every folder's tests live in `tests/<folder>/`, at the same path as the code they test under `src/`
  (`tests/parser/rules/Rule.test.ts` tests `src/parser/rules/Rule.ts`), with their snapshots and test data.
  - They import by package name too:  `import { P } from "spell/parser/parser"`.
- [vitest.config.ts](vitest.config.ts) has a project per folder, over its tests.
- [The tests' tsconfig](tests/tsconfig.json) checks them with node's settings.
- NOT here:  the frozen test projects (`@spell/test`) and the tests that compile them whole (epic `spanish` P18).
  - They're the app folder's, beside its other `@spell` groups:
    its `spaces/@spell/test/`, their tests in its `tests/spell/`
    ([README-spell](README-spell.md#the-frozen-test-projects)).
  - Spell's tests here write their projects inline (`parseSpellProject()`, `runSpell()`, from `spell/parser/spell/test`).
  - So the parser folder's own tests compile no whole frozen project:  the app folder's do.
- `tests/py/core/tests/`:  `spell_core`'s pytest tests.

## Commands

At the folder's root, each over the whole folder (the kit's `yarn ts`, `yarn test` ... at its root run them too):

```sh
yarn ts               # its two programs' declarations (spell-types:  their type check too), then the tests' tsc
yarn test             # Vitest, a project per folder, then py's pytest
yarn lint             # oxlint over src, tests and scripts, then py's ruff;  lint:fix fixes what it can
yarn format           # oxfmt, then ruff format;  format:check only checks
yarn review           # the finishing pass:  ts, lint:fix, format, test
```

- One folder's tests:  `yarn vp test run --project parser` (`parser`, `markdown`, `core`, `py`, `spell`, `spellx`,
  `cli`).
- A sub-folder's own scripts are the folder manifest's, prefixed with its name:
  - `markdown:spec:update`
  - `core:gen:declarations`, `core:gen:templates` (spell's built-in templates written in spell, compiled into the core)
  - `spell:gen:syntax`, `spell:test:rules` (and `:bless`), `spell:test:ui`, `spell:test:coverage`
  - The frozen test projects' `spell:test:fixtures` (and `:bless`) are the app folder's, at its root:
    `spell content check [--bless]` runs them.
