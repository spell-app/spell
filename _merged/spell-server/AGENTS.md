# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in this repo, `spell-server`.

## This repo:  `spell-server`

- `github.com/spell-app/spell-server`, private;  cut from spell-app with its history (epic `repo-split` P8).
- It holds `server` (static folders, a router, live reload, ports, openers, a file lock, the generic page server) and `assembler` (link targets, in-memory formatting, bundles built on demand, data files).
- It may use:  spell-util:  the toolchain (every config), and util's json5 (the assembler's `DataFile`).
  - Every arrow points DOWN:  no repo below this one may import it.
- It lives inside the top repo `spell`, at `~/www/spell/spell-server/`:  the top holds the ONE install for every repo
  (no `yarn.lock` here), and [its AGENTS.md](../AGENTS.md) has the rules across repos.
- `$/` aliases are for inside this repo ([tsconfig.base.json](tsconfig.base.json));  another repo's package is imported
  by its npm name (`@spell-app/...`), an entry of its `package.json` `exports`.
- `agents/` (WWOD and the three logs):  a link to spell-util's main checkout, made by the top repo's setup (not yet).

## Packages

Each folder links to its own `AGENTS.md`:  read it before working there.

| Folder | Package | Alias | Namespace | What it is |
| --- | --- | --- | --- | --- |
| [server](server/AGENTS.md) | `@spell-app/server` | `$/server` | `SRV` | serving pages locally:  static folders, an Express-shaped router, live reload, ports, openers, a file lock, the generic page server, the site header |
| [assembler](assembler/AGENTS.md) | `@spell-app/assembler` | `$/assembler` | `AS` | assembling pages:  link targets (`Linker`), `formatHTML()`, bundles built on demand (`Bundle`), `DataFile`, `contentFolder` |

## Tests

- Every package's tests live in `tests/<package>/`, at the same path as the code they test
  (`tests/server/src/...` tests `server/src/...`), with their snapshots and test data.
- Each package's Vitest finds them (its config's `dir`);  a `tsconfig.json` in each tests folder gives them the
  package's own settings and the aliases.

## Commands

At the repo's root, each runs every package's script of the same name:

```sh
yarn ts    yarn test    yarn lint    yarn format    yarn review
```

In a package's folder, that package's own.
