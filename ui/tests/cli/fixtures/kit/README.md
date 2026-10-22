# `fixtures/kit/`

A kit's root files, frozen:  what `spell pack create` reads in the throwaway kits of
[packCreate.test.ts](../../packCreate.test.ts) and [packBuild.test.ts](../../packBuild.test.ts).

- `package.json`:  its `resolutions` (Solid's pinned version, a pack's `__solid__`) and its `spell-*` workspaces
- `repos.json5`:  what marks a folder as a kit (`CLI.KIT_MARKER`)

A pack repo needs nothing else of the kit:  `pack create` writes every file of its own (its alias table, configs,
`.gitattributes`, `.epic/generators.json5`), and the kit's `spell-*` workspaces take it in at the next install.
Until epic `repo-split` P13 this was `fixtures/monorepo/`, a monorepo's root files `pack new` wired a pack into.
