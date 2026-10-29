/**
 * Every `node` test file's EPIC HOME (epic `epic-friend` P2):  a scratch folder of its own, never the machine's
 * `~/.spell-epic`, its person kept as "Owen".
 * - why:  what the tools write names the machine's person (`EpicHome.personName()`:  the kept name, else git's), so
 *   without it a test's output would say whoever runs it, and a test writing into the home would write into theirs
 * - a test that wants another home or person sets `$SPELL_EPIC_HOME` itself, as `PersonCommands.test.ts` does:  its
 *   own module runs after this
 * - run before each file (the `node` project's `setupFiles`)
 */
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** The person every test's tools write as, unless the test says otherwise. */
const TEST_PERSON = "Owen"

const home = mkdtempSync(join(tmpdir(), "epic-home-"))
writeFileSync(join(home, "person.json5"), `{ name: "${TEST_PERSON}" }\n`)
process.env.SPELL_EPIC_HOME = home
// and no `gh` to ask:  a test never looks the machine's person up on GitHub (`EpicHome.refreshGithub()`)
process.env.SPELL_EPIC_GH = join(home, "no-gh")
