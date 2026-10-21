#!/usr/bin/env node
/**
 * `spell-folders <check> [folder ...]`:  a package's own checks, folder by folder, for a package of several folders
 * (the kit, spell-lang, spell-app):  `FolderChecks`, in `../src/folders.ts`, says what it does.
 * - Node runs it as is (types stripped):  each such package's `yarn ts | test | lint ...` runs it, through its
 *   `node_modules/.bin` (the kit's own through this path).
 * - NOTE: a link to this file works:  node runs the real path, so its import below is in the toolchain's folder.
 */
import { FolderChecks } from "../src/folders.ts"

process.exitCode = FolderChecks.main(process.argv.slice(2))
