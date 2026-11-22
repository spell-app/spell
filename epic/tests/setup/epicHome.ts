/**
 * Every `node` test file's EPIC HOME (epic `epic-friend` P2):  a scratch folder of its own, never the machine's
 * `~/.spell-epic`, its person kept as "Owen", its agent Claude.
 * - why:  what the tools write names the machine's person (`EpicHome.personName()`:  the kept name, else git's), so
 *   without it a test's output would say whoever runs it, and a test writing into the home would write into theirs
 * - a test that wants another home or person sets `$SPELL_EPIC_HOME` itself, as `PersonCommands.test.ts` does:  its
 *   own module runs after this
 * - and Codex's folders scratch ones too (`$CODEX_HOME`, `$SPELL_EPIC_AGENTS_HOME`):  `epic plugin install --codex` writes
 *   there, and a test that forgot its own once linked skills into the machine's `~/.agents/skills` (epic `epic-friend` I10)
 * - and Claude Code's:  a scratch `$CLAUDE_CONFIG_DIR`, and `$CLAUDE_PID` naming no process, so whether a plugin is on
 *   (`ClaudeHome.isPluginEnabled()`) never depends on the machine's settings or the session running the tests
 *   (epic `epic-engine` I318:  `epic init` asks about superpowers when it's on)
 * - run before each file (the `node` project's `setupFiles`)
 */
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** The person every test's tools write as, unless the test says otherwise. */
const TEST_PERSON = "Owen"

/** The agent every test's tools write as, unless the test says otherwise. */
const TEST_AGENT = "claude"

const home = mkdtempSync(join(tmpdir(), "epic-home-"))
writeFileSync(join(home, "person.json5"), `{ name: "${TEST_PERSON}" }\n`)
process.env.SPELL_EPIC_HOME = home
// and no `gh` to ask:  a test never looks the machine's person up on GitHub (`EpicHome.refreshGithub()`)
process.env.SPELL_EPIC_GH = join(home, "no-gh")
// and the agent named, so what an agent writes is Claude's whichever agent runs the tests (`EpicHome.agent()`, epic
// `epic-friend` P10:  under Codex, its mark would say `codex`)
process.env.SPELL_EPIC_AGENT = TEST_AGENT
// and Codex's folders (`CodexHome`):  its hooks file and agents, and the skills it lists, never the machine's
process.env.CODEX_HOME = join(home, "codex")
process.env.SPELL_EPIC_AGENTS_HOME = join(home, "agents")
// and the editor named (`Editor`, epic `epic-friend` P16):  VS Code, whichever editor's terminal runs the tests, so
// what a test prints never depends on it;  a test of `Editor` hands in its own environment
process.env.SPELL_EPIC_EDITOR = "code"
// and Claude Code's folder and session (`ClaudeHome`):  no plugin on, no command line, whoever runs the tests
process.env.CLAUDE_CONFIG_DIR = join(home, "claude")
process.env.CLAUDE_PID = "0"
// and no epic plugin guides (`EpicConfig.pluginGuides()`, epic `epic-engine` T130):  a scratch repo's guide lists hold
// only its own, never the kit's `epic/guides/`;  a test of them names its own folder
process.env.SPELL_EPIC_PLUGIN_GUIDES = ""
