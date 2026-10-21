#!/usr/bin/env node
/**
 * `spell-pack build | check [<folder>]`:  a component pack's build, or whether it's current -- the kit's pack tooling
 * (`element/tools/ComponentPack.ts`), from any folder of any repo of the kit.
 * - `<folder>`:  the pack's package, the folder of its `package.json`;  default the current folder.
 * - spell-epic and the brand build their packs with it (their `yarn pack:build` / `pack:check`);
 *   spell-app's `spell pack build` calls the same tool.
 * - Spell UI's `spell-ui-pack` until epic `repo-split` P10:  Spell UI's published bin ran files its package doesn't ship
 *   (C10);  the kit ships its source.
 * - Runs the tool's source through `tsx`, no build step, with the PACK's own `tsconfig.json` when it has one
 *   (else the tools' own):  the catalog imports the pack's vocabularies, whose `$/<pack>/...` imports resolve as the
 *   pack's own build resolves them.
 * - Exits 0 built or current, 1 stale or failed, 2 bad arguments.
 * - NOTE: a link to this file works (a repo's `node_modules/.bin`):  node runs the real path, so `import.meta.url`
 *   is in the kit's folder.
 */
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { register } from "tsx/esm/api"

/** The kit's element tools. */
const TOOLS = resolve(dirname(fileURLToPath(import.meta.url)), "..", "tools")

const args = process.argv.slice(2)
const ownConfig = join(resolve(args[1] ?? "."), "tsconfig.json")
register({ tsconfig: existsSync(ownConfig) ? ownConfig : join(TOOLS, "tsconfig.json") })
// then every `$/` import by its OWN repo's alias table (the toolchain's hook, epic `repo-split` I12):  a pack's catalog
// imports its vocabularies (`$/<pack>/...`), each by its own repo's table
await import("spell-kit/toolchain/aliases")
const { ComponentPack } = await import(pathToFileURL(join(TOOLS, "ComponentPack.ts")).href)
process.exitCode = await ComponentPack.main(args)
