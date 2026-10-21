import { existsSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { definePlugin, defineRule, type ESTree, type Rule } from "vite-plus/lint/plugins"

/**
 * `spell`:  an oxlint plugin for the repos' own import rules, in every package and its tests
 * (WWOD §4, "Package aliases, never `../`";  epic `repo-split` P3, P6 and I13).
 * - Unlike `spell-ui/*` (`lint.patterns.ts`), which holds component files to Spell UI's patterns,
 *   these hold for EVERY file of a package or its tests:  on in `lintBase` (`lint.ts`).
 * - Laid out as the kit `spell-kit` holds its child repos (epic `repo-split` P8, Q16, P9):
 *   - the kit's own folders (`util/`, `server/` ...):  each a package to these rules, its tests `tests/<name>/`
 *     (one npm package, `spell-kit`, but one TypeScript program per folder)
 *   - a repo of several packages (spell-lang ...):  `<repo>/<name>/`, its tests `<repo>/tests/<name>/`
 *   - a flat repo, ONE package (spell-ui ...):  the repo itself, its tests `<repo>/tests/`
 * - Files at a multi-package repo's root (`vite.config.ts` ...) aren't in a package:  no rule here looks at them.
 */

////////////////
// ## Rules
////////////////

/** The file that marks the kit, the top repo holding every child repo:  its list of them. */
const TOP_MARK = "repos.json5"

/** The kit when no `repos.json5` is found above a file:  the kit this file is in (`toolchain/src/`). */
const FALLBACK_TOP = resolve(dirname(fileURLToPath(import.meta.url)), "../..")

/** `vi.*` calls that take a module path:  a mock is an import too. */
const VI_CALLS = new Set(["mock", "doMock", "unmock", "doUnmock", "importActual", "importMock"])

/**
 * A relative import that climbs out of its package into ANOTHER package's folder:
 * `import { checkoutOf } from "../../../../spell-server/server/src/checkout.ts"`, from `spell-app/spaces/`.
 * - A package's code (`<repo>/<a>/`) and its tests (`<repo>/tests/<a>/`) count as ONE package:
 *   a test may reach its own package's files, and they its test folder.
 * - Looks at every module path a file names (`moduleVisitor()`).
 * - NOT a file path read or spawned (`resolve(import.meta.dirname, "../..")`, `new URL("..", import.meta.url)`):
 *   no alias reaches those.
 * - A path into a repo root's own files (`../../vite.config.ts`) is fine:  they're nobody's package.
 * - Its fix, in its message:  the package's alias inside its repo (`$/parser`, from `spell`);  its npm name from
 *   another repo (`no-cross-repo-alias`), and in a file Vite loads as a config, which has no alias table
 *   (`spell-kit/server/checkout`, `@spell-app/ui/vite.config.ts`):  an entry its `package.json` `exports` names.
 */
const noCrossPackageImport = defineRule({
  meta: {
    type: "problem",
    docs: { description: "No relative import from one package into another:  import through the package's alias" },
    messages: {
      climb:
        "`{{path}}` climbs out of `{{from}}` into `{{into}}`:  import it through the package, never `../`:  " +
        "from its own repo, its alias (`$/{{name}}`, or an entry point `tsconfig.base.json` lists);  from another " +
        "repo, or where no alias reaches (a Vite config), its npm name (`{{npm}}/...`, its `exports`)  " +
        '(WWOD §4, "Package aliases, never `../`")'
    }
  },
  create(context) {
    const file = context.filename
    const from = packageOf(file)
    if (!from) return {}

    return moduleVisitor((node, path) => {
      // a glob's `!` leaves files out:  still a path into that folder
      const target = path.replace(/^!/, "")
      if (!target.startsWith("../")) return
      const into = packageOf(resolve(dirname(file), target))
      if (into && into.name !== from.name) {
        context.report({
          node,
          messageId: "climb",
          data: { path, from: from.folder, into: into.folder, name: into.name, npm: npmNameOf(into.name) }
        })
      }
    })
  }
})

/**
 * Each package's repo, by package name:  where `$/<name>` is an alias (epic `repo-split` P8).
 * - Inside ONE repo, a package names another by its alias (`$/parser`, from `spell`);  from ANOTHER repo, by its npm
 *   name (`@spell-app/ui/core`, from the app;  `spell-kit/element`, from Spell UI).
 * - A package missing here is in no known repo:  the rule leaves its imports alone.
 * - The flat repos (one package each) are `FLAT_REPOS`;  the kit's folders, `KIT_FOLDERS`.
 */
export const REPO_OF: Readonly<Record<string, string>> = {
  util: "spell-kit",
  toolchain: "spell-kit",
  server: "spell-kit",
  assembler: "spell-kit",
  "spell-element": "spell-kit",
  parser: "spell-lang",
  markdown: "spell-lang",
  core: "spell-lang",
  py: "spell-lang",
  spell: "spell-lang",
  ui: "spell-ui",
  brand: "spell-brand",
  app: "spell-app",
  spaces: "spell-app",
  lsp: "spell-app",
  cli: "spell-app",
  vscode: "spell-app",
  "page-server": "spell-app",
  epics: "spell-epic"
}

/** The repos that ARE one package, by folder:  their package's name (`spell-ui` is `ui`, `$/ui`). */
export const FLAT_REPOS: Readonly<Record<string, string>> = {
  "spell-ui": "ui",
  "spell-brand": "brand",
  "spell-epic": "epics"
}

/**
 * The kit's own folders, at its root (epic `repo-split` P9):  each folder's package name, its `$/` alias
 * (`element/` is `$/spell-element`, the name every page's packs share it by, J72).
 * - One npm package, `spell-kit`:  another repo imports a folder as `spell-kit/<folder>` (`npmNameOf()`).
 */
export const KIT_FOLDERS: Readonly<Record<string, string>> = {
  util: "util",
  toolchain: "toolchain",
  server: "server",
  assembler: "assembler",
  element: "spell-element"
}

/** A package's npm name, by its name (its alias's):  `spell-kit/element` for `spell-element`, `@spell-app/ui` for `ui`. */
export function npmNameOf(name: string): string {
  const folder = Object.entries(KIT_FOLDERS).find(([, each]) => each === name)?.[0]
  return folder ? `spell-kit/${folder}` : `@spell-app/${name}`
}

/**
 * A `$/` alias naming a package of ANOTHER repo (`REPO_OF`):  `import { E } from "$/spell-element"`, from Spell UI.
 * - Its fix, in its message:  the package's npm name, `spell-kit/element`, an entry its `package.json`
 *   `exports` names (a family's barrel is its published entry:  `@spell-app/ui/ui-code`).
 * - Looks at every module path a file names, as `no-cross-package-import` does.
 * - NOT a string that only NAMES a module:  a page's `SpellUI.packModules` keys (`"$/ui/core"`) stay `$/` names.
 */
const noCrossRepoAlias = defineRule({
  meta: {
    type: "problem",
    docs: { description: "No `$/` alias into another repo's package:  import it by its npm name" },
    messages: {
      alias:
        "`{{path}}` is `{{name}}`'s alias, from `{{from}}` ({{fromRepo}}) into {{intoRepo}}:  import it by its npm " +
        'name, `{{npm}}{{rest}}`, an entry of its `package.json` `exports`  (WWOD §4, "Package names across repos")'
    }
  },
  create(context) {
    const from = packageOf(context.filename)
    const fromRepo = from && REPO_OF[from.name]
    if (!from || !fromRepo) return {}
    return moduleVisitor((node, path) => {
      const name = /^\$\/([^/?]+)/.exec(path)?.[1]
      const intoRepo = name && REPO_OF[name]
      if (intoRepo && intoRepo !== fromRepo) {
        context.report({
          node,
          messageId: "alias",
          data: {
            path,
            name,
            from: from.folder,
            fromRepo,
            intoRepo,
            npm: npmNameOf(name),
            rest: path.slice(2 + name.length)
          }
        })
      }
    })
  }
})

////////////////
// ## Helpers
////////////////

/**
 * A visitor calling `check(node, path)` for every module path a file names:  `import`, `export ... from`,
 * `import()`, `import x = require()`, `import("...").Type`, `require()`, `vi.mock()` and friends,
 * `import.meta.glob()`, and `declare module "..."` (an augmentation names its module too).
 */
function moduleVisitor(check: (node: ESTree.Node, path: string) => void) {
  const visit = (node: ESTree.Node | null | undefined) => {
    const path = node ? stringOf(node) : undefined
    if (node && path) check(node, path)
  }
  return {
    ImportDeclaration: (node: ESTree.ImportDeclaration) => visit(node.source),
    ExportNamedDeclaration: (node: ESTree.ExportNamedDeclaration) => visit(node.source),
    ExportAllDeclaration: (node: ESTree.ExportAllDeclaration) => visit(node.source),
    ImportExpression: (node: ESTree.ImportExpression) => visit(node.source),
    TSImportType: (node: ESTree.TSImportType) => visit(node.source),
    TSExternalModuleReference: (node: ESTree.TSExternalModuleReference) => visit(node.expression),
    TSModuleDeclaration: (node: ESTree.TSModuleDeclaration) => {
      if (node.id.type === "Literal") visit(node.id)
    },
    CallExpression(node: ESTree.CallExpression) {
      if (!isModuleCall(node.callee)) return
      const [first] = node.arguments
      if (first?.type === "ArrayExpression") for (const element of first.elements) visit(element)
      else visit(first)
    }
  }
}

/**
 * The package a path is in, if it's in one:  its name and its folder from the kit (`spell-lang/core`,
 * `spell-lang/tests/core`, `spell-ui`, `spell-ui/tests`, `element`, `tests/element`).
 * - The kit's own folders (`KIT_FOLDERS`):  `<folder>/...` or `tests/<folder>/...`, at the kit's root.
 * - Else its repo:  the child-repo folder under the kit (`topOf()`) that it's in.
 * - A flat repo (`FLAT_REPOS`):  every file in it is its package's, its tests' too.
 * - A repo of several packages:  `<repo>/<name>/...` or `<repo>/tests/<name>/...`;  its root's own files are in none.
 */
export function packageOf(path: string): { name: string; folder: string } | undefined {
  const parts = relative(topOf(path), path).split(sep)
  const [repo, first, second] = parts
  if (!repo || repo.startsWith("..") || parts.length < 2) return undefined
  const kit = KIT_FOLDERS[repo]
  if (kit) return { name: kit, folder: repo }
  if (repo === "tests") {
    const tested = KIT_FOLDERS[first!]
    return tested && parts.length > 2 ? { name: tested, folder: `tests/${first}` } : undefined
  }
  const flat = FLAT_REPOS[repo]
  if (flat) return { name: flat, folder: first === "tests" ? `${repo}/tests` : repo }
  if (first === "tests") return parts.length > 3 ? { name: second!, folder: `${repo}/tests/${second}` } : undefined
  return parts.length > 2 ? { name: first!, folder: `${repo}/${first}` } : undefined
}

/** `topOf()`'s answers, by folder. */
const TOPS = new Map<string, string>()

/**
 * The top repo holding `path`:  the nearest folder up with a `repos.json5` (`TOP_MARK`), so a worktree of the top
 * repo counts as its own;  else `FALLBACK_TOP`.
 */
function topOf(path: string): string {
  const start = dirname(path)
  const cached = TOPS.get(start)
  if (cached) return cached
  let top = FALLBACK_TOP
  for (let at = start; dirname(at) !== at; at = dirname(at)) {
    if (existsSync(join(at, TOP_MARK))) {
      top = at
      break
    }
  }
  TOPS.set(start, top)
  return top
}

/** The text of a string literal, or of a template literal with nothing put in it. */
function stringOf(node: ESTree.Node): string | undefined {
  if (node.type === "Literal") return typeof node.value === "string" ? node.value : undefined
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0]?.value.cooked ?? undefined
  return undefined
}

/** Does `callee` take a module path:  `require()`, `vi.mock()` ..., `import.meta.glob()`? */
function isModuleCall(callee: ESTree.Node): boolean {
  if (callee.type === "Identifier") return callee.name === "require"
  if (callee.type !== "MemberExpression" || callee.property.type !== "Identifier") return false
  const { object, property } = callee
  if (object.type === "Identifier") return object.name === "vi" && VI_CALLS.has(property.name)
  return object.type === "MetaProperty" && object.meta.name === "import" && property.name === "glob"
}

////////////////
// ## Plugin
////////////////

/** The rules, by name:  `spell/<name>` in a config or a disable comment. */
export const IMPORT_RULES = {
  "no-cross-package-import": noCrossPackageImport,
  "no-cross-repo-alias": noCrossRepoAlias
} satisfies Record<string, Rule>

export default definePlugin({ meta: { name: "spell" }, rules: IMPORT_RULES })
