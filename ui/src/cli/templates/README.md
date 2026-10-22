# `templates/`

The files Spell UI's `spell` commands write new files from.
Today, only component packs use them:

- `pack/repo/` -- a new pack, a repo of its own inside the kit, `spell-<name>/`:  `spell pack create <name> [--prefix x-]`
  - laid out as spell-brand is:  `package.json` with its `"spellPack"`, its own alias table, `src/`, `components/`
  - `pack/tests/` -- its first test, into the new repo's `tests/`
- `pack/element/` -- one element in a pack, `components/<tag>/`:  `spell pack add <pack> <tag>`
  - `pack/element-tests/` -- its test, into the pack repo's `tests/components/<tag>/`

The code that reads them:  `createPack()` and `addElement()`, in [packCreate.ts](../src/packCreate.ts).

## How a template is filled

Each file is copied to the same path in the new folder, with three changes:

- `.template` comes off the end:  `src/index.ts.template` => `src/index.ts`.
- Each `__token__` is filled in, in the file's text AND its name:
  - `__pack__` -- the pack's name, `cards` (its repo is `spell-cards`)
  - `__packCamel__` -- the same in camelCase, `my-pack` => `myPack`
  - `__prefix__` -- its tag prefix, `card-`
  - `__solid__` -- the Solid version pinned in the kit's `package.json` `resolutions`
  - element files only:
    - `__tag__` -- the tag, `epic-page`
    - `__Class__` -- its class name, `EpicPage`
    - `__vocab__` -- the start of its vocabulary's name, `epicPage` (as in `epicPageVocabulary`)
    - `__noun__` -- the tag less the prefix, `page`
    - `__nounCamel__` -- the same in camelCase
  - Any other `__word__` is left as it is.
  - The list lives in `PackTokens` ([packCreate.ts](../src/packCreate.ts)):  a new token goes there first.
- A dot goes in front of `gitignore`, `gitattributes` and the `epic/` folder:
  `.gitignore`, `.gitattributes`, `.epic/generators.json5`.
  Files named that way here would be read by git and the epic tools as this folder's own.

So for `spell pack add epics epic-page`, this line of `pack/element/__Class__.en.ts.template`:

```ts
export const __vocab__Vocabulary = {
  tag: "__tag__",
```

is written to the pack's `components/epic-page/EpicPage.en.ts` (spell-epic's `src/components/`) as:

```ts
export const epicPageVocabulary = {
  tag: "epic-page",
```

Three files are written another way:

- `pack/repo/package.json.template` is MERGED into the pack's `package.json`, when there is one:
  - the keys it lacks are added (inside `scripts`, `devDependencies` and `spellPack` too, one by one)
  - its own values are kept
- `pack/repo/components/index.ts.template` starts the pack's element list.
  `pack add` then adds one `export * from "./<tag>"` line to it per element.
- `.yarnrc.yml` isn't a template:  it's the kit's own, without `yarnPath`, as every child repo's is.

A file that's already there is NEVER overwritten:  it's skipped, and the command says so.
So running a command twice changes nothing.

## Why `.template`

Without it, these files would look like real code, and none of it works with `__token__`s in them:
- `tsc` would type-check `__Class__.tsx`
- lint and format would read it
- vitest would run `__Class__.test.tsx`

With the suffix, no tool reads them;  only `packCreate.ts` does.

## Adding or changing a template

- Add a file:  put it where it goes in the new folder,
  with `.template` on the end, and `__token__`s where the names go.
  - `packCreate.ts` copies every `*.template` file it finds:  no list to update.
- Change one:  just edit it.
  Packs and elements made AFTER get the change;  existing ones keep their files.
- Then run Spell UI's cli tests, `yarn vp test run --project ssr tests/cli`, in spell-ui.
  - [packCreate.test.ts](../../../tests/cli/packCreate.test.ts) writes a pack and an element from these templates
    into a temp kit, and checks every token was filled in.
