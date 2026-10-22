# WWOD -- What Would Owen Do?

House style for this repo (spell).  Audience:  AI coding agents -- follow these over your defaults.
- Examples cite real files by repo path;  read them when unsure.  Where an example has no path, it's illustrative.
- Cite rules as `WWOD §N › "rule title"`, e.g. `WWOD §5 › "Sentinel errors as control flow"`.
- How the rules fit together (root and package `AGENTS.md`, spokes, "As WWOD §N, plus:"):  `agents/wwod/README.md`.

The universal rules are here (§1-7);  topic rules in the spokes beside it (§8-20).
§6's long before / afters are a spoke too, `writing.md`.
Read the spoke(s) for what you're touching BEFORE writing code or text:

| Touching                                                       | Also read                                | §     |
| -------------------------------------------------------------- | ---------------------------------------- | ----- |
| docstrings, comments, READMEs, docs pages, epic pages          | `writing.md`                             | 6     |
| new feature, module layout, file names, barrels, namespaces    | `architecture.md`                        | 8     |
| types, function signatures, helper functions                   | `types.md`                               | 9     |
| server routes and APIs, env vars, configuration                | `server-env.md`                          | 10-11 |
| classes, decorators, state, `Loadable`, value objects, records | `classes-state.md`                       | 12-16 |
| Solid components, JSX (house style on top of `solid-2.md`)     | `solid.md`                               | 17    |
| CSS / styling                                                  | `css.md`                                 | 18    |
| logging, debug output                                          | `logging.md`                             | 19    |
| tests                                                          | `tests.md`                               | 20    |
| ANY Solid 2 code (signals, stores, `<ui-*>`):  read IN FULL    | `guides/solid/solid-2.md` | --    |
| anything inside a package                                      | `packages/<pkg>/AGENTS.md`               | --    |

## 1. Working process

- **Ship the product, not the spec:**
  - UX affordances and happy-path completeness first, over defensive breadth.
- **Code top-down from design intent:**
  - Start from user-facing feature definition -- what does the user see, work down from that.
  - README / types / API surface next.
  - Temporary inconsistency is fine, then a reconcile-and-fix pass.
  - Source (types + implementation) is the spec;
    tests get rewritten to match unless code is obviously wrong.
- **Drive-by hygiene while in the neighborhood:**
  - import normalization
  - small inconsistency fixes in touched files
  - fix obviously incorrect comments
  - A drive-by fix SHIPS even when the refactor that surfaced it is parked.
- **Grep the whole repo BEFORE renaming or moving anything**, and record what you found:
  - "nothing outside `Run.ts` reads `run.index`" is what makes a rename a contained change
    rather than a hopeful one.
  - Same before promoting a helper:  check the destination -- `spell-kit/util`, or the package's own util folder
    (WWOD §8 › "Promotion path") -- for a name collision.
- **Record deviations and known issues;  NEVER fix them silently**, unless very minor:
  - Epic work:  in its epic page, `epics/<name>/<name>.plan.html`.
    - Each fidelity / refinement round names the deviations it closed, with literal values.
    - An evaluated-and-rejected approach gets a written census of what it would touch.
  - Standing problems:  in their ledger, never left implicit -- `agents/CODE-DEBT.md` (incl. code that doesn't
    follow a WWOD rule yet), `agents/SUSPECTED-BUGS.md`, `agents/PAPERCUTS.md`, each with its own rules in its
    header.  SEE:  the kit's `AGENTS.md` "Long-term debt".
  - NOT:  a `CORRECTED <date>:` annotation on a claim later found wrong -- each file's own rule says how it's fixed.
- **Inspect objects through a debug global, not `console.log`** -- SEE:  WWOD §19 › "Debug globals through
  `setDebugGlobal()`".
- **Finishing pass for fast-drafted code:**
  - Run `yarn review` at the root of every repo you touched (or the kit's, over all);  what it runs:
    SEE:  the kit's `AGENTS.md` "Toolchain:  Vite+".
  - Then sweep for classic drift bugs:
    - operator precedence in template ternaries (`` `${a}` + b ? … ``)
    - inverted comparisons in guard clauses
    - DOM globals silently captured by `cause` shorthand (`{ cause: { status } }`)
    - `return promise` inside try/catch without `await` (catch never fires)
    - response-shape drift between server return and client type
    - secrets / tokens crossing a boundary in the wrong field
    - copy-paste residue from the file used as a template (labels, messages, event names)
    - missing early-return in prompt flows (`editor.prompt()` cancelled);  silent flows popping UI
- **Report the gates with numbers, and name what was already broken:**
  - test count AND the delta, with the reason -- `1128 passed / 65 files`, was `1130`, net -2
    from a dropped test and two `clamp` tests collapsing into one.
  - pre-existing warnings are called pre-existing (`0 errors / 4 pre-existing warnings`).
- **The `CLAUDE TODO` sweep is its own pass, not a step in the finishing pass:**
  - Find them ALL first (`grep -rn "CLAUDE TODO" <folder>/`), then work the list.
  - Do the ones that are right;  for each one you think we should skip, ask the user what they want to do.
  - The pass is done when the grep comes back empty.

## 2. General style

- **DRY:  extract logic duplicated more than ~3 lines** into a shared utility:
  - Before writing one, check `spell-kit/util`, the package's own util folder (`spell-ui/util` ...) and lodash
    (re-exported by `spell-kit/util`), e.g. lodash for dotted paths, `string.ts` for case conversion.
  - After implementing a feature, look for duplicated blocks and lift them up:  constants and small pure helpers
    into the folder's types file (WWOD §8 › "`<folder>.types.ts`"), the rest into a util file.
  - Two functions doing generally the same thing:  consolidate into one, with arguments or dependency injection --
    especially long chains of business logic in app code, components or route handlers.
  - NEVER hard-code the same string more than once:  make it a constant (WWOD §9 › "Named string constants +
    `typeof` types"), or pass a sample message into a helper function which can be overridden.  A platform
    string (`"aria-label"`, `"click"`, `"div"`) is the exception:  inline, same rule.
  - Where a shared helper lives (the package's util folder, `spell-kit/util` once 2+ packages use it), and the small private
    copy when that home would invert the dependency:  SEE:  WWOD §8 › "Promotion path".
- **Delete a field, option or export nothing reads**, rather than keeping it.
- **Ask before adding a dependency:**  ask Owen before adding any runtime dependency to a package;  lodash and
  `spell-kit/util` first (above).
- **API layers handle client / server communication and throw:**
  - `$fetch()` (`spell-kit/util`) throws a `ResponseError` subclass for every failure (WWOD §5 › "Server → client error
    identity");  callers never check `response.ok` themselves.
- **Models combine property defaulting and business logic:**
  - Complex business logic for manipulating object should be in model class, throw on error,
    e.g. `SpellProjectRoot.createApp()` (`packages/spell/src/SpellProjectRoot.ts`).
  - Prefer "smarter" methods, which throw (or, in a controller, show feedback) themselves, over callers that check
    and react.
- **App controllers use models + API and show feedback to user:**
  - High-level flows for user interaction belong in the app's controller, `editor` (`packages/app/src/editor.ts`),
    which reports success and failure as the flow runs:

  ```ts
  async createApp(projectRoot?: SP.SpellProjectRoot, projectId?: string): Promise<void> {
    projectRoot ??= editor.projectRoot!
    try {
      const project = await projectRoot.createApp(projectId)
      if (project) {
        editor.showEditor(project.path)
        editor.showNotice(`Created ${project.type} ${project.projectName}.`)
      }
    } catch (e) {
      editor.showError(e)
    }
  }
  ```

- **Generalize the domain:**
  - one `createApp()` for every project type, its message naming `project.type` -- not one per type
  - open `extension` lists instead of closed unions
  - parameterized helpers (`blobKey(id, ext)`) instead of one per kind
- **Best-effort work:**
  - `catch (ignored) { this.logger.error(...) }`, or `console.error(...)` where no logger exists
    (WWOD §19 › "`console.*` is reserved for")
  - methods documented `- NEVER throws` (WWOD §6 › "Note throws, side effects and conventions")
  - Deliberately un-awaited calls say so, and ALWAYS end in a `.catch(...)`:
    `void editor.compileApp().catch((error) => editor.showError(error))`, plus a comment when the why isn't
    obvious.
- **No unnecessary case normalization** (`.toLowerCase()`) for values with a defined format (env var names).
- **Formatting is oxfmt's** (through `vp fmt`):  120-char width, 2-space indent, no semicolons, double quotes, no
  trailing commas.
  - never hand-format against it;  `yarn format` settles it
  - where it's configured:  SEE:  the kit's `AGENTS.md` "Toolchain:  Vite+"
- **Strict TypeScript.**
  - Private members:  SEE:  WWOD §12 › "TS `private`, never `#private`".
- **Decorators:**  STANDARD (TC39) only -- WWOD §12 › "Decorators".

## 3. Naming

- **Name methods / vars for business logic, for humans:**
  - Humans understanding business logic is the hardest part of programming.
  - Name types, vars, methods, return values so business logic reads close to English.
  - Avoid abbreviations unless used consistently everywhere in a module.
- **`<result>For<input>()` for pure lookups:**
  - `positionForOffset`, `locationForDiskPath`, `serverPathForRoot`, `lastSelectionForFile`.
- **Controller families**, where app code navigates:
  - `<view>Url` (string) → `show<View>()` (navigate) → `isShowing<View>` → `canShow<View>` → `navigatedTo()`
    (UI reports back).
  - e.g. `SpellLocation.editorUrl` → `editor.showEditor()` (`packages/app/src/editor.ts`).
- **Arrow-function class fields for callbacks;  methods for mutations:**
  - Arrows for anything destructured or passed on (`getNode =`, `showDialog =`) -- preserves
    `this` binding.
  - Prototype methods for internal imperative mutations (`deleteNodes()`).
- **Boolean getters prefixed `is` / `has` / `can`:**  `isEditing`, `hasChanges`, `canSave`.
  - EXCEPT a custom element's PUBLIC API (attributes, properties, `:state()`, event `detail`), which copies the
    platform:  bare booleans (`el.open`, `el.disabled`, `nag.dismissed`), the platform's camelCase (`readOnly`,
    `maxLength`, `htmlFor`).  `is` / `has` / `can` are for our own members (a component's `isOpen`).  (Owen,
    2026-10-06, epic `wwod-spell-ui` J13.)
- **Drop the redundant type word once something is a class member** -- the class already said it:
  - In a `Run` class:  `nextRun(run)` → `next()`, `planRun()` → `planSteps()`, `runActionKeys()` → `actionKeys()`.
  - Same for reads, which become getters:  `runProgress(run)` → `progress`, `currentStep(run)` → `currentStep`,
    `canBack(run)` → `canBack` -- SEE:  WWOD §12 › "Derived reads are plain getters;  `@derived` only when worth it".
  - Fluent methods `return this`:  SEE:  WWOD §12 › "Transitions MUTATE, and return a result structure or `this`".
- **A local-name collision blocks a rename:**
  - `run.index` → `run.step` for the FIELD, but locals meaning "a plan position" stay `index`.
  - `this.step` is unambiguous because it's always prefixed;  a bare local `step` holding a
    number, sitting beside locals meaning "a `Step`", reads as a bug on sight.
- **Names must be HONEST about what the thing is**, and get fixed when they aren't:
  - `Target` → `Selector` when it holds a selector, not a target;  `TargetResolver` → `ElementResolver`.
- **Names aren't identifiers:**
  - NEVER treat a class name or rule name as a stable identifier -- for saved data, lookups, or anything which
    must survive a rename or a translation.  Names are for people, and change.
  - Add an explicit property for it instead, e.g. `@proto static importableAs = "quoted_property"`
    (SEE:  `packages/spell/AGENTS.md`).
- **"People", never "users"**, in what people read:  docs, pages, UI text.
- **Magic strings become named constants:**
  - `const UTM_KEYS = [...]`, `const SEARCH_REFERRERS = /google|bing/i`.
  - Not a platform string (an attribute name, an event type, a tag name):  that's API, written inline -- SEE:
    WWOD §9 › "Named string constants + `typeof` types".
  - At module level, declared BEFORE the function that uses them (or from the folder's `.types.ts`);  in a class,
    AFTER the main methods.  SEE:  WWOD §8 › "Class first, its types and helpers below".
  - Prefer a regex with the `i` flag over `.toLowerCase()` comparisons.
- **Don't rename for no reason:**  a destructured variable with a clear name keeps it
  (`replayEnabled`, not `shouldEnableReplay`).
- **Underscore-prefixed raw params**, normalized into a same-named local:
  - `locationFor(_path?: string | SP.SpellLocation) { const location = new SP.SpellLocation(_path) }`
- **Qualified ids:**  `projectId` not `id` even where context disambiguates;  `projectName` not `name`;
  `hashedWriteKey` not `writeKeyHash`.

## 4. Imports

Examples use spell-lang's `parser` and its namespace (`spell-lang/parser`, `P`);  each package's `AGENTS.md` names its
own.

- **ONE name per file:  the package's name plus its path under `src/`** (epic `repo-split` P14, Q47):
  - Every repo keeps its code under ONE `src/`, and every file has ONE name, the same in every repo:
    `spell-kit/util/string` is `src/util/string.ts` of `spell-kit`;  `spell-lang/parser` is the barrel
    `src/parser/index.ts`;  `spell-ui/components/ui-button/UIButton`.
  - Inside its own repo too:  NO `$/` alias, NO `#` subpath import, NO `../`.
  - No extension, as a bundler resolves it;  a query stays (`spell-ui/components/ui-parts/UIParts.css?inline`).
  - The names come from the package's `exports`:  one wildcard entry (the kit's `AGENTS.md`, "Imports across repos").
    - Plain `node`, which adds no extension, writes `.ts` (`spell-kit/util/node/json5.ts`), or uses an entry of its
      own the package lists.
  - Spell UI's published short names (`spell-ui/ui-code`) are for outside the repos only.
  - A string that only NAMES a module (a `packModules` key) is that same name:  `spell-ui/core` (P14, Q45).
  - Lint fails a `../` import into any package's `src/` (`spell/no-parent-import`, the toolchain's
    `lint.imports.ts`);  its message names the import to write.
- **The barrel, from another sub-system:**
  - From ANOTHER sub-system (a folder of `src/` with its own namespace), import its BARREL only (`spell-lang/parser`,
    never `spell-lang/parser/rules/Rule`), except the leaves its `AGENTS.md` lists for that (opt-in side-effect
    imports, test helpers, node-only files ...).
    - Everything in `src/` HAS a name, but that's not a license:  a leaf named from outside is a public shape.
  - Other exceptions are in the package's own "Imports".
  - EXCEPTION:  when subclassing, import the extended class directly from its file, to avoid circular imports --
    SEE:  WWOD §4 › "Circular imports".
  - Something outside `src/` that code must import (a `vite.config.ts`):  an explicit entry in its package's
    `exports` (`spell-ui/vite.config.ts`), never a path.
- **Same-folder peers only:**
  - OK to import from direct peers:  `import { Rule } from "./Rule"`, but not subdirectories -- use
    `spell-lang/parser/...` instead.
  - Need to reach a parent folder?  That's a package-name import.
- **ONE namespace per sub-system:**
  - Prefer ONE namespace import per sub-system and qualify at use site:
    `import { P } from "spell-lang/parser"` => `P.Match`, `new P.Symbol(...)`, `P.ASTExpression`.
    - Applies INSIDE the sub-system as well.
    - Self-import uses full path too, even from same folder as the barrel:
      `import { P } from "spell-lang/parser"`, NEVER `import { P } from "."`.
      Only the barrel itself says `"."`:  `export * as P from "."`.
    - NEVER reach into another sub-system's leaf file for something its barrel exports.
    - OK to refer to file's own class unqualified.
    - Tests may mix:  `import { P, Match, Parser } from "spell-lang/parser"`.
  - Why:  one name per type everywhere (`P.AnyMatch`), and `import type { P }` erases completely from output,
    so a `.types.ts` file stays value-free.
  - NOT:  a second namespace per feature folder -- SEE:  WWOD §8 › "ONE self-namespace per package".
- **Types-only leaf import as `PT`:**
  - When, and ONLY when, a file can't load its package's barrel (circular import), it imports the types module
    as a type-only namespace named `<namespace>T`:  `import type * as PT from "./parser.types"`, then `PT.AnyMatch`.
  - NEVER a bare `T`:  it reads as a generic type parameter (`doSomething<T>()`).
- **Circular imports:**
  - Circularity rules for files inside a barrel:
    - `P.X` as a VALUE is fine INSIDE function / method bodies -- resolved at call time.
    - NEVER use `P.X` at module-evaluation time:  `extends` clauses, static initializers,
      top-level `new`.  Circular reentry silently yields `undefined` / broken `instanceof`.
    - Import base classes directly from the defining file (a peer's `./File`, else its full name,
      `spell-kit/element/DOMElement`), with comment:
      `// Import directly to avoid circular import`

      ```ts
      // spell-lang's src/parser/scope/TypeScope.ts
      import { P } from "spell-lang/parser"
      // Import directly to avoid circular import
      import { BlockScope } from "./BlockScope"

      export class TypeScope extends BlockScope {
      ```

    - Use `import type { P }` when file only needs types, e.g. `*.types.ts`, `Tokens.ts`.
- **Direct imports that save bundle bytes:**
  - A direct import from the defining file is fine wherever the namespace would make a shipped bundle bigger (a
    leaf pulled into a third chunk, a barrel dragging its siblings in), with ONE short line above it saying so:
    `// Import directly:  through F it splits ControlLabels into a chunk of its own`.
  - Measure it (`yarn measure` in `ui`), don't guess;  then it's settled:  no judgement call to report unless it
    changes a public shape.  (Owen, 2026-10-06, epic `wwod-spell-ui` J23.)
- **Import order:**
  - node_modules
  - (blank line)
  - `spell-kit/util` and other general utilities, general-to-specific
  - other sub-system barrels, this repo's and other repos' (`spell-ui/...`, `spell-lang/...`), lowest first
  - own barrel
  - direct peer files, base classes first
  - (blank line)
  - side-effect imports (`import "spell-lang/parser/rulex"`)
  - css files (`./foo.css` if in same folder, else `<package>/path/to/foo.css`)
  - Frameworks (`solid-js` ...) are node_modules:  no group of their own.
- **One import statement per module:**
  - Inline type imports:  `import { P, type AnyMatch } from "spell-lang/parser"`.

## 5. Errors

- **Throw typed errors;  NEVER return error unions:**
  - NEVER return `{ ok: false, error }` unions.
  - `TypeError` for bad caller input;  `SyntaxError` for a parse error.
  - System errors are defined in `spell-kit/util/errors`:  `CustomError`, `UIError`, the `ResponseError` family.
  - A folder's own small error classes, when callers need to tell them apart, live in its `.types.ts`, never one
    file per class -- SEE:  WWOD §8 › "`<folder>.types.ts`".
  - Error details ride in `cause`, typed (WWOD §5 › "Structured error causes").
- **Error classes:  body usually empty, named AFTER the class:**
  - `SourceError.prototype.name = "SourceError"`, on the line after the class.
  - NEVER `this.name =` in a constructor, NEVER `get name()` from `this.constructor.name` (minifiers mangle it).
- **Structured error causes** get an exported `<Name>Cause` type:
  - `declare cause: <Name>Cause | undefined` on the class
  - read-only convenience getters (`get status() { return this.cause?.status }`)

  ```ts
  // `SourceError` (`packages/ui/src/runtime/runtime.types.ts`), in the shape this rule asks for
  /** Thrown by `UI.sources` (and savers) when a source can't be loaded or saved;  `cause.kind` says why. */
  export class SourceError extends Error {
    declare cause: SourceErrorCause | undefined
    /** HTTP status, when a response said no */
    get status() {
      return this.cause?.status
    }
  }
  SourceError.prototype.name = "SourceError"

  throw new SourceError("Sources.load():  can't load `x` from disk;  serve the page instead", {
    cause: { kind: "file-protocol" }
  })
  ```

- **Server → client error identity:**
  - The server half (`SRV.HttpError(status, message)`;  the listener answers with that status and
    `{ error: message }`, or the error's `body`):  SEE:  WWOD §10 › "Caller mistakes throw specific error subclasses".
  - Client:  `$fetch()` turns the status back into a `ResponseError` subclass -- `NotFoundError` (404),
    `AuthenticationError` (401 / 403), `OfflineError`, `CanceledRequestError` ...
  - Only a genuinely-expected error becomes a value (`instanceof NotFoundError → undefined`),
    e.g. loading an "optional" resource returns `undefined` rather than throwing `NotFoundError`.
- **Sentinel errors as control flow:**
  - A cancel (`CanceledError`, a dismissed `editor.prompt()`) aborts silently:  no error shown, nothing logged.
- **Rethrow with context:**
  - catch => set `error.cause = { method, args }` => rethrow, or
  - the `makeErrorWrapper(className)` decorator (`spell-kit/util`), which does it for every method of a class.
  - For a method with several failure points, `getDier(this, "activity", params)` (`spell-kit/util`) returns a scoped
    `die(message, error?)` that throws with that context.
- **Caller-supplied callbacks run through `safelyCall()` / `safelyCallAll()`:**
  - `safelyCall(predicate, logger?)` for a predicate, `safelyCallAll(list, logger?)` for a
    disposer / cleanup list.
  - The two differ ON PURPOSE:  a PREDICATE that throws is an authoring bug, so it stays visible
    and falls back to `console.warn` with no logger;  a CLEANUP callback that throws is noise,
    so it's silent without one.
  - NO hand-written `label` param on either:  a REAL throw carries a stack pointing at the exact
    file and line, which beats anything you'd type, so the wrapper logs a generic message and
    the call site keeps a short inline comment instead.
  - Both from `spell-kit/util`.
- **User-facing failures go to `editor.showError(error)`**, not thrown exceptions that crash the UI:
  - missing files, API failures the user should know about
  - SEE:  `editor.createApp()` in WWOD §2 › "App controllers use models + API and show feedback to user".
- **Guard-clause throws name the method, the problem, and the fix:**
  - `throw new TypeError("Scope.addRule():  this scope has no parser;  pass one to its constructor")`.
- **Separate success and error state in classes:**
  - `user` + `userError`, never one `state: Result | Error | undefined` field.
  - e.g. `editor.error` (`packages/app/src/editor.ts`) is its own field, beside the state it failed to change.

## 6. Comments & docs

The first five rules are for anything people read:
docstrings, comments, READMEs, `AGENTS.md` files, docs pages, epic pages.
Their long before / afters are in `agents/wwod/writing.md`.

- **Writing for people:**  for a reader figuring things out, not from inside the builder's head.
  - The reader:  future-Owen, or anyone new to that part of the code.
    NOT the agent who built it, with the whole system in mind and the web at hand.
  - Say what the thing IS, and how to use it, first.
    Why a squirrely choice was made comes after, if at all.
  - Keep every fact, number and caveat when you rewrite or condense.
  - Before / after, a class docstring's first lines (`packages/ui/src/elements/UIComponent.tsx`):

    ```text
    BEFORE
    Base CONTROLLER of every component:  one instance per element, created by the render function the fork
    (`solid-element`) calls, holding the component's signals, memos and handlers as fields and methods.

    AFTER
    The base class of every Spell UI component.
    Each `<ui-button>`, etc on a page gets ONE instance of its UIComponent's subclass (`UIButton`)
    which decides what the element shows and how it behaves.
    ```

- **Name things by what they are to the reader:**
  - The name a reader would look for:  "`UIComponent`" (or "the component"), never "the controller".
  - How a thing came to be (a fork, a port, a workaround) is an implementation detail.
    Leave it out of explanations, or give it one line at the end, if it really matters.
  - Before / after, now one docstring per member (`packages/ui/src/elements/DOMElement.ts`):

    ```text
    BEFORE
    /** The fork's instance API. */

    AFTER
    /** Run `callback` when the element is released (`dispose()`), newest first. */
    ```

- **One or two sentences a paragraph, or bullets:**
  - Never run sentences together:  3+ sentences become a short lead, then bullets, one idea each.
  - Bullets and numbered lists, not dense prose;  nested for sub-points;  short titles.
  - Why:  people skim, and dense text gets skipped.
  - Before / after, shortened (`packages/ui/src/elements/DOMElement.ts`, its class docstring):

    ```text
    BEFORE
    - The fork owns the platform plumbing:  shadow root, `ElementInternals`, the lifecycle.  This class keeps
      what is OURS:  the `ready` promise, custom states, the controller link.

    AFTER
    - This class is the browser's side of a custom element.
      Names marked "DOM API" are the browser's, from `HTMLElement` and the custom-element spec, not ours:
      - DOM API:  `connectedCallback()` (added to a page)
      ...
    - Ours:
      - the `ready` promise, custom states, the link to the component, swallowing clicks while disabled
    ```

- **Plain text, plain paths:**  say what it MEANS;  the exact settings and paths go where a reader can reach them.
  - Lead with a plain line saying what it adds up to, then one fact per bullet.
  - At most two code spans in a sentence.
    The exact settings, flags and values go in a folded code block, or a tooltip.
  - No file path in running prose:  name the thing (`buildTsx()`), its path its tooltip (the browser's own, `title`),
    `<code title="packages/spell/src/node/buildTsx.ts">buildTsx()</code>`.
    The doc-links tool still links it to the file, so a click opens it.
    Markdown has no tooltips:  a link, `` [`buildTsx()`](packages/spell/src/node/buildTsx.ts) ``.
  - No insider shorthand:  write `jsx: "preserve"` out as "reads JSX the way app and ui do".
  - Why (Owen, 2026-10-10, epic `airplane`):  "Text is waaaay to dense to parse quickly ... That is gobbeldygook."
  - Before / after, an epic page's "Built / Checked" notes, shortened (`writing.md` has it whole):

    ```text
    BEFORE
    Built: buildTsx(), packages/spell/src/node/buildTsx.ts:40.  Checked: tsc with jsx preserve,
    jsxImportSource solid-js, types ["spell-app/app/jsx"], paths from tsconfig.base.json, experimentalDecorators off.

    AFTER
    Built: buildTsx()      <- its path is the tooltip
    Checked: the type check now understands Spell UI pages.
    - It reads JSX the way app and ui do.
    - It adds app's types for <ui-*> tags, because spell-ui doesn't ship any.
    - It finds solid-js and the other packages in the repo, even though it runs from a temporary folder.
    - Decorators are checked as standard decorators, not the old experimental kind.
    ```

- **Break lines at phrases, not at the column:**
  - Near a line's end, look at the phrase in play:
    - only 1-4 of its words fit on this line:  start it on the next
    - the next line would be short:  move the whole phrase down
  - A phrase starts after `:`, `;`, `--` or a sentence's end, and at words like `which`, `so`, `e.g.`.
  - Why:  Owen reads the starts of lines, and skips a line whose start isn't what he's after.
  - For comments, docstrings and Markdown.
    HTML pages:  the formatter re-wraps their text, so there the other three rules apply.
  - Before / after, Owen's own (`packages/ui/src/elements/UIComponent.tsx`, `isReady`):

    ```text
    BEFORE
    - Not the same as a source element's loading (`SourceElement.loadStatus`):  this is the element itself being
      styled and drawn.

    AFTER
    - Not the same as a source element's loading (`SourceElement.loadStatus`):
      this is the element itself being styled and drawn.
    ```

- **Docstrings on every declaration:**
  - Create and maintain markdown docstring comments before:
    - types and each property in a type
    - classes and class methods/fields
    - loose methods
  - Every exported thing gets one, and every option / type member -- even one-liners.
- **Explain _why_**, don't just restate the code.
- **Note throws, side effects and conventions:**
  - Make sure to note side effects and unexpected conventions.
  - And what it throws, when:  `- throws if ...`, or `- NEVER throws` for best-effort work.
- **Docstring format:**
  - informal style, one line and then `-` bullets
  - DO NOT use jsdoc `@param` etc
  - terse text, e.g. `last server version`, not `the last known server version`:
    drop filler articles (`the`, `a`) that don't earn their place
  - two spaces after a period
  - backticked identifiers/types
  - format lists as bullets rather than inline commas
  - `~==` for "equivalent to" and `===` for exactly equals, e.g. `location.projectUrl ~== "@org:project:main"`
  - `--` as em-dash
- **Marker vocabulary** (line above the item):
  - ALL-CAPS invariants:  `NEVER`, `MUST`, `SIDE EFFECT:`, e.g.
    `NOTE: throws if you don't authorize() BEFORE calling!`
  - `NOTE:` `TODO:` `DEBUG:` `CONSIDER:` `DOCME` `TESTME` `RENAME` `DEPRECATED`
  - `HACK:` -- state the fragile assumption
  - `SEE:` -- cross-reference or URL
  - `REFACTOR:` -- a local cleanup, proposing the new shape inline (structural debt goes in `agents/CODE-DEBT.md`
    or the epic page)
- **OK to ship WIP markers:**
  - `// TODO: selection!`, `// DOCME`, empty group headers for planned code.
  - Terse TODOs, not fully-explained prose:  just enough to pick it up later.
- **Lower inline density;  minimal meta-commentary about the code:**
  - Inline comments are short and operational:
    `// Save files first:  link still works if index isn't updated`.
  - Long meta-comments narrating the code or justifying correctness are out;  one sentence is fine.
- **Comments that explain a utility belong as a docstring on the function**, not floating above a call site.
- **Group headers:**
  - Always place a blank line before a group header like the below.
  - Separate function code groups like so:

  ```

  ////////////////
  // ## Group Name
  ////////////////
  ```

  - Long methods too:  `//////` lines separate their functional groups.
- **Component banner:**
  - Separate components -- React / Solid / Svelte components, custom element classes -- and big classes with a
    header like so.  A custom element goes by its tag, e.g. `` ### `<ui-component-name>` ``:

  ```

  /****************
   * ### `<ComponentName>`
   * Description of the component.
   ****************/
  ```

  - The description:  one line of what it is, then bullets of its responsibilities.
- **A module or class docstring states its POSITION IN THE IMPORT GRAPH**, and what it must never import or know
  about:
  - spell-app's `src/app/runner/main.tsx`:  "NEVER imports `spell-lang/core`:  it'd be bundled here, a second copy".
  - spell-app's `src/app/solid/modals/dialogs.ts`:  "`editor` reaches these through a DYNAMIC `import()`, so
    `editor.ts` stays free of Solid and `spell-ui`".
  - What it deliberately does NOT know about, and why that matters -- often what makes it testable, e.g.
    `FormFields` (spell-ui's `src/components/ui-form/FormFields.ts`):  "plain DOM, no Solid, so it reads light-DOM
    natives and `ui-*` hosts alike";  `EmojiData`:  "no rendering, so the native fallback uses it too".
- **Record the REJECTED refactor at the site**, so nobody re-proposes it blind:
  - Same for a deliberate non-obvious shape:  "STATIC and instance-free on purpose", "Free
    rather than a method", "Deliberately does not re-plan".
- **Comments don't drift:**
  - When code is touched, make sure docstrings and other comments match.
  - Write or clarify docstrings and comments where you see marker `DOCME`.
  - Add docstring comments proactively, `CLAUDE DOCME` too.
  - A rename updates prose EVERYWHERE in the same commit, including other folders --
    step comments, other modules' docstrings, every README and `AGENTS.md` mention.
  - The README's files table is part of the code:  it changes in the same commit, and a
    file that LEFT the folder keeps a row pointing at its new home (`*(none -- spell-kit/util)*`).
- **`// oxfmt-ignore`** only for aligned ternary ladders with per-branch comments
  and hand-packed const tables.  Trailing `//` to force a line break.
  - Respect a `// oxfmt-ignore` someone added by hand.
- **The final `else` of an exhaustive ladder documents its condition:**
  - `else /* if (placement === "after") */`.
- **`oxlint-disable` carries a `-- reason`:**
  - `` // oxlint-disable-next-line import/default -- `?worker` is Vite's, typed by `vite/client`, which oxlint
    can't see `` (`packages/app/src/ui/monaco/monaco.ts`).
- **A front page per repo, `README.md`, and a `README-<folder>.md` beside it per major folder**, REQUIRED;
  NO README inside a folder.  Structure:
  - the front page:  what the repo is, a picture, its folders, setup, things to try, a link to every page beside it
  - a `README-<folder>.md` goes deep on one folder or topic, and holds what an in-folder README used to:
    - "The DRY rule (one of each)", with "If you find yourself writing a second copy of any
      of these, stop and reuse."
    - files table (unaligned `| --- |`), env-var table
    - a grammar fenced block, for a folder that parses something (URLs, paths ...)
    - numbered "Adding a new X" recipe, "Deferred" section
  - every page ends with "See also";  `yarn readme:check`, at the kit's root, checks the links, captions and names
  - in-flight design notes go in an epic page (`epics/`), not beside the README
  - NOT:  a `README.md` in each package folder -- they were folded into the repos' pages and deleted (epic
    `readme` Q5).
- **User-facing strings stay inline**, where they're used;  only `ui` localizes (its vocabularies, `UIButton.en.ts`).
  - NOT:  a `MSG.ts` object of every user-facing string per package -- one more file to keep in step, for no
    localization.

## 7. Anti-patterns (Claude habits to drop)

Each is a rule elsewhere;  this is the quick list.

- A file per helper function -- SEE:  WWOD §8 › "One exported class per file".
- Terse abbreviations (`ctor`, ...) -- SEE:  WWOD §3 › "Name methods / vars for business logic, for humans".
- An error class per file, or per call site -- SEE:  WWOD §5 › "Throw typed errors;  NEVER return error unions".
- `{ ok: false, error: "..." }` result unions + error-mapper functions -- SEE:  WWOD §5 › "Throw typed errors;  NEVER
  return error unions".
- Local copies of generic helpers in route / feature files (unless the shared home would invert the dependency) --
  SEE:  WWOD §8 › "Promotion path".
- Long named-import lists from leaf modules -- SEE:  WWOD §4 › "ONE namespace per sub-system".
- Long meta-comments narrating the code -- SEE:  WWOD §6 › "Lower inline density;  minimal meta-commentary about the
  code".
- Text written from inside the builder's head:  "the fork", run-together sentences, lines broken at the column --
  SEE:  WWOD §6 › "Writing for people".
- Positional param threading (`update(project, record, existing, svg, slug, baseVersion)`) -- SEE:  WWOD §9 ›
  "Structured objects over long parameter lists".
- A positional boolean (`forget(true)`) -- SEE:  WWOD §9 › "String sentinels over booleans for modes".
- One route module per HTTP verb;  helpers and retry loops inside route handlers -- SEE:  WWOD §10 › "Route handlers
  are a few lines, no business logic".
- Inline modal config with logic inside app classes -- SEE:  WWOD §17 › "Dialogs".
- Immutable-record state machines (`nextX(x)` returning `{ ...x, changed }`) -- SEE:  WWOD §12 › "A class for
  anything with IDENTITY, a LIFECYCLE, or that COORDINATES".
- Free functions whose first argument is always the same object, or that thread one `context` through every call --
  SEE:  WWOD §12 › "A collaborator constant for the object's life is a `readonly` field set once, NOT a parameter on
  every method".
- A distinct input type per method (`getElements(spec)` vs `measureAll(elements)`) -- SEE:  WWOD §9 › "ONE input type
  for the whole class, not one per method".
- Keeping a field, option or export nothing reads -- SEE:  WWOD §2 › "Delete a field, option or export nothing reads".
