import { afterEach, describe, expect, test } from "vite-plus/test"

import { SpellSetup } from "spell/parser/spell/SpellSetup"
import { SPACES } from "spell/app/spaces"
import { LanguageClient, type LanguageWorkerMessage } from "spell/app/app/ui/codemirror/LanguageClient"
import type { LSP } from "spell/app/lsp"

/**
 * The language worker learns the page's person and their org's own groups before anything else:  its own copy of
 * spaces' models knows only spell's, and would take `@acme/tools/dashboard` for the org's program `tools`.
 */
describe("LanguageClient.inWorker():  the page's groups first", () => {
  const was = { id: SPACES.localPerson.id, org: SPACES.localPerson.org }
  afterEach(() => {
    SPACES.setLocalPerson(was)
    delete SpellSetup.projectRoots["@acme/tools" as never]
    SPACES.orgGroups.splice(SPACES.orgGroups.indexOf("@acme/tools" as never), 1)
  })

  test("its first message names the person and the org's groups the page was told", () => {
    SPACES.setLocalPerson({ id: "alice", org: "acme" })
    SPACES.addOrgGroups(["@acme/tools"])
    const sent: LanguageWorkerMessage[] = []
    const worker = { addEventListener() {}, postMessage: (message: LanguageWorkerMessage) => sent.push(message) }
    LanguageClient.inWorker({} as LSP.SpellLanguageService, worker as unknown as Worker)
    expect(sent).toEqual([{ kind: "groups", person: { id: "alice", org: "acme" }, orgGroups: ["@acme/tools"] }])
  })
})
