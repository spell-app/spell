# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in this repo, `spell-lang`.

## This repo:  `spell-lang`

- `github.com/spell-app/spell-lang`, private;  cut from spell-app with its history (epic `repo-split` P8).
- It holds `parser` (the rule-based parser, and Rulex), `markdown` (GitHub markdown on the parser), `core` (the runtime compiled spell runs on), `py` (Python's writers, and `spell_core`, a uv project) and `spell` (the language).
- It may use:  the kit:  util's helpers (by package name, `spell-kit/util`) and the toolchain.
  - Every arrow points DOWN:  no repo below this one may import it.
- It lives inside the kit `spell-kit`, at `~/www/spell/spell-lang/`:  the kit holds the ONE install for every repo
  (no `yarn.lock` here), and [its AGENTS.md](../AGENTS.md) has the rules across repos.
- ONE npm package, `spell-lang` (epic `repo-split` P11, Q36;  unscoped):  its root [package.json](package.json), one
  version.
  - Its `exports` name every entry the five folders offer, each under its folder's name:
    `spell-lang/parser`, `spell-lang/core/model`, `spell-lang/spell/test` ...
  - The folders have NO `package.json` of their own:  their dependencies are the root's.
  - Each folder is still its own TypeScript program, with its own `tsconfig.json`, `vite.config.ts` and
    `vitest.config.ts`.
  - Its `"spellTypes"` lists the five:  their declarations are built folder by folder into ONE `dist-types/` at the
    repo's root (`dist-types/parser/src/index.d.ts` ...).
  - Its `"spellFolders"` lists each folder's checks, lowest first (below, "Commands").
- `$/` aliases are for inside this repo ([tsconfig.base.json](tsconfig.base.json));  another repo's package is imported
  by its npm name (`spell-kit/...`, `spell-ui/...`), an entry of its `package.json` `exports`.
- `agents/` (WWOD and the three logs):  a link to the kit's `agents/` (git-ignored here), made by the kit's every `yarn install` (its `postinstall`).

## Folders

Each folder links to its own `AGENTS.md`:  read it before working there.
- Entry:  how another repo imports it, an entry of `spell-lang`'s `exports`.

| Folder | Entry | Alias | Namespace | What it is |
| --- | --- | --- | --- | --- |
| [parser](parser/AGENTS.md) | `spell-lang/parser` | `$/parser` | `P` | the generic rule-based parser;  Rulex is an opt-in side-effect import, `$/parser/rulex` |
| [markdown](markdown/AGENTS.md) | `spell-lang/markdown` | `$/markdown` | `MD` | GitHub-flavoured markdown on the parser, drawing `ui-*` markup |
| [core](core/AGENTS.md) | `spell-lang/core` | `$/core` | `SC` | the runtime compiled spell runs on |
| [py](py/AGENTS.md) | `spell-lang/py` | `$/py` | `PY` | Python's writers (`ts/`) and `spell_core` (`core/`, a uv project) |
| [spell](spell/AGENTS.md) | `spell-lang/spell` | `$/spell` | `SP` | the spell LANGUAGE on the parser, `PARSING.md` and `readme.md` |

## Tests

- Every folder's tests live in `tests/<folder>/`, at the same path as the code they test
  (`tests/parser/src/...` tests `parser/src/...`), with their snapshots and test data.
- Each folder's Vitest finds them (its config's `dir`);  a `tsconfig.json` in each tests folder gives them the
  folder's own settings and the aliases.

## Commands

At the repo's root, each runs its check folder by folder, lowest first, through the kit's `spell-folders` (its
`"spellFolders"`;  epic `repo-split` P11):

```sh
yarn ts               # the declarations (the repos' below, then its own), then each folder's other tsc passes
yarn test             # each folder's Vitest (and py's pytest)
yarn lint             # each folder's oxlint (and py's ruff);  lint:fix fixes what it can
yarn format           # each folder's oxfmt (and ruff format);  format:check only checks
yarn review           # the finishing pass:  ts, lint:fix, format, test
```

- One folder's, or a few:  name them, `yarn spell-folders test parser core`.
- The folders have no scripts of their own:  `yarn test` in one runs the whole repo's (yarn finds the root's
  `package.json`).  A folder's tools directly, in it:  `yarn vp test run`, `yarn vp lint src`.
- A folder's own scripts are the root's, prefixed with its name:
  - `markdown:spec:update`
  - `core:gen:declarations`
  - `spell:gen:syntax`, `spell:test:fixtures` (and `:bless`), `spell:test:rules` (and `:bless`), `spell:test:ui`,
    `spell:test:coverage`
