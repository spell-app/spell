import { DiagnosticSeverity, type Diagnostic, type DocumentSymbol, type Range } from "vscode-languageserver-types"

import type { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"

/****************
 * ### `HostNameCheck`
 * The names a project's HOST fills by name, checked as its code is edited (epic `editor` I123):
 * a type or a member on the host's list that the code no longer declares is an error, under the type it's missing from.
 * - e.g. the editor's own Spell, `@spell/editor/spell-editor`:  the editor writes `code is showing` itself,
 *   so renaming it there would stop the editor's View › Code tick, with nothing said.
 * - The host hands the service its lists (`SpellLanguageService.hostNames`);  a project no list names is never checked.
 * - Knows nothing about any host:  the names, and what the message says, are the host's.
 * - Reads the project's declarations as the outline does (`documentSymbols()`), from every file of the project:
 *   a type may be declared in any of them.
 ****************/
export class HostNameCheck {
  /**
   * The errors for `file`, from `service`'s host lists:
   * - each member a listed type no longer declares, under that type's name
   * - each listed type no file declares, on the project's first file's first line
   * - none for a project no list names
   * - NEVER throws
   */
  static diagnostics(service: LSP.SpellLanguageService, file: SP.SpellFile): Diagnostic[] {
    const list = service.hostNames.find((it) => it.project === file.project.path)
    if (!list || !file.match) return []
    const declared = HostNameCheck.typesIn(service, file.project)
    const error = (range: Range, words: string): Diagnostic => ({
      range,
      severity: DiagnosticSeverity.Error,
      source: HOST_NAMES_SOURCE,
      message: list.messageFor(words)
    })
    return Object.values(list.types).flatMap((type): Diagnostic[] => {
      const found = declared.get(HostNameCheck.key(type.words))
      if (!found) return file === file.project.spellFiles[0] ? [error(FIRST_LINE, type.words)] : []
      if (found.file !== file) return []
      const members = new Set((found.symbol.children ?? []).map((member) => HostNameCheck.key(member.name)))
      return Object.values(type.members)
        .filter((member) => !members.has(HostNameCheck.key(member.words)))
        .map((member) => error(found.symbol.selectionRange, member.words))
    })
  }

  /** Every type `project` declares, by its words (`key()`), with the file it's in and its outline symbol. */
  private static typesIn(service: LSP.SpellLanguageService, project: SP.SpellProject) {
    const types = new Map<string, { file: SP.SpellFile; symbol: DocumentSymbol }>()
    for (const file of project.spellFiles) {
      for (const symbol of service.documentSymbols(file)) types.set(HostNameCheck.key(symbol.name), { file, symbol })
    }
    return types
  }

  /** `words` as compared:  lower case, one space between words (the outline writes a type's first letter capital). */
  private static key(words: string): string {
    return words.trim().replace(/\s+/g, " ").toLowerCase()
  }
}

/** The `source` of `HostNameCheck`'s errors. */
export const HOST_NAMES_SOURCE = "host names"

/** Where an error about a type no file declares goes:  the first line. */
const FIRST_LINE: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: Number.MAX_SAFE_INTEGER } }

////////////////
// ## Types
////////////////

/**
 * The names a host fills by name in one of its projects:  e.g. the editor's, for its own Spell (`EDITOR_NAMES`).
 * - Handed to the service by the host (`SpellLanguageService.hostNames`).
 */
export type HostNames = {
  /** the project the names are in:  `@spell/editor/spell-editor` */
  project: string
  /** each type the host reads or fills, by the name its code knows it by (`FileTabBar`) */
  types: Readonly<Record<string, HostType>>
  /**
   * What the error says about a name the code no longer declares, `words`, in the host's words:
   * "The editor fills `code is showing` itself. ..."
   */
  messageFor: (words: string) => string
}

/** A type a host reads or fills, and the members of it the host needs. */
export type HostType = {
  /** its name as the code writes it:  `file tab bar` */
  words: string
  /** what the host uses it for */
  for: string
  /** each member the host reads or fills, by the name its code knows it by (`rememberAs`) */
  members: Readonly<Record<string, HostMember>>
}

/** A member of a type that a host reads or fills:  a property, or an action the host does. */
export type HostMember = {
  /** its name as the code writes it:  `remember as`;  an action's, `show it` */
  words: string
  /** what the host uses it for */
  for: string
}
