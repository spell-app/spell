# `fixtures/kit/`

A kit's root files and its folders' manifests, frozen:  what `spell pack create` reads in the throwaway kits of
[packCreate.test.ts](../../packCreate.test.ts) and [packBuild.test.ts](../../packBuild.test.ts).

- `package.json`:  its `resolutions` (Solid's pinned version, a pack's `__solid__`) and its `workspaces`, the kit's
  folders lowest first, as the real kit's since epic `repo-split` P20
- `parser/`, `ui/`, `epic/`, `app/`:  each folder's manifest, still named `spell-parser` ...;  `epic/`'s holds the
  kit's own pack, `epics`
- `repos.json5`:  what marks a folder as a kit (`CLI.KIT_MARKER`)

A pack repo needs nothing else of the kit:  `pack create` writes every file of its own (its configs,
`.gitattributes`, `.epic/generators.json5`), and adds `spell-<name>` to the kit's `workspaces`, so the next install
takes it in.
Until epic `repo-split` P13 this was `fixtures/monorepo/`, a monorepo's root files `pack new` wired a pack into.
