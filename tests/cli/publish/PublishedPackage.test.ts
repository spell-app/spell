import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { PublishedPackage, builtPath, builtPathOrNone, type PackedPackage, type PublishedRepo } from "spell/cli/publish"

/**
 * `PublishedPackage` on a made-up repo, `spell-fake`:  its staging folder, the published `package.json`, `npm pack`
 * and the checks.
 */
const ROOT = mkdtempSync(join(tmpdir(), "spell-fake-pkg-"))
afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

// esbuild loads on the first build;  `npm pack` is a process of its own
vi.setConfig({ testTimeout: 60_000 })

const MANIFEST = {
  name: "spell-fake",
  version: "0.0.1",
  private: true,
  description: "a made-up repo",
  type: "module",
  workspaces: ["spell-*"],
  exports: {
    "./things": { "spell-fake-source": "./src/things/index.ts", default: "./src/things/index.ts" },
    "./vite.config.ts": "./vite.config.ts",
    "./*": { "spell-fake-source": ["./src/*.ts"], default: "./src/*" }
  },
  scripts: { postinstall: "node tools/links.ts" },
  dependencies: { spell: "workspace:*", "vite-plus": "catalog:", lodash: "^4.17.21" },
  devDependencies: { typescript: "^7.0.2" },
  sideEffects: ["./src/things/index.ts", "**/*.css", "./site/x.ts"],
  spell: { commands: "./src/cli/commands.ts", hooks: "./src/cli/hooks.ts" },
  spellPublish: { bin: { fake: "cli/main" }, files: ["templates"], sideEffects: ["things/setup.ts"] }
}

const REPO: PublishedRepo = {
  name: MANIFEST.name,
  root: join(ROOT, "repo"),
  manifest: MANIFEST,
  settings: MANIFEST.spellPublish
}

write("package.json", JSON.stringify(MANIFEST))
write("README.md", "# spell-fake\n")
write("src/things/index.ts", "export const thing = 1\n")
write("src/cli/main.ts", 'console.log("fake")\n')
write("src/cli/commands.ts", "export default () => {}\n")
write("templates/page.html", "<p>page</p>\n")

const pkg = new PublishedPackage(REPO, join(ROOT, "stage"), "2.0.0", { "spell-ui": "2.0.0" }, { "vite-plus": "1.0.0" })
let manifest: Record<string, unknown>
let packed: PackedPackage
beforeAll(async () => {
  await pkg.stage()
  manifest = JSON.parse(readFileSync(join(ROOT, "stage", "package.json"), "utf8"))
  packed = pkg.pack(ROOT)
})

describe("PublishedPackage.manifest()", () => {
  test("the one version;  yarn's versions made npm's;  the extra dependencies added", () => {
    expect(manifest.version).toBe("2.0.0")
    expect(manifest.dependencies).toEqual({
      spell: "2.0.0",
      "vite-plus": "1.0.0",
      lodash: "^4.17.21",
      "spell-ui": "2.0.0"
    })
  })

  test("nothing only a checkout needs", () => {
    for (const field of ["private", "workspaces", "scripts", "devDependencies", "spellPublish"]) {
      expect(manifest).not.toHaveProperty(field)
    }
  })

  test("exports at the built files;  every folder's index its own name;  what doesn't ship dropped", () => {
    const exports = manifest.exports as Record<string, unknown>
    expect(exports["./things"]).toBe("./dist/things/index.js")
    expect(exports["./cli"]).toBeUndefined()
    expect(exports["./vite.config.ts"]).toBeUndefined()
    expect(exports["./*"]).toEqual({ types: "./dist/*.d.ts", default: "./dist/*.js" })
  })

  test("bins, files, sideEffects and the spell entry at their published paths", () => {
    expect(manifest.bin).toEqual({ fake: "./bin/fake.js" })
    expect(manifest.files).toEqual(["README.md", "bin", "dist", "templates"])
    expect(manifest.sideEffects).toEqual(["./dist/things/index.js", "**/*.css", "./dist/things/setup.js"])
    // `hooks` names a file that isn't there:  dropped
    expect(manifest.spell).toEqual({ commands: "./dist/cli/commands.js" })
    expect(readFileSync(join(ROOT, "stage", "bin", "fake.js"), "utf8")).toMatch('await import("../dist/cli/main.js")')
  })

  test("a folder's sideEffects go to its dist/<folder>/:  import \"spell/ui\" isn't dropped (epic repo-split P22)", () => {
    const folders = ["ui", "epic"]
    expect(builtPathOrNone("./ui/src/index.ts", folders)).toEqual(["./dist/ui/index.js"])
    expect(builtPathOrNone("./ui/src/components/*/index.ts", folders)).toEqual(["./dist/ui/components/*/index.js"])
    expect(builtPathOrNone("./epic/**", folders)).toEqual(["./dist/epic/**"])
    expect(builtPathOrNone("./ui/site/_src/site.ts", folders)).toEqual([])
    expect(builtPathOrNone("./app/**", folders)).toEqual([])
  })
})

describe("PublishedPackage.pack() / checks()", () => {
  test("npm packs exactly the staging folder, and every check passes", () => {
    expect(packed).toMatchObject({ name: "spell-fake", version: "2.0.0", tgz: join(ROOT, "spell-fake-2.0.0.tgz") })
    expect(packed.files.sort()).toEqual([
      "README.md",
      "bin/fake.js",
      "dist/cli/commands.js",
      "dist/cli/main.js",
      "dist/things/index.js",
      "package.json",
      "templates/page.html"
    ])
    expect(pkg.checks(packed).filter((check) => !check.ok)).toEqual([])
  })
})

describe("builtPath()", () => {
  test("a src/ path made a dist/ one;  declarations and other paths as they are", () => {
    expect(builtPath("./src/x/y.tsx")).toBe("./dist/x/y.js")
    expect(builtPath("src/tools/_assets")).toBe("dist/tools/_assets")
    expect(builtPath("./src/window.mjs")).toBe("./dist/window.mjs")
    expect(builtPath("./src/types/index.d.ts")).toBe("./dist/types/index.d.ts")
    expect(builtPath("templates")).toBe("templates")
  })
})

/** Write `content` to `path` in the made-up repo, making its folders. */
function write(path: string, content: string) {
  mkdirSync(dirname(join(REPO.root, path)), { recursive: true })
  writeFileSync(join(REPO.root, path), content)
}
