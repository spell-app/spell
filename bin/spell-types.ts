#!/usr/bin/env node
/**
 * `spell-types [--below] [--clean]`:  a package's declarations, for the repos above its repo (epic `repo-split` I12):
 * `Declarations` (`spell/toolchain/declarations`) says what it does;
 *   its entry, `spell/toolchain/typesMain`, runs it.
 * - Node runs it as is (types stripped):  every package's `yarn ts` runs it, through its `node_modules/.bin`.
 * - NOTE: a link to this file works:  node runs the real path, so its import below resolves from the kit.
 */
import "spell/toolchain/typesMain"
