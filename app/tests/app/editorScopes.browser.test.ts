import { afterEach, describe, expect, test } from "vite-plus/test"

import type { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"
import { editor } from "spell/app/app/editor"

/**
 * The Types tab's tree and each node's details, as the editor asks for them (epic `solid-2-final` T36):
 * of the code's language service (`editor.askLanguage`), the language worker's where it parses the project,
 * never the page's own parse.
 * - The project is a stand-in with no parse at all:  only the language service can answer.
 */
describe("the Types tab, asked of the language service", () => {
  const before = { project: editor.project, file: editor.file, ask: editor.askLanguage, tree: editor.scopeTree }

  afterEach(() => {
    editor.askLanguage = before.ask
    editor.project = before.project
    editor.file = before.file
    editor.scopeTree = before.tree
  })

  test("the tree after a compile, and a node's details as it's shown", async () => {
    const project = { path: "owen@spell/types-tab", spellFiles: [] as unknown[] } as unknown as SP.SpellProject
    const file = { path: "owen@spell/types-tab/Card.spell", project }
    ;(project.spellFiles as unknown[]).push(file)
    const tree = { path: "", kind: "root", name: "", children: [] } as unknown as LSP.ScopeNode
    const asked: string[] = []
    editor.askLanguage = (async (on: { path: string }, method: string, params: { path?: string }) => {
      asked.push(`${method} ${on.path}${params.path ? ` ${params.path}` : ""}`)
      return method === "spell/scopes" ? tree : { line: 3 }
    }) as typeof editor.askLanguage
    editor.project = project
    // the page's own explorer is there, as it is once the code editor loads:  it isn't asked
    editor.setScopeExplorer({
      tree: () => ({ path: "the page's own" }),
      details: () => null
    } as unknown as LSP.ScopeExplorer)
    await editor.refreshScopes()
    expect(editor.scopeTree).toBe(tree)
    expect(await editor.scopeDetails("type:Card")).toEqual({ line: 3 })
    expect(asked).toContain("spell/scopes owen@spell/types-tab/Card.spell")
    expect(asked).toContain("spell/scopeDetails owen@spell/types-tab/Card.spell type:Card")
  })
})
