# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in this repo, `spell-lang`.

## This repo:  `spell-lang`

- `github.com/spell-app/spell-lang`, private;  cut from spell-app with its history (epic `repo-split` P8).
- It holds `parser` (the rule-based parser, and Rulex), `markdown` (GitHub markdown on the parser), `core` (the runtime compiled spell runs on), `py` (Python's writers, and `spell_core`, a uv project) and `spell` (the language).
- It may use:  spell-util:  util's helpers (by package name, `@spell-app/util`) and the toolchain.
  - Every arrow points DOWN:  no repo below this one may import it.
- It lives inside the top repo `spell`, at `~/www/spell/spell-lang/`:  the top holds the ONE install for every repo
  (no `yarn.lock` here), and [its AGENTS.md](../AGENTS.md) has the rules across repos.
- `$/` aliases are for inside this repo ([tsconfig.base.json](tsconfig.base.json));  another repo's package is imported
  by its npm name (`@spell-app/...`), an entry of its `package.json` `exports`.
- `agents/` (WWOD and the three logs):  a link to spell-util's main checkout, made by the top repo's setup (not yet).

## Packages

Each folder links to its own `AGENTS.md`:  read it before working there.

| Folder | Package | Alias | Namespace | What it is |
| --- | --- | --- | --- | --- |
| [parser](parser/AGENTS.md) | `@spell-app/parser` | `$/parser` | `P` | the generic rule-based parser;  Rulex is an opt-in side-effect import, `$/parser/rulex` |
| [markdown](markdown/AGENTS.md) | `@spell-app/markdown` | `$/markdown` | `MD` | GitHub-flavoured markdown on the parser, drawing `ui-*` markup |
| [core](core/AGENTS.md) | `@spell-app/core` | `$/core` | `SC` | the runtime compiled spell runs on |
| [py](py/AGENTS.md) | `@spell-app/py` | `$/py` | `PY` | Python's writers (`ts/`) and `spell_core` (`core/`, a uv project) |
| [spell](spell/AGENTS.md) | `@spell-app/spell` | `$/spell` | `SP` | the spell LANGUAGE on the parser, `PARSING.md` and `readme.md` |

## Tests

- Every package's tests live in `tests/<package>/`, at the same path as the code they test
  (`tests/parser/src/...` tests `parser/src/...`), with their snapshots and test data.
- Each package's Vitest finds them (its config's `dir`);  a `tsconfig.json` in each tests folder gives them the
  package's own settings and the aliases.

## Commands

At the repo's root, each runs every package's script of the same name:

```sh
yarn ts    yarn test    yarn lint    yarn format    yarn review
```

In a package's folder, that package's own.
