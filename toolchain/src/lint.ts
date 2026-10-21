import type { OxfmtConfig } from "vite-plus/fmt"
import type { OxlintConfig } from "vite-plus/lint"
import { fileURLToPath } from "node:url"

/**
 * Lint (oxlint) and format (oxfmt) settings every package of every repo shares, as `lint` / `fmt` blocks of
 * `vite.config.ts`:  `spell-kit/toolchain/lint` (spell-app's root `vite.lint.ts` until epic `repo-split` P6).
 * - Was `.oxlintrc.json`, `.oxlintrc.react.json` and `.oxfmtrc.json` at the repo root,
 *   before Vite+ (`vp lint`, `vp fmt`, `vp check`) folded them into `vite.config.ts`.
 * - Plain objects, spread by each repo's root `vite.config.ts` and each package's:
 *   - a repo of several packages (spell-lang ...):  its root's block is `rootLint()`, each package's `packageLint()`
 *   - a flat repo, ONE package (spell-ui ...):  its root IS the package:  `packageLint({ name })` there
 *   `lint.extends` only takes FILE paths, and the files are gone.
 * - NOTE: a package's `lint` block does NOT inherit the root's:
 *   oxlint reads the nearest config only, so each package spreads `packageLint()`.
 *   `vp check` reads a repo's ROOT block only.
 */

////////////////
// ## Lint
////////////////

/**
 * Shared rules:  every package.
 * - `packageLint({ react: true })` adds React's (`reactLint`).
 */
export const lintBase = {
  // MUST be listed:  without it, oxlint adds its DEFAULT plugins (e.g. `unicorn`)
  plugins: ["typescript", "oxc", "import"],

  // `correctness` ~== what `eslint:recommended` + `tseslint:recommended` used to give us.
  categories: { correctness: "error" },

  // Type-aware rules, driven from the config,
  // so the CLI and the editor agree without anyone having to remember a flag.
  // - Runs on `oxlint-tsgolint`, which `vite-plus` brings.
  // - NOTE: NOT `typeCheck`:  `yarn ts` already runs `tsc`, and a second type check reports every error twice.
  options: { typeAware: true },

  // `vite-plus/prefer-vite-plus-imports`:  `vite-plus/test`, not `vitest` (and so on),
  // so every package gets its tools at the one version `vite-plus` pins.
  // `spell-ui/*`:  Spell UI's patterns in component files (`patternLint()`);
  // loaded everywhere, on in `PATTERN_FOLDERS`.
  // `spell/*`:  the repo's own import rules (`lint.imports.ts`), on everywhere (below).
  jsPlugins: [
    { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
    { name: "spell-ui", specifier: fileURLToPath(new URL("./lint.patterns.ts", import.meta.url)) },
    { name: "spell", specifier: fileURLToPath(new URL("./lint.imports.ts", import.meta.url)) }
  ],

  // NOTE: only rules that DIFFER from the `correctness` defaults belong here.
  // Anything listed as plain `"error"` was redundant and has been removed -- `categories` already enables it.
  rules: {
    ////////////////
    // ## Core / TypeScript
    ////////////////

    // `tsc` already reports these via `noUnusedLocals` -- avoid duplicate diagnostics.
    "no-unused-vars": "off",
    "typescript/no-unused-vars": "off",
    // spell is a dynamic language runtime;  `any` is deliberate at its JS/spell bridges.
    "typescript/no-explicit-any": "off",

    "prefer-const": ["error", { destructuring: "all" }],
    // `ui`'s components type their attribute getters by merging an interface into the class
    // (`export interface UIButton extends E.AttributeValues<typeof buttonVocabulary> {}`);
    // the getters are real, put on the class by `UIComponent.register()` (epic `wwod-spell-ui`, P14).
    "typescript/no-unsafe-declaration-merging": "off",

    ////////////////
    // ## Type-aware
    ////////////////

    // Passing a method reference is idiomatic throughout this codebase --
    // `store`/`core` are singletons whose methods reach them by name rather than via `this`,
    // and React components are handed prototype methods on purpose (see `ErrorHandler`).
    // ~37 hits, all intentional.
    "typescript/unbound-method": "off",
    // core stringifies arbitrary values on purpose (`upperCase(thing)` etc),
    // so this rule fires ~36 times on intended behaviour.
    // Individual risky spots are suppressed inline.
    "typescript/restrict-template-expressions": "off",

    ////////////////
    // ## Vite+
    ////////////////

    "vite-plus/prefer-vite-plus-imports": "error",

    ////////////////
    // ## Ours
    ////////////////

    // A relative import from one package (or its tests) into another's folder:  `$/server`, never
    // `../../../../server/src/...` (WWOD §4).
    // - HERE, not in an `overrides` entry:  it holds for every package and its tests, so the root's block and every
    //   package's (`packageLint()`) get it with the rest of `lintBase`, and it's on in tests too (`testLint` leaves it).
    // - It skips the repo root's own files itself:  they're in no package.
    "spell/no-cross-package-import": "error",
    // A `$/` alias naming a package of ANOTHER repo:  `spell-ui/core`, never `$/ui/core`, from the app
    // (WWOD §4;  epic `repo-split` P6).  Here too, for the same reasons.
    "spell/no-cross-repo-alias": "error"
  }
} satisfies OxlintConfig

/**
 * React's rules, for packages with React code:
 * `spell` (the app), `cli` (Ink screens) and the ones split from `spell`.
 * Merged AFTER `lintBase`.
 * - NEVER for `ui`:  it's Solid, where React's rules misfire (e.g. `jsx-key`).
 */
export const reactLint = {
  plugins: ["react"],
  rules: {
    // MUST stay listed:  unlike the other correctness rules, this one is NOT enabled by the category alone.
    // Verified -- delete this line and conditional hooks stop being reported.
    "react-hooks/rules-of-hooks": "error",
    // Deliberately a warning rather than an error:  dep-array fixes are judgement calls.
    "react-hooks/exhaustive-deps": "warn",
    // Automatic JSX runtime (`"jsx": "react-jsx"`), so `React` need not be in scope.
    "react/react-in-jsx-scope": "off",
    // `@risingstack/react-easy-state` components read/write the external `store` during render.
    // The React-Compiler-era rules model components as pure, so they flag that by design.
    "react/immutability": "off",
    "react/exhaustive-effect-dependencies": "off"
  }
} satisfies OxlintConfig

/**
 * Vendored, generated and scratch trees, for a multi-package repo's ROOT `lint` block (`rootLint()`).
 * - `**`-prefixed:  read relative to the config's folder, they must match in any package.
 * - The packages' own (`<name>/...`):  from their `packageLint()`, since the editor and `vp check` read only the root's
 *   block.  Each repo has only some of these folders:  the rest match nothing.
 * - Mirrors `fmtConfig.ignorePatterns`.
 */
export const rootLintIgnore = [
  "build",
  "dist",
  ".cache",
  ".yarn",
  ".vitest",
  "vendor",
  "reference",
  "coverage",
  // the declarations each package builds for the repos above (`spell-types`, epic `repo-split` I12)
  "**/dist-types",
  "**/src/icons/icon-packs",
  "**/src/icons/data",
  "**/components/ui-emoji/data",
  "**/site/dist",
  "**/tools/frameworks/solid/dist",
  "**/tools/results",
  // the epic engine, spell-epic, through a checkout's old link (epic `epic-eject` I5):  linted in its own repo
  "spell-epic",
  // spell-app's packages
  "app/dist-runner",
  "app/dist-element",
  "app/static",
  // the `@spell` space's projects (and the test projects):  spell source, and what compiling writes beside it
  "spaces/@spell",
  "tests/spaces/@spell",
  // its own yarn project, with its own tools
  "vscode",
  // spell-lang's `spell`
  "spell/.venv",
  "spell/graphify-out",
  "spell/thoughts",
  "spell/static",
  "spell/vscode-extension/out",
  // every component pack's generated folder (`spell pack build`)
  "**/components/__pack"
]

/**
 * Rules tests turn off, as an `overrides` entry for the root block and every package's.
 * - `typescript/no-misused-spread`:  WWOD §20 compares a whole instance with `toEqual({ ...instance })`,
 *   which the rule calls a mistake (a spread drops the prototype:  that's the point there;
 *   epic `wwod-spell-ui`, I22).
 */
export const testLint = {
  files: ["**/*.test.ts", "**/*.test.tsx"],
  rules: { "typescript/no-misused-spread": "off", ...patternRules("off") }
} satisfies NonNullable<OxlintConfig["overrides"]>[number]

/**
 * The folders of COMPONENT files, by package name (`ui` is spell-ui, `app` spell-app's `app/`), each from the package's
 * folder:  `patternLint()` turns the `spell-ui/*` rules on there.
 * - Every set's elements, all written on `$/spell-element`, held to the same patterns, each in its package's
 *   `components/`:  Spell UI's (and its docs site's widgets, `src/docs-components/`), the brand's, and
 *   the app's own (`<spell-app>`, `<spell-editor>`).
 *   - The epics' elements are spell-epic's (epic `epic-eject` I5), held to the same rules there.
 * - Not:
 *   - `app`'s `src/`:  WWOD §17's function components (Owen:  "other than app components")
 *   - the element core (`$/spell-element`, and `ui`'s `src/elements/`):  the decorators and helpers themselves
 *   - tests (`testLint`)
 */
export const PATTERN_FOLDERS: Record<string, string[]> = {
  ui: ["components", "src/docs-components"],
  brand: ["components"],
  app: ["components"]
}

/**
 * The `spell-ui/*` rules (`lint.patterns.ts`), as an `overrides` entry:
 * a component file doing by hand what one of Spell UI's decorators or helpers does
 * (spell-ui's `AGENTS.md`, "Solid authoring").
 * - Each message names the decorator or helper to use instead.
 * - A use that stays says why:  `// oxlint-disable-next-line spell-ui/no-untrack -- <why>`.
 * - `where`:  whose block it's for, so its globs read from that block's folder:
 *   - `"repo"`:  a multi-package repo's root (`rootLint()`):  `<name>/<folder>` (spell-app's `app/components`)
 *   - `"package"`:  a package's own (`packageLint({ name })`, a flat repo's root too):  `<folder>`
 */
export function patternLint(where: "repo" | "package", names = Object.keys(PATTERN_FOLDERS)) {
  const folders = names.flatMap((name) =>
    (PATTERN_FOLDERS[name] ?? []).map((folder) => (where === "repo" ? `${name}/${folder}` : folder))
  )
  return {
    files: folders.flatMap((folder) => [`${folder}/**/*.ts`, `${folder}/**/*.tsx`]),
    rules: patternRules("error")
  } satisfies NonNullable<OxlintConfig["overrides"]>[number]
}

/**
 * The `spell-ui/*` rules on component `folders` (relative to the config's folder), and `testLint`, as a `lint` block's
 * `overrides`:  for a repo that is ONE package, its elements in folders `PATTERN_FOLDERS` doesn't name (spell-epic's
 * `src/components/`, epic `epic-eject` J14).
 * - spell-epic's own until epic `repo-split` P6, in its copy of this file:  here so it can drop the copy.
 */
export function patternLintIn(folders: string[]) {
  return [
    {
      files: folders.flatMap((folder) => [`${folder}/**/*.ts`, `${folder}/**/*.tsx`]),
      rules: patternRules("error")
    },
    testLint
  ] satisfies NonNullable<OxlintConfig["overrides"]>
}

/** Every `spell-ui/*` rule, set to `level`. */
function patternRules(level: "error" | "off") {
  return {
    "spell-ui/no-solid-effect": level,
    "spell-ui/no-mutation-observer": level,
    "spell-ui/no-dom-element-listener": level,
    "spell-ui/no-untrack": level,
    "spell-ui/no-raw-timer": level,
    "spell-ui/no-function-component": level
  } as const
}

/**
 * Packages that get React's rules (`reactLint`), by name:  a multi-package repo's ROOT block's `overrides` --
 * one config for the editor and `vp check`, which never read a package's.
 * Their `vite.config.ts` says `packageLint({ react: true })`.
 * - Each is a folder of its repo (spell-lang's `core/`, spell-app's `cli/`):  none is a flat repo.
 */
export const REACT_PACKAGES = ["app", "cli", "core", "lsp", "parser", "spell", "util"]

/**
 * A multi-package repo's root `lint` block:  `lintBase` everywhere, `reactLint` on top in `REACT_PACKAGES`, the
 * `spell-ui/*` rules in `PATTERN_FOLDERS`.
 * - Its packages are folders at its root (`core/`), their tests in `tests/<name>/` (epic `repo-split` P8, Q16):  each
 *   repo has only some of the names, and the rest match nothing.
 * - A flat repo's root is its package:  `packageLint({ name })` there instead.
 */
export function rootLint() {
  return {
    ...lintBase,
    ignorePatterns: rootLintIgnore,
    overrides: [
      {
        // and their tests, in the repo's tests/ folder at the same paths (epic `people-and-orgs` P10)
        files: REACT_PACKAGES.flatMap((name) => [`${name}/**`, `tests/${name}/**`]),
        plugins: reactLint.plugins,
        rules: reactLint.rules
      },
      patternLint("repo"),
      testLint
    ]
  } satisfies OxlintConfig
}

/**
 * A package's `lint` block:  `lintBase`, plus `reactLint` when `react`.
 * - `ignorePatterns`:  the package's own, relative to its folder;  NOT inherited from the root's.
 *   - Plus every component pack's generated folder, `components/__pack/` (`spell pack build`), always.
 * - `name`:  its name in `PATTERN_FOLDERS` (`ui`, `brand`, `app`), for the `spell-ui/*` rules there.
 * - `ignorePatterns` always gets `dist-types` too (`spell-types`'s declarations).
 */
export function packageLint({
  react = false,
  ignorePatterns = ["build", "dist", ".cache"],
  name
}: PackageLintProps = {}) {
  return {
    ...lintBase,
    plugins: react ? [...reactLint.plugins, ...lintBase.plugins] : lintBase.plugins,
    ignorePatterns: [...ignorePatterns, PACK_FOLDER, TYPES_FOLDER],
    rules: react ? { ...lintBase.rules, ...reactLint.rules } : lintBase.rules,
    overrides: name && PATTERN_FOLDERS[name] ? [patternLint("package", [name]), testLint] : [testLint]
  } satisfies OxlintConfig
}

/** A component pack's generated folder in its package (`spell pack build`):  never linted. */
const PACK_FOLDER = "components/__pack"

/** A package's built declarations (`spell-types`, epic `repo-split` I12):  never linted. */
const TYPES_FOLDER = "dist-types"

/** Options of `packageLint()`. */
export type PackageLintProps = {
  /** add React's rules (`reactLint`) */
  react?: boolean
  /** the package's ignore patterns, relative to its folder */
  ignorePatterns?: string[]
  /** its name in `PATTERN_FOLDERS` (`"ui"`):  turns the `spell-ui/*` rules on in its folders there */
  name?: string
}

////////////////
// ## Format
////////////////

/**
 * oxfmt settings, for every package:
 * `vp fmt` reads the nearest `vite.config.ts` `fmt` block, so a package with its own `vite.config.ts` spreads this.
 */
export const fmtConfig = {
  trailingComma: "none",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  printWidth: 120,
  sortPackageJson: true,
  // spell's JSON5 stays the JSON-compatible part (epic `people-and-orgs` P12):  keys in double quotes, as written, so
  // Python's `json` reads it and VS Code checks it against its schema;  oxfmt would unquote them (`"as-needed"`)
  overrides: [{ files: ["*.json5"], options: { quoteProps: "preserve" } }],
  ignorePatterns: [
    "**/.output.js",
    "**/*.md",
    "**/*.scopes.js",
    "**/build/**",
    "**/dist/**",
    "**/.cache/**",
    "**/.venv/**",
    "**/.yarn/**",
    "**/.claude/**",
    "**/.vitest/**",
    "**/dist-types/**",
    "**/graphify-out/**",
    "**/thoughts/**",
    // a package's built `static/` (`app`, `spell`):  from its own folder, and from its repo's root.
    // NOT `**/static/**`, which also skipped Spell UI's source folder `src/static/` (the static server render)
    "static/**",
    "app/static/**",
    "spell/static/**",
    // spell projects:  the `@spell` space's built-ins (spell-app's `spaces/@spell/`) and the test projects
    "**/spaces/@spell/**",
    "**/vscode-extension/out/**",
    // the epic engine, spell-epic, through a checkout's old link (epic `epic-eject` I5):  formatted in its own repo
    "spell-epic/**",
    "**/src/test/fixtures/**",
    "**/src/graphify-out/**",
    "**/coverage/**",
    "**/reference/**",
    "**/src/icons/data/**",
    "**/src/icons/icon-packs/**",
    "**/components/ui-emoji/data/**",
    "**/ui/site/_assets/**",
    // the brand set's data, ALL of it (`yarn site:data` in spell-brand):  `pages.json5` too, which it rewrites.
    // From spell-brand's own root:  `docs/__data/` is a flat repo's, matched below for every set but `pages.json5`
    "**/brand/docs/__data/**",
    "**/spell-brand/docs/__data/**",
    // App UI's generated data (`yarn site:data` in spell-app's `app/`;  `.json5` since epic `epic-workflow` P20):  the bytes
    // stay the generator's.
    // `**/docs/...`:  matched from the root AND from the package, whose `vp fmt .` runs there
    "**/docs/__data/components.json5",
    "**/docs/__data/search.json5",
    // Spell UI's hand-laid-out pages, their parts and data (spell-ui's `docs/`;
    // the shared `ui/` at the root until epic `people-and-orgs` P18:  until it merges, that folder too)
    "**/ui/docs/**",
    "**/spell-ui/docs/**",
    "ui/**",
    "**/vendor/**",
    "*results.json",
    "*/*results.json",
    "**/tools/frameworks/solid/dist/**",
    "**/tools/results/**",
    // every component pack's generated folder (`spell pack build`):  `**/` first, so a package's own
    // `vp fmt components` skips it too
    "**/components/__pack/**"
  ]
} satisfies OxfmtConfig
