# AGENTS.md

This file guides AI coding agents (Claude Code, Codex, and others) working in the top repo `spell`, `~/www/spell`,
and across its child repos.

**ALWAYS, before any code:  READ [WWOD](agents/wwod/WWOD.md), "What Would Owen Do?", the house style every repo shares.**
- Then the child repo's own `AGENTS.md` (`spell-ui/AGENTS.md` ...), and the package's.
- A rule lives in exactly ONE place:  this file holds what's ACROSS repos;  each repo's, what's about it.

## The top repo

- It holds only the glue:  the ONE install for every repo, the list of repos, the commands over them
  ([README.md](README.md) lists the files).
  - No package, no code anyone imports:  so no repo depends on it, and no repo loop.
- Every child repo is its own git repo, cloned inside it and git-ignored here.
  - Run git in the child repo you mean:  `git -C spell-ui status`.  Here, git sees only the glue.
- `yarn install` runs HERE, never in a child repo:  the child repos have no `yarn.lock`.
  - A child repo's `.yarnrc.yml` is a copy of this one's, without `yarnPath`:  the yarn release is here.
  - One copy of each package version (`nmHoistingLimits: none`), above all Solid:  pinned by `resolutions`.
  - Bump tool versions here:  `vite-plus` and every `catalog:` entry together, then the child repos' copies.

## Which repo holds what

The list, lowest first, with what each needs:  [repos.json5](repos.json5).

| Repo | Packages | Needs |
| --- | --- | --- |
| [spell-util](spell-util/AGENTS.md) | `util`, `toolchain` | nothing:  the bottom |
| [spell-server](spell-server/AGENTS.md) | `server`, `assembler` | spell-util |
| [spell-element](spell-element/AGENTS.md) | the repo IS `@spell-app/spell-element` | spell-util |
| [spell-lang](spell-lang/AGENTS.md) | `parser`, `markdown`, `core`, `py`, `spell` | spell-util |
| [spell-ui](spell-ui/AGENTS.md) | the repo IS `@spell-app/ui` | spell-element, spell-util;  spell-server for its site tools and tests |
| [spell-brand](spell-brand/AGENTS.md) | the repo IS `@spell-app/brand` | spell-ui, spell-element, spell-server, spell-util |
| [spell-epic](spell-epic/AGENTS.md) | the repo IS `@spell-app/epics` | spell-brand, spell-ui, spell-server, spell-element, spell-util |
| [spell-app](spell-app/AGENTS.md) | `app`, `spaces`, `lsp`, `cli`, `page-server` (and `vscode`, its own yarn project) | spell-lang, spell-brand, spell-ui, spell-server, spell-element, spell-util;  RUNS spell-epic by its page server's settings |

- Two kinds of repo:
  - several packages:  a folder each at the repo's root (`spell-lang/core/`, no `packages/`), named in its
    `package.json`'s `workspaces`;  tests in `tests/<package>/`
  - flat:  the repo IS its one package;  tests in `tests/`, mirroring the code
- Every arrow points DOWN:  a repo uses only the repos it `needs`, never one above it.
  - `yarn clone <repo>` clones exactly those, so a wrong import fails there.
  - spell-app runs spell-epic's route modules (its page server's settings), never imports it.
- Data, not code, beside them:  `spell.epics/` (the content repo) and `spell.spaces/` (your projects).

## Imports across repos

- INSIDE a repo, its `$/` aliases:  `$/parser`, `$/ui/components/...`.
  - Each repo's own table, `tsconfig.base.json` at its root, holds ONLY that repo's names (epic `repo-split` P8, J46).
  - It extends the toolchain's shared settings, `@spell-app/toolchain/tsconfig.base.json`;  each package's
    `tsconfig.json` extends the table.
- From ANOTHER repo, the package's npm name, an entry its `package.json` `exports` names:
  `@spell-app/ui/core`, `@spell-app/spell`, `@spell-app/server/page`.
  - Lint fails a `$/` alias into another repo (`spell/no-cross-repo-alias`) and a `../` path into another repo's
    package (`spell/no-cross-package-import`):  the toolchain's `lint.imports.ts`.
- How each tool reads another repo's package:
  - `tsc`:  its BUILT DECLARATIONS (epic `repo-split` I12).
    - Each `exports` entry has a `types` condition, `./dist-types/...d.ts`, built by the toolchain's `spell-types`
      (git-ignored), every `$/` in them rewritten as a relative path.
    - A repo's `yarn ts` runs `spell-types --below` first:  the lower repos' declarations, rebuilt where stale.
    - `yarn ts` here runs every repo's lowest first, so each finds the ones below it fresh.
  - Vite and Vitest:  its SOURCE (`default`), each file with its own repo's aliases (`resolve.tsconfigPaths`).
  - `tsx` and node:  its source, with the RUN-TIME ALIAS HOOK, `@spell-app/toolchain/aliases`:
    each `$/` import by the importing file's own repo's table.
    - Every `tsx` program that runs another repo's source loads it after `tsx`:
      `tsx --import @spell-app/toolchain/aliases <script>`, or `await import("@spell-app/toolchain/aliases")` after
      `register()`.
    - Without it:  `Cannot find package '$'`, on the first other repo's file.
  - The toolchain's [AGENTS.md](spell-util/toolchain/AGENTS.md) says how both work.
- A file outside its repo that a program needs at run time (spell's `src/`, the frozen test projects) is found by
  PACKAGE, through `node_modules`, never by a path into that repo.
- Paths in config and settings that name another repo's folder say so from the repo's root:
  `../spell-ui/docs` in spell-app's page server settings.

## Tests

- Tests only reach DOWN:
  - a higher repo's tests may use a lower repo's helpers (spell-app's and spell-brand's run Spell UI's setup,
    `@spell-app/ui/test/setup.ts`) and its test data (spell-app's spaces reads spell-lang's frozen test projects)
  - a lower repo's never read a higher one's:  a fixture of its own, or the test moves up
  - a test that needs a higher repo only to check against it (spell-lang's TypeScript check of compiled spell,
    against the editor's types) skips itself when that repo isn't installed
- `yarn test` here runs every repo's;  each repo's CI (epic `repo-split` P9) its own.

## WWOD and the logs

- WWOD (`agents/wwod/`) and the three logs (`agents/PAPERCUTS.md`, `SUSPECTED-BUGS.md`, `CODE-DEBT.md`):  ONE copy
  for every repo and worktree.
  - Every repo, and this one, has an `agents` link at its root (git-ignored), so the instructions name `agents/...`.
  - Today the copy is the content repo's, `spell.epics/agents/`.
  - The move (epic `repo-split` P9) puts it in spell-util's MAIN checkout, `spell-util/agents/`, and every link points
    there.
    - Except spell-epic's:  a root `agents/` there makes Claude Code load WWOD and the logs as plugin agents
      (epic `epic-engine`'s move check).
- Edit the logs and every content file at their REAL path, never through a link.

## Worktrees

- An epic's worktree in this layout is epic `repo-split` P9's:  a worktree of `spell` at
  `~/www/spell.worktrees/<epic>/`, with a worktree of each child repo it changes inside it, and one install.
  - Until then, an epic works in one repo's worktree, as before (spell-app's in `~/www/spell-app/spell-app.worktrees/`).
- The epic settings for a session working HERE:  [.epic/config.json5](.epic/config.json5).
