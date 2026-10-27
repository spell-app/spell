import { existsSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { definePlugin, defineRule, type ESTree, type Rule } from "vite-plus/lint/plugins"

/**
 * `spell`:  an oxlint plugin for the repos' own import rule, in every file of every repo
 * (WWOD §4, "ONE name per file";  epic `repo-split` P14, Q47).
 * - Every repo's code is under ONE `src/`, and every import of it is its package name plus its path under `src/`
 *   (`spell/util/string`, `spell/ui/components/ui-button/UIButton`), inside its own repo too.
 * - Unlike `spell-ui/*` (`lint.patterns.ts`), which holds component files to Spell UI's patterns,
 *   this holds for EVERY file:  on in `lintBase` (`lint.ts`).
 * - Replaced `no-cross-package-import` and `no-cross-repo-alias` (P14), which knew each repo's layout and alias table.
 * - `no-upward-import` (P20):  the kit's folders' order, down only, where the clone of each repo enforced it.
 */

////////////////
// ## Rules
////////////////

/** `vi.*` calls that take a module path:  a mock is an import too. */
const VI_CALLS = new Set(["mock", "doMock", "unmock", "doUnmock", "importActual", "importMock"])

/**
 * A relative import that climbs (`../`) into a package's `src/`:  `import { kebabCase } from "../util/string"`, from
 * the kit's `src/element/`;  its fix is the package name, `spell/util/string`.
 * - Any repo, any file:  inside one package too, and from a test or a config into `src/`.
 * - Same-folder peers stay relative (`./Peer`):  they don't climb.
 * - A climb to a file OUTSIDE `src/` is fine:  a config (`../vite.config.ts`), a glue tool (`../../tools/x.ts`), a
 *   test's own helper;  no package name reaches those.
 * - Looks at every module path a file names (`moduleVisitor()`).
 * - NOT a file path read or spawned (`resolve(import.meta.dirname, "../..")`, `new URL("..", import.meta.url)`), nor
 *   a glob (`import.meta.glob("../../src/element/**")`):  no package name reaches those.
 */
const noParentImport = defineRule({
  meta: {
    type: "problem",
    docs: { description: "No `../` import into a package's `src/`:  import it by its package name" },
    messages: {
      climb:
        "`{{path}}` climbs into {{pkg}}'s `src/`:  import it by its package name, `{{name}}`  " +
        '(WWOD §4, "ONE name per file")'
    }
  },
  create(context) {
    const file = context.filename
    return moduleVisitor((node, path) => {
      // a glob (`import.meta.glob()`) names files, not a module:  no package name reaches it
      if (!path.startsWith("../") || path.includes("*")) return
      const target = path
      const named = importNameFor(resolve(dirname(file), target))
      if (named) context.report({ node, messageId: "climb", data: { path, pkg: named.pkg, name: named.name } })
    })
  }
})

/**
 * An import that points UP the kit's folders (epic `repo-split` P20):  the kit's own `src/` is the bottom, then its
 * folders in its `package.json`'s `workspaces` order (`parser`, `ui`, `epic`, `app`), each using only those below it.
 * - It stands in for the clone that enforced it while they were repos of their own:  a repo only had the ones below.
 * - `import { UI } from "spell/ui/core"` in `parser/src/` is up;  in `epic/src/`, down.
 * - Every file of a folder counts as it:  its `src/`, tests, scripts and configs.
 * - A file outside the kit (a project beside it, spell-brand) may use any of them, as any project of `spell` may.
 */
const noUpwardImport = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Imports point DOWN the kit's folders:  the kit's own, then its `workspaces`, in order" },
    messages: {
      up:
        "`{{path}}` is {{target}}'s, above {{from}}:  imports point down the kit's folders ({{order}});  move what " +
        "both need down, or this code up"
    }
  },
  create(context) {
    const place = placeOf(context.filename)
    if (!place) return {}
    return moduleVisitor((node, path) => {
      const target = levelOf(place.kit, path)
      if (target === undefined || target <= place.level) return
      const names = ["the kit", ...place.kit.folders]
      context.report({
        node,
        messageId: "up",
        data: { path, target: names[target]!, from: names[place.level]!, order: names.join(", ") }
      })
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
 * The import name of file `path` (absolute, from a module path:  maybe without its extension), when it's in a
 * package's `src/`:  the package and `<package>/<path under src/>`, its extension and a trailing `/index` dropped
 * (`spell/util/string`, `spell/element`).
 * - The package:  the nearest folder up with a `package.json` that has a `name`.
 * - `undefined`:  not under a package's `src/`.
 */
export function importNameFor(path: string): { pkg: string; name: string } | undefined {
  const clean = path.replace(/\?.*$/, "")
  const root = packageRootOf(dirname(clean))
  if (!root) return undefined
  const inside = relative(root.dir, clean).split(sep).join("/")
  if (!inside.startsWith("src/")) return undefined
  const rest = inside
    .slice("src/".length)
    .replace(/\.(d\.)?[mc]?[jt]sx?$/, "")
    .replace(/(^|\/)index$/, "")
  return { pkg: root.name, name: rest ? `${root.name}/${rest}` : root.name }
}

/** A kit:  its folder, its package's name, and its folders (`workspaces`), lowest first. */
type Kit = { dir: string; name: string; folders: string[] }

/** Where file `file` sits in a kit:  the kit, and its level (0:  the kit's own;  `n`:  its `n`th folder). */
function placeOf(file: string): { kit: Kit; level: number } | undefined {
  const root = packageRootOf(dirname(file))
  if (!root) return undefined
  if (root.kit) return { kit: root.kit, level: root.kit.folders.indexOf(relative(root.kit.dir, root.dir)) + 1 }
  const kit = kitAt(root.dir)
  return kit ? { kit, level: 0 } : undefined
}

/** The level module path `path` names in `kit`:  `spell/ui/x` its folder's, `spell/x` the kit's;  else `undefined`. */
function levelOf(kit: Kit, path: string): number | undefined {
  if (path !== kit.name && !path.startsWith(`${kit.name}/`)) return undefined
  const first = path.slice(kit.name.length + 1).split("/")[0]!
  return kit.folders.indexOf(first) + 1
}

/** The kit at `dir`, when its `package.json` lists `workspaces` (its folders);  else `undefined`. */
function kitAt(dir: string): Kit | undefined {
  try {
    const { name, workspaces } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
      name?: string
      workspaces?: unknown
    }
    if (!name || !Array.isArray(workspaces)) return undefined
    return { dir, name, folders: workspaces.filter((each): each is string => typeof each === "string") }
  } catch {
    return undefined
  }
}

/** `packageRootOf()`'s answers, by folder. */
const ROOTS = new Map<string, PackageRoot | undefined>()

/** A package's folder and the name its files are imported by;  `kit`:  the kit it's a folder of. */
type PackageRoot = { dir: string; name: string; kit?: Kit }

/**
 * The package folder `dir` is in, and the name its files are imported by:  the nearest `package.json` up with a
 * `name`;  `undefined`:  none.
 * - A folder of a kit (one the package above it lists in its `workspaces`, epic `repo-split` P20) is the kit's:
 *   `ui/src/core.ts` is `spell/ui/core`, never its own `package.json`'s `spell-ui/core`.
 */
function packageRootOf(dir: string): PackageRoot | undefined {
  if (ROOTS.has(dir)) return ROOTS.get(dir)
  let found: PackageRoot | undefined
  for (let at = dir; dirname(at) !== at; at = dirname(at)) {
    const manifest = join(at, "package.json")
    if (!existsSync(manifest)) continue
    try {
      const { name } = JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }
      if (name) {
        const kit = kitAt(dirname(at))
        const folder = kit && relative(kit.dir, at).split(sep).join("/")
        found =
          kit && folder && kit.folders.includes(folder)
            ? { dir: at, name: `${kit.name}/${folder}`, kit }
            : { dir: at, name }
        break
      }
    } catch {
      break
    }
  }
  ROOTS.set(dir, found)
  return found
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

/** The rule(s), by name:  `spell/<name>` in a config or a disable comment. */
export const IMPORT_RULES = {
  "no-parent-import": noParentImport,
  "no-upward-import": noUpwardImport
} satisfies Record<string, Rule>

export default definePlugin({ meta: { name: "spell" }, rules: IMPORT_RULES })
