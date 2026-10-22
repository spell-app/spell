# WWOD spoke -- Functions & types

Function signatures, parameters and type design.
Read with `agents/wwod/WWOD.md` (the hub).
From:  original WWOD §11, root `AGENTS.md` "Functions", "Types / Exports" (types).

## 9. Functions & types

### Functions

- **Inner helpers are regular `function`s, defined at the bottom of the method:**
  - An inner helper that doesn't use `this` is NOT an inline arrow (`const visit = (...) => ...`).  Either:
    - make it a private helper function, or
    - declare it `function visit(...) {...}` at the BOTTOM of the enclosing function, after any `return`,
      with a docstring saying what it does -- hoisting makes it callable from above.
  - Arrow functions stay fine for short callbacks passed inline, e.g. `tokens.map((token) => token.value)`.
  - A one-line accessor is a VALUE, not a helper:  fine as an arrow
    (`const isRoot = () => props.node.kind === "root"`).  Anything with a body is a `function` at the bottom,
    components included, e.g. `selected()` vs `detailsFor()` in `packages/app/src/solid/TypeExplorer.tsx`.
  - Why the bottom:  the happy path stays on top, read first.  e.g. `toggleSection()` below `<TypeExplorer>`'s
    `return` (`packages/app/src/solid/TypeExplorer.tsx`).

- **Guard clauses first:**
  - Check preconditions and return early at the top.
  - Never nest the real logic inside `if (ok) { if (alsoOk) { ... } }`.
  - Collapse the check and the bail into one statement (`packages/server/src/Guard.ts`):

    ```ts
    if (!this.hosts.has(request.get("host") ?? "")) throw new SRV.HttpError(403, "unknown host")
    ```

- **Destructure options in the method signature, with inline defaults:**
  - Lift environment defaults into the param list, so tests can override them (`packages/server/src/Guard.ts`):

    ```ts
    constructor({ token = randomBytes(16).toString("hex") }: { token?: string } = {}) {
    ```

  - Not `params: {...}` then `params.x` in the body.
  - Solid props:  SEE:  WWOD §17 › "Props:  `type <Name>Props`, read where used".

- **Functions accept their dependencies as parameters, with sensible defaults:**
  - Never reach into `window` / `document` / globals when a param works:  default the param to the global itself.
    This is necessary for testing, and makes it easier to deploy in exotic environments such as web components.
  - `activeElementDeep(root: Document | ShadowRoot = document)` (`packages/ui/src/runtime/Focus.ts`):  a caller
    inside a shadow root, or a test, passes its own.

- **Callback DI, and an optional `ui?`, so flows run headless:**
  - The caller passes what the flow can't know as callbacks in its options:  `runCompiled(compiled, { coreUrl,
    loadImport })` (`packages/app/src/runner/runCompiled.ts`) -- the host says how a project's imports load.
  - Every use of the UI is `ui?.showX(...)`.

- **Structured objects over long parameter lists:**
  - Four or more params, or several options, take a `params` object (destructured in the signature, above).
  - NOT:  positional param threading, `update(project, record, existing, svg, slug, baseVersion)`.
  - A constructor:  SEE:  WWOD §12 › "Constructor takes ONE `props` object, normalized inside, and maybe a separate
    `context` object for dependency injection".

- **`(it) =>` for an anonymous item param:**
  - `.filter((it) => it !== undefined)` after `.map()`.
  - `it` only when the item has no better name:  `tokens.map((token) => token.value)` keeps `token`.

- **undefined-in / undefined-out tolerance** via overload pairs -- never throw on nullish, unless explicitly part of
  the method contract:
  - string formatters return `""`
  - parsers return `undefined`.

- **Overload a static when a flag flips the return type** (`assemble(bits, { optional: true })`) rather than adding
  a second name.

- **No redundant type annotations** TypeScript can infer:  `width = "15%"`, not `width: string = "15%"`.  Same for
  `undefined` values, e.g. `const { a = "default", b } = someVar` rather than `{ a = "default", b = undefined }`.

### Types

- **`type`, not `interface`:**
  - ALWAYS use `type` rather than `interface`.  Wrap with `Prettify` (an ambient global, below, "Ambient globals
    used bare") when combining types.
    - Use `Prettify<>` for easier debugging in TypeScript:  a hover shows the flattened shape, not `A & Omit<B, "x">`.
  - Mix a framework's base type in at the boundary when it's used only once, rather than naming the combination.
  - NOTE:  declaration merging into a built-in needs `interface`, since `type` can't merge -- the one exception,
    `interface Window` (the app's `packages/app/src/types/window.d.ts`).

- **Props types live with their class:**
  - Exception:  class constructor props (`XProps`) and component props live in the defining file.  Move to
    `<folder>.types.ts` once a second file needs them.
  - Every component gets its own `type <Name>Props`, directly below it (WWOD §8 › "Class first, its types and
    helpers below"):  `TypeExplorerProps` below `<TypeExplorer>`, `TreeRowProps` below `<TreeRow>`
    (`packages/app/src/solid/TypeExplorer.tsx`).

- **Type surgery over hand-written duplicates:**  `Prettify<A & Omit<B, "x">>`, `Pick<B, "x" | "y">` -- never
  re-declare a near-copy type.

- **Avoid `null`, use `undefined` instead:**
  - Treat absence of value as logically "null".
  - `undefined` values work for e.g. argument or method spread where `null` does not.
  - "Looked, not found", where `undefined` already means "not looked yet":  `NONE` from `spell-kit/util` -- SEE:
    `packages/spell/AGENTS.md` (`match.data`).
- **Leave an optional property OUT, never fill it with "nothing":**
  - An optional property that doesn't apply is simply absent:  no `null`, `""`, `false` or `"none"` written to
    say "skipped".  A `ui` vocabulary with no skeleton has no `skeleton` key.
  - Why:  one way to say "not set";  the data stays short, and a reader never wonders whether `""` means something.
  - A check that every entry "said which" is the wrong check:  test what's there, not what's missing.  (Owen,
    2026-10-06, epic `wwod-spell-ui` J26.)

- **Named string constants + `typeof` types**, never inline literal unions at call sites:
  - NEVER hard-code the same string twice:  make it a constant, or pass a sample message into a helper function
    which can be overridden.
  - `export const CONFIRM = "CONFIRM"`, `export const NONE = "NONE"` (`packages/util/src/spell/constants.ts`), then
    `typeof NONE` where a type needs it.
  - Frozen result singletons:  `export const CANCELLED_RESULT = { ... } as const`.
  - EXCEPT a platform string (an HTML attribute name or value, an ARIA word, a DOM event type, a tag name) is API,
    not data:  write it inline;  TypeScript checks many of them.
    - `setAttribute("aria-label", label)`, `role="list"`, `addEventListener("click", ...)`, `type === "reset"`,
      `createElement("div")` -- never `ARIA_LABEL`, `LIST_ROLE`, `CLICK`, `RESET`, `DIV`.
    - A constant only names what is OURS:  a word of our own vocabulary, a class word, a token, a data key.
      A word that is both (`"vertical"`:  `aria-orientation`, and a toast's class word) is inline where it's the
      platform's, a constant where it's ours.  (Owen, 2026-10-08, epic `wwod-spell-ui` P17.)

- **Const-array unions:**  a plural const for the list, a singular type for one value:

  ```ts
  export const WhitespacePolicies = ["strip", "leading only", "ignore"] as const
  export type WhitespacePolicy = (typeof WhitespacePolicies)[number]
  ```

  - `WhitespacePolicies` is the list of acceptable values (validate input, fill a menu);  `WhitespacePolicy` the type.
  - Plus a type-predicate helper when callers check unknown input.
  - When the word reads the same either way, ONE name for the const and the type
    (`packages/util/src/spell/constants.ts`):

    ```ts
    export const TaskStatus = {
      UNSTARTED: "UNSTARTED",
      ACTIVE: "ACTIVE",
      SUCCESS: "SUCCESS",
      FAILURE: "FAILURE"
    } as const
    export type TaskStatus = keyof typeof TaskStatus
    ```

    NOTE:  its ALL-CAPS values predate the English-values rule below;  new ones are English (`"in progress"`).
    The rename is `agents/CODE-DEBT.md` (`util`).

  - Why:
    - the constants stay contained, and less likely to conflict
    - the type shows its allowed values on hover in your editor
    - choose English values as they would be presented to a user:  `"user name"`, not `"user-name"`, `"UserName"` or
      `"USER_NAME"`

- **Const object + `keyof typeof`** for enum-with-payload maps (`packages/util/src/spell/constants.ts`):

  ```ts
  /** Well-known file formats as mime-types -- used by `$fetch()` / `LoadableFile` to pick response handling. */
  export const KnownFormat = {
    text: "text/plain",
    json: "application/json",
    png: "image/png",
    ...
  } as const
  /** Key type for `KnownFormat`, e.g. `"json"`. */
  export type KnownFormatName = keyof typeof KnownFormat
  /** Value type for `KnownFormat`, e.g. `"application/json"`. */
  export type KnownFormatMimeType = (typeof KnownFormat)[keyof typeof KnownFormat]
  ```

- **Avoid TS enums, and loose constants:**

  ```ts
  const ERROR = "ERROR"
  const WARNING = "WARNING"
  type ErrorType = typeof ERROR | typeof WARNING
  ```

  or, worse:

  ```ts
  const ERROR = 0
  const WARNING = 1
  ```

  - Use a const-array union or a const object (above).

- **String sentinels over booleans for modes**, in English, presentable to the user:
  - NEVER a positional boolean:  `forget("skip notification")`, not `forget(true)`.
  - ONE mode switch:  an English sentinel string -- `"last task"` / `"results"` (`TaskResolveWith`), `"off"` ...
    `"debug"` (`Logger`'s `DebugLevel`).
    - NOTE:  both are ALL-CAPS today (`"LAST_TASK"`, `"OFF"`):  the same debt as `TaskStatus` (above).
  - Several options:  a `params` object, where NAMED booleans are fine -- `assemble(bits, { optional: true })`,
    `overwrite: boolean | "check"` (above, "Structured objects over long parameter lists").
  - They live in the package root's `constants.ts`.

- **Permissive `XInput` aliases at public boundaries**, normalized once, up front:
  - `ChooserOptionInput = string | number | ChooserOptionObject` (`packages/app/src/solid/modals/modals.types.ts`),
    turned into `ChooserOption`s by `normalizeChooserOptions()` before anything else reads them.

- **ONE input type for the whole class, not one per method:**
  - e.g. "a selector, an element, or a list mixing both", taken by every method, so "what does this input name?"
    has a single answer.
  - Normalize it ONCE in a module-private splitter that every method calls, rather than each method doing its own
    coercion.
  - Accepting the already-resolved form as well as the name lets a caller that HOLDS the objects share the code
    with one that only knows their ids.  e.g. `SpellProject` (`packages/spell/src/SpellProject.ts`):  `getFileInfo()`
    and `getFile()` take `string | SP.SpellLocation` (`"file.spell"`, `"@user:projects:project/file.spell"` or a
    location), and both normalize it once through `getFileLocation()`:

    ```ts
    getFileInfo(filePath: string | SP.SpellLocation): SP.ProjectManifestEntry | undefined {
      const location = this.getFileLocation(filePath)
      if (location) return this.manifest[location.path]
      return undefined
    }
    ```

- **Collapse `X | X[]` into ONE string when the domain already has a separator convention:**
  - e.g. a CSS selector list, comma-separated (`"#items, #properties"`), rather than `Selector | Selector[]`.
  - Exactly one function knows the convention (the splitter);  the union's own splitting helper disappears.
  - Keep the template-literal guarantee on the string (`` `#${string}` ``), so the useful half of the type survives
    the collapse.

- **Template-literal types encode string invariants** (`packages/spell/src/spell.types.ts`):

  ```ts
  export type ProjectRootPath = `@${string}:${string}`
  ```

- **Ambient globals used bare**, no import:  the toolchain's `spell-kit/toolchain/types` -- the list:  root `AGENTS.md` "Aliases and global types".

- **Names assume the namespace:**
  - Assume references to types will be namespaced (WWOD §4), so don't repeat what the namespace already says:
    - `P.Sequence`, not `P.SequenceRule`
    - `SRV.Router`, not `SRV.ServerRouter`;  `SRV.HttpError`, not `SRV.ServerHttpError`
    - `LSP.ScopeExplorer`, not `LSP.LspScopeExplorer`
  - Older names that repeat it (`CLI.CliError`, `SP.SpellProject`) are renamed when next touched.
