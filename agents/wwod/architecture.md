# WWOD spoke -- Architecture & module layout

Where code lives:  folders, files, barrels, namespaces, singletons, promotion to `util`.
Read with `agents/wwod/WWOD.md` (the hub).
From:  original WWOD §8, root `AGENTS.md` "Types / Exports" (files, barrels, namespaces).

## 8. Architecture & module layout

- **Feature-cohesive folders beat layer-cohesive:**
  - A feature gets its own folder -- a package, or a folder under a package's `src/` -- with its own barrel, its
    tests beside the files they test, and a `README.md` where a reader needs one (every package has one, WWOD §6).
  - Why:  a change to one feature stays in one folder, rather than touching a `models/`, a `controllers/` and a
    `views/`.

- **One exported class per file:**
  - One exported class per file, file named for the class.  e.g. `Keyword.ts`, `Symbol.ts`
    rather than both living in `Literal.ts`.
  - A family of helper functions shares ONE capability-named file:  `packages/server/src/ports.ts` (`isFree` +
    `freePort` + `listenPreferred`), `packages/server/src/safePath.ts` (`resolveInside` + `isInside`).
  - Avoid single-concept micro-modules:  a one-function file, a one-constant file.
    - The one exception to "one exported class per file":  a custom element's small DOM element class (a few
      members, `DOMBrandColorElement`) lives in its component's file, above the component (Owen, epic
      `wwod-spell-ui` P15:  "try to avoid one-liner files").
  - Separate a file's functional groups with `////////////////` group headers (WWOD §6).
  - Its test:  SEE:  WWOD §20 › "Tests sit beside their module".
  - NOT:  "fewer, bigger files" holding several classes -- a class is found by its file name, and a barrel lists
    its leaf files base-classes-first.

- **File naming:**
  - PascalCase when the module IS one class and nothing else:  `Router.ts`, `FileLock.ts`, `Logger.ts`.
  - camelCase capability name when it holds a family:  `ports.ts`, `safePath.ts`, `bodies.ts`.
  - The folder's types:  `<folder>.types.ts` (below).
  - Server code:  `.server.ts` -- SEE:  WWOD §10 › "Server code stays out of the browser bundle".
  - A custom element's family:  the FOLDER takes the main tag (`ui-button/`), every FILE in it its component's
    class name (`UIButton.tsx`, `UIButton.types.ts`, `UIButton.css`;  its vocabulary named for its language too,
    `UIButton.en.ts`), as any class file is named for its class.  SEE:  `packages/ui/AGENTS.md` "Overview".
  - A runnable script in a `scripts/` or `tools/` folder is named for its command, kebab-case:
    `packages/ui/scripts/gen-styles.ts`, `spell-epic/src/tools/check-spell.js`.
  - NEVER any other kebab-case name.  Existing ones (`packages/spell/src/node/disk-fetch.ts`, `file-utils.ts` ...)
    are `agents/CODE-DEBT.md` entries.

- **A folder's shape:  types file, class files, barrel.**  Consolidate to that shape before you ship it, not in a
  later pass -- a complex feature too, split into types and logic:
  - `<folder>.types.ts` -- its types and everything that goes with them (below, "`<folder>.types.ts`").
  - one file per class, named for the class -- the logic, DOM entry points included.
  - one pure-helpers file if the folder has any, capability-named.
  - `index.ts` (the barrel), and a `README.md` where a reader needs one.
  - sub-folders for what isn't code:  fixtures, assets ...
  - Callers reach all of it through the package's namespace (`P.X`, WWOD §4).
  - e.g. `packages/server/src/page/`:  `page.types.ts`, `PageServer.ts`, `PageEditor.ts`, `RunningEpics.ts`,
    `index.ts`, plus `cli.ts`, the `yarn server` entry point the barrel leaves out.

- **Class first, its types and helpers below:**
  - Types and helper functions appear AFTER the durable JS structure that uses them, e.g. `ScopeProps` goes
    directly below `class Scope`.
  - At module level:  constants go BEFORE the function that uses them (or come from `<folder>.types.ts`);  helper
    functions go AFTER it.
  - In a class:  all its helpers and constants go AFTER the main methods (WWOD §12).

- **`<folder>.types.ts`:**
  - Centralize shared types in a single `<folder>.types.ts` per folder, e.g. `parser.types.ts`, `rules.types.ts`.
  - It holds every type, the type guards, the shared constants, the small error classes (WWOD §5) and the pure
    helpers over them.
  - NEVER bare `types.ts` or `constants.ts`.
    - The ONE exception:  a `constants.ts` at a package's root, for its string sentinels (WWOD §9 › "String
      sentinels over booleans for modes").
  - Group with `// ## Group Name` headers -- SEE:  WWOD §6 › "Group headers".
  - MUST be runtime-light:  `import type` only, apart from the package's utilities (`$/util`, `$/ui/util`).
    - Why:  a types file that imports VALUES from its folder's class files is a circular import.
  - Exception:  props types live in the defining file -- WWOD §9 › "Props types live with their class".

- **The folder's import graph is a DAG, with `<folder>.types.ts` at the BOTTOM:**
  - It imports no class module of its folder, no DOM, no Solid -- ideally no VALUES at all, so its imports erase
    completely.
  - Everything above it takes it through the package's ONE namespace -- SEE:  WWOD §4 › "ONE namespace per
    sub-system" (and "Types-only leaf import as `PT`" where the barrel can't load).
  - Write the file's position into its module docstring (WWOD §6), and keep the arrows one-way:
    `page.types` <- `PageServer` <- `cli`, and `PageEditor` / `RunningEpics` <- `PageServer`.
  - Two modules that both need a helper and can't agree who owns it:  the helper is generic -- promote it
    (below, "Promotion path").

- **Hosts are thin adapters:**
  - Our hosts:  the editor (`packages/app/src/editor.ts`), the runner (`packages/app/src/runner/`), the web
    components `<spell-app>` / `<spell-editor>` (`SpellAppElement.tsx`, `SpellEditorElement.tsx`).
  - A host's constructor and public entry methods are each under 10 lines, and delegate to shared code.
  - Code more than one host uses lives in a capability-named file of free exported functions -- NOT private methods
    on a host class.  `packages/app/src/runner/runCompiled.ts` (`runCompiled()`, `unmountApp()`) serves
    `SpellAppRunner`, `VSCodeRunner` and `<spell-app>`.
  - A class instead once that code has shared state.

- **Gather related options in one place:**
  - When many routines take the same options, one private `get<X>Options()` validates them and returns the bag,
    callbacks for the caller's model included.

- **Singleton services are classes, stateless ones too:**
  - A service with no per-instance state is `static` members on the class that owns its domain, with a docstring
    saying why static (WWOD §12).
  - No owning class:  a small class of its own, all `static`.  `ExampleSource`
    (`packages/ui/src/docs-components/ui-docs-example/ExampleSource.ts`):  `ExampleSource.snapshot()`,
    `ExampleSource.of(host)`.
  - A registry, signal bus or menu module with no per-instance state folds into its owner:  callers read
    better (`UI.icons.register()`, not a separate `iconRegistry.add()`), and the folder's import graph loses edges.
  - `ui`'s runtime services are classes on ONE per-page instance (`UI.keyboard` ...) -- SEE:  `packages/ui/AGENTS.md`
    "Overview" and "UI rules".
  - NOT:  an object literal when no class owns the domain (`assert = { string, number, boolean }` in `$/util`:
    `agents/CODE-DEBT.md`) -- one shape for every service, and a class gains state, `@proto static` defaults
    (WWOD §12 › "@proto static defaults") or a subclass without its callers changing.

- **Barrels:**
  - Create barrel `index.ts` for each folder:
    - header comment block explaining the barrel, with `NOTE:` for anything deliberately left out or namespaced
    - `export * from "./<folder>.types"` first, then leaf files base-classes-first
    - sub-folder barrels are flattened in:  `export * from "./rules"`
  - Barrels MUST NOT pull in optional sub-systems:  leave them OUT of the barrel, opted into by path --
    `$/server/page/...`, `$/server/test/...` (SEE:  `packages/server/AGENTS.md` "NOT in the barrel, opt-in by
    path").
    - Only a sub-system that must register itself is a side-effect import:  `import "$/parser/rulex"` registers on
      `Parser.rulexParser`.
  - A barrel loads in EVERY environment its package targets (browser, node ...):
    - node-only and side-effect files stay OUT of it, imported by path, e.g. `$/spell/node/...`
    - nothing it loads touches an environment global (`window`, `document`, `process` ...) at module-evaluation
      time
    - each package's `AGENTS.md` lists its own left-out files
  - When refactoring imports and exports, if you encounter circular import problems create smoke tests
    (`barrel.test.ts`) ensuring no circular import problems in TS/rollup/browser for various entry points.

- **ONE self-namespace per package:**
  - Each sub-system has ONE self-namespace, exported from its top barrel:  `export * as P from "."`
    - each package's `AGENTS.md` lists its own, e.g. `P` ~== `$/parser`
    - Exception:  namespace a file whose names would collide when flattened:
      `export * as render from "./renderAST"` + `export * as stringify from "./stringifyAST"`,
      which deliberately export the same names with different return types.
      - A code smell inside one package:  rename so the names don't collide instead, wherever you can.
    - Prefer a disambiguating affix over a namespace when the names allow it -- token and AST classes
      are `WordToken` / `ASTLiteral` etc. and flatten straight into `$/parser`.
    - NOTE:  `export *` through a circular barrel is riskier than a named re-export -- it must read the
      leaf's key list EAGERLY, so a mid-body leaf contributes nothing.  See `parser`'s `src/barrel.test.ts`.
  - Consumers:  SEE:  WWOD §4 › "ONE namespace per sub-system".
  - A package's deliberate extra namespaces are listed in its own `AGENTS.md` "Types / Exports", with the reason.
  - NOT:  a second namespace for a sub-folder or feature (`export * as R from "./rules"`, `R.Rule` for `parser`'s
    rules) -- flatten it into the parent;  ONE per package.

- **Promotion path:**  a helper generic enough to lose its feature vocabulary moves up, and is RENAMED on the way.
  - Where to:  the package's own util (`$/ui/util` ...) while one package uses it;  `$/util` ONLY once 2+ packages
    do.  SEE:  `packages/util/AGENTS.md` "Overview" for what may land there (generic files vs `src/spell/`;  what
    lands in `$/util` lands in `ui`'s bundle).
  - Strip the feature word from the file, the exports AND every doc comment.
  - Barrel it through its new home's barrel, e.g. `packages/util/src/index.ts`.
  - It MUST NOT import back down into the feature:  extraction NEVER makes a util module import from a feature
    layer.  Swap feature types for general ones, and where the only shared home would invert the dependency, a
    small private copy is CORRECT.
  - A promoted type may be RE-EXPORTED from the feature's types file so call sites keep their local vocabulary:
    `export type { X } from "$/util"` -- from the barrel, never a deep path.
  - Moving it is usually also a chance to fix it:  the general version can take a parameter the feature-shaped
    one never needed (a root to search, not always `document`).
