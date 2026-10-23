# Late changes from repo-split:  read before you write

The repo-split session reported, at 21:40 on Oct 21, what its LAST step (P14) still changes.
The repo-split worktree (your fact base) shows some of it only until that step lands.
THE PAGES DESCRIBE THE STATE AFTER IT:  where this file and the fact base disagree, this file is right.

## 1. Gone:  say nothing of them

These no longer exist.
Do not describe them, and do not explain what replaced them (history).
`p14-check` flags the words.

- the toolchain's run-time alias hook (`spell/toolchain/aliases`, and every `tsx --import` of it)
- the `$/` rewrite in `spell-types` (the declarations are built from files that already import by package name)
- the `spell-folders` bin, and the `"spellFolders"` list in a `package.json`
- the alias lint rules (`spell/no-cross-repo-alias`, and perhaps `spell/no-cross-package-import`:  name neither)
- `packModuleKey()`

So a repo's checks are what the repo-split worktree's `package.json` and `AGENTS.md` show for the converted repos:
- one TypeScript program for browser-safe code, one for node code, the tests' own;  one Vitest config of projects
  (all tests:  `yarn vp test run`;  one folder:  `yarn vp test run --project server`);  one lint config
- the yarn scripts (`yarn kit:ts`, `kit:test`, `kit:lint`, `kit:format`, `kit:review`, and `yarn ts|test|lint|review`
  over every repo) may change SHAPE before P14 lands:  name them, say what each does in a clause, and show NO long
  block of their output
- tests mirror `src/`:  `tests/server/Router.test.ts` tests `src/server/Router.ts`

## 2. Pack module keys are npm names

A component pack's module key (what the page's packs share one copy of a module by) is the module's npm name now:
- `$/ui/core` becomes `spell-ui/core`
- `$/spell-element` becomes `spell/element`
- every pack and bundle is rebuilt

Write the npm names;  never `$/...`.

## 3. The epic command's verbs were renamed

The old names stop working;  the new ones are in `reference/epic-help-tree.txt` (generated from the repo-split
worktree, so it is the truth).
The ones that matter:

| Old | New |
| --- | --- |
| `epic new`, and ask / choices / saga `new` | `epic create` (and `create` under ask / choices / saga) |
| `epic check` | `epic lint` |
| `epic inbox listen`, `unlisten` | `epic inbox watch`, `ignore` |
| `epic window stay-check` | `epic window should-stay` |
| `epic stock` | `epic status [--json]` |
| `epic status <epic>#<id>` (Claude's card on an item) | `epic update <epic>#<id> underway`, `done` or `noted` |
| (new) | `epic summarize <epic>#<id> --file x.html` |
| `add-request`, `overnight`, `plan-doc` | deleted |

Also deleted:  the converter, the old migrations, `epic shared rename`, ui-section's old names.
The epic program lives in `spell-epic/src/cli/`.

## 4. After the merge

`spell` is installed from the kit's `bin/spell.mjs`, so `yarn cli:install` needs a rerun:  "Setting it up" says
`yarn cli:install`, and a person who installed `spell` earlier runs it again.

## 5. What is still moving

The repo-split session is paused partway through P14's last step (it lands by the end of 2026-10-22).
Already true in its worktree:  the alias hook and `spell-folders` are gone, and `packModuleKey` is out of the code.
Not settled:  the kit's `kit:*` scripts.
So write those from what you verify in the worktree's `package.json`, and until it lands prefer naming a thing to
quoting its output, and a clause to a table of flags that might change.

## 6. P14's last step is DONE (reported 22:36, in the repo-split worktree, uncommitted)

This is the final shape;  where it disagrees with sections 1-5 or with the fact base, THIS is right.
The fact base (`/Users/owen/www/spell.worktrees/repo-split`) now has it all:  re-read a file there before you quote it.

**Kit, `src/`:**
- deleted:  `src/toolchain/aliases.ts`, `aliasTable.ts`, `folders.ts`
- added:  `src/toolchain/sourceNames.ts`, import name `spell/toolchain/sourceNames`:  `sourceNames()`, `sourceFileFor()`,
  `packageRootFor()`, `resolvedFile()`;  the esbuild resolver every build shares
- `src/element-tools/packModules.ts` keeps only `PACK_MODULES`;  `packModuleKey()` is gone

**Kit bins, exports, scripts:**
- bins left:  `spell`, `spell-pack`, `spell-types`.  `bin/spell-folders.ts` is deleted.  The `./toolchain/aliases` export is gone, and `CLI.ALIASES`
- the scripts, final:
  - `kit:ts` = `node bin/spell-types.ts && tsc -p tests`
  - `kit:test` = `vp test run`
  - `kit:lint` / `kit:lint:fix` = `vp lint` over `src bin scripts tools tests` and the configs
  - `kit:format` = `vp fmt .`;  `kit:format:check` = `vp fmt --check .`
  - `kit:review` = ts, lint:fix, format, test
  - over every repo:  `yarn ts | test | lint | review` (`tools/repos.ts`)
- `package.json`:  no repo has `"spellFolders"`.  `"spellTypes"` lists tsconfig files:  the kit, spell-parser, spell-ui (and the internal repo) have
  `["tsconfig.json", "tsconfig.node.json"]`;  spell-epic and spell-app have none.  `spell-types` builds only packages that have `spellTypes`,
  with no `$/` rewrite.

**Lint:**  `spell/no-cross-repo-alias` and `spell/no-cross-package-import` are replaced by ONE rule, `spell/no-parent-import`:  it fails a `../`
import that lands in a package's `src/`, and its message names the package-name import to write.  `PATTERN_FOLDERS` is `{ ui }` for the public
repos;  `patternLint(names)` takes only names.

**Pack keys:**  `spell/element`, `spell-ui/core`, `spell-ui/forms`, and `spell-ui/components/ui-<x>` for families.
`PACK_FORMAT` is `"spell-pack 2"`.  Generated banners say `spell pack build <name>`.

**`Symbol.for` keys:**  `spell-ui:runtime` (was `@spell-app/ui:runtime`), `spell:cells`, `spell-parser:element-tag`, `spell-parser:element-class`,
`spell-ui:docs-example-sources`, `spell-app:spell-elements`.

**spell-epic:**
- deleted:  `src/convert/`, `tests/convert/`, `src/tools/relocate.js`, `plan-rename.js`, `to-ui-section.js`, `to-answer-elements.js`, and most migration
  steps (`engine-links` and `components-not-markup` are kept);  the `./convert` export
- commands removed:  `epic convert`, `epic shared rename`, `epic shared repair`
- `packageDir.ts` keeps only `packageDir()` and `tsxImports()`;  `Git.nearestCheckout({ marker?, from? })` has a new shape

**spell-ui:**
- `<ui-section>` / `<ui-panel>` old words are gone:  `header` / `subhead` / `info` are now `label` / `hint` / `description`;
  `ui-open` / `ui-close` / `ui-load` are now `ui-opening` / `ui-closing` / `ui-loaded`
- pack templates:  `repo/src/components/index.ts.template`, `tests/pack.test.ts.template`;  `tsconfig.base.json.template` is deleted
- `spell pack create` / `add` write the one-`src/` layout

**spell-app:**  `MOVED_FOLDERS` / `movedFolderPath()` are deleted.  The extension runs only `src/lsp/server.ts` (no fallback).
`spell speedtest --against` needs a post-P14 spell-parser ref.  No script changes.

**spell-parser:**  no moves, no script changes.

**Stale lines the repo-split session spotted** (line numbers are approximate, and of an unknown version of each page:  grep for the content):
- kit:  README-toolchain (the alias, `spell-folders` and pack-key material, four places), README-cli (two places:  the epic verbs, `spell-folders`),
  README-element (the pack-key material, two places), README-vscode (the language-server fallback)
- spell-epic:  README-cli (removed verbs), README-adopting (`packageDir`), README-pages (the converter)
- spell-ui:  README-site (`<ui-section>`'s `header` is now `label`)
- spell-app:  README-page-server (a numbered item about moved folders;  the routes excerpt must say `src/page-server/` and `src/spaces/`)
- spell-parser:  README front page (spell-app's `app/` is `src/app/`;  the CLI's `ui` is `src/cli/ui/`)
