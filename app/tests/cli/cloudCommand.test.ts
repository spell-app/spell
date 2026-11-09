/**
 * `spell space cloud serve`'s browser bundle (epic `atmosphere` I15):  it never starts on a stale one.
 */
import { describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import type { SRV } from "spell/server"
import { browserBundleCurrentOrDie } from "spell/app/cli/commands/cloudCommand"

/** A stand-in for the bundle:  `stale` says why;  `fails`, its build throws. */
function bundleThat({ stale, fails }: { stale?: string; fails?: boolean }) {
  return {
    packageDir: "/kit/app",
    check: () => ({ name: "app-element", output: "app/dist-element", sources: "abc", ...(stale && { stale }) }),
    build: vi.fn(() => {
      if (fails) throw new Error("the build failed")
    })
  } as unknown as SRV.Bundle & { build: ReturnType<typeof vi.fn> }
}

describe("the cloud's browser bundle", () => {
  test("current:  nothing is built", () => {
    const bundle = bundleThat({})
    browserBundleCurrentOrDie(bundle)
    expect(bundle.build).not.toHaveBeenCalled()
  })

  test("stale:  built first", () => {
    const bundle = bundleThat({ stale: "built from older sources" })
    browserBundleCurrentOrDie(bundle)
    expect(bundle.build).toHaveBeenCalledOnce()
  })

  test("a build that fails stops the cloud, saying how to see why", () => {
    const bundle = bundleThat({ stale: "never built", fails: true })
    expect(() => browserBundleCurrentOrDie(bundle)).toThrow(CLI.CliError)
    expect(() => browserBundleCurrentOrDie(bundle)).toThrow(/cd \/kit\/app && yarn build:element/)
  })
})
