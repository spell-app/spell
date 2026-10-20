# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in this repo, `spell-util`.

## This repo:  `spell-util`

- `github.com/spell-app/spell-util`, private;  cut from spell-app with its history (epic `repo-split` P8).
- It holds `util` (the generic and reactive helpers, and `util/node/json5`) and `toolchain` (what every repo's configs share).
- It may use:  nothing:  it's the bottom repo.  `util` uses `toolchain` inside it, by package name.
  - Every arrow points DOWN:  no repo below this one may import it.
- It lives inside the top repo `spell`, at `~/www/spell/spell-util/`:  the top holds the ONE install for every repo
  (no `yarn.lock` here), and [its AGENTS.md](../AGENTS.md) has the rules across repos.
- `$/` aliases are for inside this repo ([tsconfig.base.json](tsconfig.base.json));  another repo's package is imported
  by its npm name (`@spell-app/...`), an entry of its `package.json` `exports`.
- `agents/` (WWOD and the three logs):  spell-util holds the real folder, which comes later (not yet).

## Packages

Each folder links to its own `AGENTS.md`:  read it before working there.

| Folder | Package | Alias | Namespace | What it is |
| --- | --- | --- | --- | --- |
| [util](util/AGENTS.md) | `@spell-app/util` | `$/util` |  | helpers `ui` and spell share:  small generic ones (`@proto` ...), spell's own in `src/spell/`, and `node/json5` (node only) |
| [toolchain](toolchain/AGENTS.md) | `@spell-app/toolchain` |  |  | the lint and format settings and their rules, the decorator pre-pass, the version stamp, the base tsconfig and the global types |

## Tests

- Every package's tests live in `tests/<package>/`, at the same path as the code they test
  (`tests/util/src/...` tests `util/src/...`), with their snapshots and test data.
- Each package's Vitest finds them (its config's `dir`);  a `tsconfig.json` in each tests folder gives them the
  package's own settings and the aliases.

## Commands

At the repo's root, each runs every package's script of the same name:

```sh
yarn ts    yarn test    yarn lint    yarn format    yarn review
```

In a package's folder, that package's own.
