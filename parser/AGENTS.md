# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in this repo, `spell-lang`.

## This repo:  `spell-lang`

- `github.com/spell-app/spell-lang`, public;  cut from spell-app with its history (epic `repo-split` P8).
- It holds the language and what it stands on (each in "Folders", below):
  - `parser`:  the rule-based parser, and Rulex
  - `markdown`:  GitHub markdown on the parser
  - `core`:  the runtime compiled spell runs on
  - `py`:  Python's writers, and `spell_core`, a uv project
  - `spell`:  the language
  - `cli`:  the language's `spell` commands
- It may use:  the kit:  util's helpers (by package name, `spell-kit/util`) and the toolchain.
  - Every arrow points DOWN:  no repo below this one may import it.
- It lives inside the kit `spell-kit`, at `~/www/spell/spell-lang/`:
  - the kit holds the ONE install for every repo (no `yarn.lock` here)
  - [its AGENTS.md](../AGENTS.md) has the rules across repos
- ONE npm package, `spell-lang` (epic `repo-split` P11, Q36;  unscoped):
  its root [package.json](package.json), one version.
  - ALL its code is under ONE [src/](src/), a folder each (below).
  - A file's import name is the package's name, then its path under `src/`, no extension (epic `repo-split` P14, Q47):
    - `spell-lang/parser` (a folder's barrel, its `index.ts`), `spell-lang/parser/rules/Rule`, `spell-lang/core/model`
    - the SAME name inside this repo and from every other:  no `$/` aliases, no `#` imports, no `../`;
      same-folder peers stay `./Peer`
  - Its `exports` map every name to its file, each with spell-lang's own condition, `spell-lang-source`:
    - one wildcard entry, `"./*"`, for every file
    - an explicit entry for each folder barrel other repos import (`./parser`, `./parser/rulex`, `./spell/test` ...):
      `tsx` won't load a folder through the wildcard from another repo
    - TypeScript in this repo reads its own names as SOURCE (the condition, in [tsconfig.json](tsconfig.json)),
      and another repo's as their built declarations (`types`).
    - Vite, Vitest, `tsx` and oxlint read the source (`default`), adding the extension themselves.
  - The folders have NO `package.json` of their own:  their dependencies are the root's.
  - TypeScript sees two programs (its `"spellTypes"`):
    the kit's `spell-types` builds both into `dist-types/` (git-ignored), for the repos above.
    - [tsconfig.json](tsconfig.json):  the browser-safe code, `parser`, `markdown`, `core`, `py`'s writers and `spell`
    - [tsconfig.node.json](tsconfig.node.json), what needs node:
      the cli, spell's `node/` and `test/`, the parser's test helpers, core's declarations writer, the scripts and
      configs
  - ONE [vite.config.ts](vite.config.ts) (lint, format),
    and ONE [vitest.config.ts](vitest.config.ts), a project per folder.
- Another repo's package is imported by its npm name too (`spell-kit/util`, `spell-ui/...`), an entry of its
  `package.json` `exports`.
- `agents/` (WWOD and the three logs):  a link to the kit's `agents/` (git-ignored here).
  - Every `yarn install` at the kit makes it (its `postinstall`).

## Folders

Each folder links to its own `AGENTS.md`:  read it before working there.
- Import:  its barrel's name, the same from this repo and every other.

| Folder | Import | Namespace | What it is |
| --- | --- | --- | --- |
| [parser](src/parser/AGENTS.md) | `spell-lang/parser` | `P` | the generic rule-based parser;  Rulex is an opt-in side-effect import, `spell-lang/parser/rulex` |
| [markdown](src/markdown/AGENTS.md) | `spell-lang/markdown` | `MD` | GitHub-flavoured markdown on the parser, drawing `ui-*` markup |
| [core](src/core/AGENTS.md) | `spell-lang/core` | `SC` | the runtime compiled spell runs on |
| [py](src/py/AGENTS.md) | `spell-lang/py` | `PY` | Python's writers (its TypeScript) and `spell_core` (`core/`, a uv project) |
| [spell](src/spell/AGENTS.md) | `spell-lang/spell` | `SP` | the spell LANGUAGE on the parser, and `PARSING.md`;  its page for people is [README-spell.md](README-spell.md) |
| [cli](src/cli/AGENTS.md) | `spell-lang/cli` | | the language's `spell` commands (`commands.ts`), and their types |

- Outside `src/`, and never imported:
  - `tests/`
  - `scripts/`:  markdown's spec tools
  - `docs/`:  images, and spell's old notes in `docs/spell/`
  - the configs

## Tests

- Every folder's tests live in `tests/<folder>/`, at the same path as the code they test under `src/`
  (`tests/parser/rules/Rule.test.ts` tests `src/parser/rules/Rule.ts`), with their snapshots and test data.
  - They import by package name too:  `import { P } from "spell-lang/parser"`.
- [vitest.config.ts](vitest.config.ts) has a project per folder, over its tests.
- [The tests' tsconfig](tests/tsconfig.json) checks them with node's settings.
- NOT here:  the frozen test projects (`@spell/test`) and the tests that compile them whole (epic `spanish` P18).
  - They're spell-app's, beside its other `@spell` groups:  its `spaces/@spell/test/`, their tests in its `tests/spell/`
    ([README-spell](README-spell.md#the-frozen-test-projects)).
  - Spell's tests here write their projects inline (`parseSpellProject()`, `runSpell()`, from `spell-lang/spell/test`).
  - So spell-lang's own CI compiles no whole frozen project:  spell-app's does.
- `tests/py/core/tests/`:  `spell_core`'s pytest tests.

## Commands

At the repo's root, each over the whole repo:

```sh
yarn ts               # the declarations (the repos below, then this one's two programs), then the tests' tsc
yarn test             # Vitest, a project per folder, then py's pytest
yarn lint             # oxlint over src, tests and scripts, then py's ruff;  lint:fix fixes what it can
yarn format           # oxfmt, then ruff format;  format:check only checks
yarn review           # the finishing pass:  ts, lint:fix, format, test
```

- One folder's tests:  `yarn vp test run --project parser` (`parser`, `markdown`, `core`, `py`, `spell`, `cli`).
- A folder's own scripts are the root's, prefixed with its name:
  - `markdown:spec:update`
  - `core:gen:declarations`
  - `spell:gen:syntax`, `spell:test:rules` (and `:bless`), `spell:test:ui`, `spell:test:coverage`
  - The frozen test projects' `spell:test:fixtures` (and `:bless`) are spell-app's, at its root.
