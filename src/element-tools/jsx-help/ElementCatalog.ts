/// <reference types="node" />

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { NodePackage } from "spell/element-tools/NodePackage"
import type { CatalogElement, ElementDoc } from "spell/element-tools/tools.types"

/****************
 * ### `ElementCatalog`
 * Every custom element a package's JSX can use, read from the Custom Elements Manifests of its packages:
 * the package itself, and each package it depends on.
 * - A package ships a manifest by naming it in its `package.json`:
 *   `"customElements": "<path>"` (Spell UI's and Spell Brand's are written by their `yarn site:data`).
 * - So it works for ANY set that ships one, and imports none of them:  the kit never imports a child repo.
 * - A manifest is re-read when its file changes (its mtime), so a fresh `yarn site:data` shows up
 *   at the next keystroke, with no restart.
 * - Node built-ins only, plus `NodePackage`:  spell-app's VS Code extension bundles it, for `JsxElementHelp`.
 * - One catalog per package:  a file's is its package's, at or above it (`packageFolderFor()`),
 *   so a worktree's files read the worktree's manifests.
 ****************/
export class ElementCatalog {
  /** Absolute path of every manifest the packages name, the package's own first. */
  readonly manifestFiles: string[]

  /** Called with a line to log:  a manifest that can't be read. */
  private readonly log: (message: string) => void

  constructor(props: ElementCatalogProps) {
    this.log = props.log ?? (() => {})
    this.manifestFiles = props.manifestFiles ?? ElementCatalog.manifestFilesFor(props.from)
  }

  /** The element whose tag is `tagName`, e.g. `ui-panel`;  the first manifest that lists it wins. */
  elementFor(tagName: string): CatalogElement | undefined {
    return this.current().byTag.get(tagName)
  }

  /** Every element whose family is `folder` (absolute):  the components whose own JSX is in that folder. */
  elementsIn(folder: string): CatalogElement[] {
    return this.current().byFolder.get(resolve(folder)) ?? []
  }

  /**
   * The manifest files named by the package at or above `from`, and by every package it depends on, in that order.
   * - Its `dependencies`, `devDependencies`, `peerDependencies` and `optionalDependencies`, found as Node finds them.
   * - A named file that doesn't exist yet is kept:  its set's `yarn site:data` may write it later.
   * - NEVER throws:  no `package.json` above `from` means no manifests.
   */
  static manifestFilesFor(from: string): string[] {
    const packageDir = ElementCatalog.packageFolderFor(from)
    if (!packageDir) return []
    const ownPackage = readPackage(packageDir)
    const dependencyNames = new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(ownPackage?.[field] ?? {})))
    const dependencyDirs = [...dependencyNames].map((name) => NodePackage.dir(name, packageDir))
    return [packageDir, ...dependencyDirs].flatMap((dir) => {
      const manifest = dir ? readPackage(dir)?.customElements : undefined
      // its real path:  a linked package (`node_modules/spell-ui`) names its folders as the files being checked do
      return dir && typeof manifest === "string" ? [join(realpathSync(dir), manifest)] : []
    })
  }

  /** The nearest folder at or above `from` holding a `package.json`;  `undefined` when there's none. */
  static packageFolderFor(from: string): string | undefined {
    for (let folder = resolve(from); ; folder = dirname(folder)) {
      if (existsSync(join(folder, "package.json"))) return folder
      if (dirname(folder) === folder) return undefined
    }
  }

  ////////////////
  // ## Reading the manifests
  ////////////////

  /**
   * The elements of every manifest, re-reading each one whose mtime changed since it was last read.
   * - NEVER throws:  a manifest that's missing or isn't JSON adds no elements (and logs why, once per change).
   */
  private current(): ElementIndex {
    let changed = !this.index
    for (const file of this.manifestFiles) {
      const mtimeMs = mtimeOf(file)
      if (this.manifests.get(file)?.mtimeMs === mtimeMs) continue
      this.manifests.set(file, { mtimeMs, elements: this.readManifest(file, mtimeMs) })
      changed = true
    }
    if (changed) this.index = indexOf([...this.manifests.values()].flatMap((it) => it.elements))
    return this.index!
  }

  /** The elements of one manifest file;  none when it's missing or unreadable. */
  private readManifest(file: string, mtimeMs: number): CatalogElement[] {
    if (mtimeMs === MISSING) return []
    try {
      return elementsOf(
        JSON.parse(readFileSync(file, "utf8")) as Manifest,
        ElementCatalog.packageFolderFor(dirname(file)) ?? ""
      )
    } catch (error) {
      this.log(`can't read ${file}:  ${(error as Error).message}`)
      return []
    }
  }

  /** Each manifest's last read, by its absolute path. */
  private manifests = new Map<string, { mtimeMs: number; elements: CatalogElement[] }>()

  /** The elements by tag and by folder, rebuilt when a manifest changes. */
  private index: ElementIndex | undefined
}

/** How to make an `ElementCatalog`. */
export type ElementCatalogProps = {
  /** A folder of the package, e.g. a file's:  the package at or above it, and its dependencies. */
  from: string
  /** The manifests to read instead of finding them from `from`. */
  manifestFiles?: string[]
  /** Where to log a manifest that can't be read;  default:  nowhere. */
  log?: (message: string) => void
}

////////////////
// ## Helpers
////////////////

/** The `package.json` fields whose packages may ship elements the package uses. */
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const

/** The mtime of a file that doesn't exist. */
const MISSING = -1

/** The few fields of a `package.json` the catalog reads. */
type PackageJson = Partial<Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>> & {
  customElements?: unknown
}

/** The few fields of a Custom Elements Manifest (schema 2.1) the catalog reads. */
type Manifest = {
  modules?: {
    /** The module's path, from its package's root, e.g. `src/components/ui-panel/index.ts`. */
    path: string
    declarations?: {
      name?: string
      tagName?: string
      slots?: ElementDoc[]
      cssParts?: ElementDoc[]
      attributes?: { name: string }[]
      events?: { name?: string }[]
    }[]
  }[]
}

/** The elements, by tag and by absolute family folder. */
type ElementIndex = { byTag: Map<string, CatalogElement>; byFolder: Map<string, CatalogElement[]> }

/** The elements a manifest declares, their folders absolute from `packageDir`. */
function elementsOf(manifest: Manifest, packageDir: string): CatalogElement[] {
  return (manifest.modules ?? []).flatMap((module) =>
    (module.declarations ?? []).flatMap((declaration) => {
      if (!declaration.tagName) return []
      return [
        {
          tagName: declaration.tagName,
          className: declaration.name ?? "",
          folder: resolve(packageDir, dirname(module.path)),
          slots: declaration.slots ?? [],
          parts: declaration.cssParts ?? [],
          attributes: (declaration.attributes ?? []).map((it) => it.name),
          events: (declaration.events ?? []).flatMap((it) => (it.name ? [it.name] : []))
        }
      ]
    })
  )
}

/** `elements` by tag (the first of a tag wins) and by folder. */
function indexOf(elements: CatalogElement[]): ElementIndex {
  const byTag = new Map<string, CatalogElement>()
  const byFolder = new Map<string, CatalogElement[]>()
  for (const element of elements) {
    if (!byTag.has(element.tagName)) byTag.set(element.tagName, element)
    byFolder.set(element.folder, [...(byFolder.get(element.folder) ?? []), element])
  }
  return { byTag, byFolder }
}

/** The `package.json` in `dir`, or `undefined` when it's missing or isn't JSON. */
function readPackage(dir: string): PackageJson | undefined {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as PackageJson
  } catch {
    return undefined
  }
}

/** `file`'s mtime, or `MISSING`. */
function mtimeOf(file: string): number {
  try {
    return statSync(file).mtimeMs
  } catch {
    return MISSING
  }
}
