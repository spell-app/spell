/**
 * Tests of `SRV.Secrets`:  a secret kept in a private file by its name, the environment first, never printed;
 * and `SRV.scrubbed()`, which takes secrets out of text.
 */
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { inspect } from "node:util"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/** A token no test prints. */
const TOKEN = "nbt_fake1234.secret5678"

const folders: string[] = []
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
})

/** Secrets kept in a temporary folder, with `environment` as the environment. */
function secretsIn(environment: Record<string, string> = {}): SRV.Secrets {
  const folder = mkdtempSync(join(tmpdir(), "secrets-"))
  folders.push(folder)
  return new SRV.Secrets({ folder: join(folder, "secrets"), environment })
}

describe("Secrets", () => {
  test("keeps a secret in a file of its own, only its owner able to read it", () => {
    const secrets = secretsIn()
    secrets.keep("NETBOX_TOKEN", `  ${TOKEN}\n`)
    const file = join(secrets.folder, "NETBOX_TOKEN")
    expect(readFileSync(file, "utf8")).toBe(`${TOKEN}\n`)
    expect(statSync(file).mode & 0o777).toBe(0o600)
    expect(statSync(secrets.folder).mode & 0o777).toBe(0o700)
    expect(secrets.kept("NETBOX_TOKEN")).toBe(TOKEN)
    expect(secrets.names()).toEqual(["NETBOX_TOKEN"])
  })

  test("named():  the environment's first, else the one kept;  none:  undefined", () => {
    const secrets = secretsIn({ FROM_ENV: "from the environment" })
    secrets.keep("FROM_ENV", "kept")
    secrets.keep("KEPT_ONLY", "kept only")
    expect(secrets.named("FROM_ENV")).toBe("from the environment")
    expect(secrets.named("KEPT_ONLY")).toBe("kept only")
    expect(secrets.named("NOWHERE")).toBeUndefined()
    expect(secrets.withEnvironment().KEPT_ONLY).toBe("kept only")
    expect("NOWHERE" in secrets.withEnvironment()).toBe(false)
  })

  test("a name that can't be an environment variable's, or an empty secret:  TypeError;  never read", () => {
    const secrets = secretsIn()
    expect(() => secrets.keep("../escape", "x")).toThrow(TypeError)
    expect(() => secrets.keep("EMPTY", "  ")).toThrow(TypeError)
    expect(secrets.kept("../escape")).toBeUndefined()
  })

  test("forget():  gone, and whether it was there", () => {
    const secrets = secretsIn()
    secrets.keep("NETBOX_TOKEN", TOKEN)
    expect(secrets.forget("NETBOX_TOKEN")).toBe(true)
    expect(secrets.forget("NETBOX_TOKEN")).toBe(false)
    expect(secrets.kept("NETBOX_TOKEN")).toBeUndefined()
  })

  test("never prints a secret:  only the names", () => {
    const secrets = secretsIn()
    secrets.keep("NETBOX_TOKEN", TOKEN)
    for (const shown of [String(secrets), JSON.stringify(secrets), inspect(secrets)]) {
      expect(shown).toContain("NETBOX_TOKEN")
      expect(shown).not.toContain(TOKEN)
    }
  })
})

describe("scrubbed()", () => {
  test("each secret replaced by its name, as written in JSON too", () => {
    const text = `token ${TOKEN}, and in JSON ${JSON.stringify({ key: "a\nb-long-secret" })}`
    const clean = SRV.scrubbed(text, [
      ["NETBOX_TOKEN", TOKEN],
      ["LINES", "a\nb-long-secret"]
    ])
    expect(clean).toBe('token [the key NETBOX_TOKEN], and in JSON {"key":"[the key LINES]"}')
    expect(SRV.scrubbed(TOKEN, [["NETBOX_TOKEN", TOKEN]], { word: "secret" })).toBe("[the secret NETBOX_TOKEN]")
  })

  test("an empty secret is left alone", () => {
    expect(SRV.scrubbed("text", [["EMPTY", ""]])).toBe("text")
  })
})
