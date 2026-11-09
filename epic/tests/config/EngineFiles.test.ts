import { dirname, join, resolve } from "node:path"

import { describe, expect, it } from "vite-plus/test"

import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"

/** `epic/`, from this file's `tests/config/`. */
const ENGINE = resolve(import.meta.dirname, "..", "..")

describe("EngineFiles, in a checkout", () => {
  it("finds the engine's folder, its code and its command", () => {
    expect(EngineFiles.root).toBe(ENGINE)
    expect(EngineFiles.code).toBe(join(ENGINE, "src"))
    expect(EngineFiles.isBuilt).toBe(false)
    expect(EngineFiles.bin).toBe(join(ENGINE, "bin", "epic"))
  })

  it("names a file by its path in a checkout", () => {
    expect(EngineFiles.path("src/tools/_assets")).toBe(join(ENGINE, "src", "tools", "_assets"))
    expect(EngineFiles.path("templates")).toBe(join(ENGINE, "templates"))
  })

  it("leaves another engine's folder alone (a test's fake checkout)", () => {
    expect(EngineFiles.path("src/tools/_assets", "/x")).toBe(join("/x", "src", "tools", "_assets"))
  })

  it("runs a script under tsx with the engine's tsconfig", () => {
    const { args, env } = EngineFiles.nodeRun("/x/y.js", ["--flag"], {})
    expect(args).toEqual(["--import", "tsx", "/x/y.js", "--flag"])
    expect(env).toEqual({ TSX_TSCONFIG_PATH: join(dirname(EngineFiles.code), "tsconfig.json") })
  })
})
