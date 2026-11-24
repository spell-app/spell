import type { SemanticTokens, SemanticTokensDelta, SemanticTokensEdit } from "vscode-languageserver-types"

/****************
 * ### `SemanticTokensBuilder`
 * Collects one file's semantic tokens, and answers a full set or the edits since the last one.
 * - The language service's colours for VS Code (`SpellLanguageService.semanticTokens()` and its delta), as
 *   `vscode-languageserver`'s own builder does:  ported from it (MIT, Microsoft), with the same results.
 * - Our own copy, so the editor's language worker and the page's language chunk import only
 *   `vscode-languageserver-types` (plain values and types), never the language server itself:  that package's
 *   protocol, message layer and server were about 170 KB of the worker, before compression
 *   (epic `solid-2-final` P19, Q35).
 * - Tokens are kept delta-encoded, as the protocol sends them:  5 numbers each (line, character, length, type,
 *   modifiers), the line and character relative to the token before.
 *   - Pushed out of order, they're kept plain and sorted when built.
 ****************/
export class SemanticTokensBuilder {
  /** This build's result id:  the delta the client asks for names the result it has */
  private resultId = ""
  /** The last token's line, for the delta encoding */
  private previousLine = 0
  /** The last token's character, for the delta encoding */
  private previousCharacter = 0
  /** Have the tokens come in order, so `data` is delta-encoded as they come? */
  private isSortedAndDeltaEncoded = true
  /** The tokens, delta-encoded:  while they come in order */
  private data: number[] = []
  /** The tokens, plain:  once one came out of order */
  private plainData: number[] = []
  /** How many numbers are pushed:  5 a token */
  private dataLength = 0
  /** The tokens of the result a client asked to diff against, delta-encoded:  `buildEdits()` diffs against them */
  private previousData: number[] | undefined = undefined

  constructor() {
    this.initialize()
  }

  /** Start a new set of tokens, with a new result id. */
  private initialize(): void {
    this.resultId = String(Date.now())
    this.previousLine = 0
    this.previousCharacter = 0
    this.data = []
    this.plainData = []
    this.dataLength = 0
    this.isSortedAndDeltaEncoded = true
  }

  /** Add one token:  its line and character (zero-based), its length, its type's and its modifiers' numbers. */
  push(line: number, character: number, length: number, tokenType: number, tokenModifiers: number): void {
    const outOfOrder = line < this.previousLine || (line === this.previousLine && character < this.previousCharacter)
    if (this.isSortedAndDeltaEncoded && outOfOrder) {
      this.isSortedAndDeltaEncoded = false
      this.plainData = deltaDecoded(this.data)
    }
    let pushLine = line
    let pushCharacter = character
    if (this.isSortedAndDeltaEncoded && this.dataLength > 0) {
      pushLine -= this.previousLine
      if (pushLine === 0) pushCharacter -= this.previousCharacter
    }
    const target = this.isSortedAndDeltaEncoded ? this.data : this.plainData
    target[this.dataLength++] = pushLine
    target[this.dataLength++] = pushCharacter
    target[this.dataLength++] = length
    target[this.dataLength++] = tokenType
    target[this.dataLength++] = tokenModifiers
    this.previousLine = line
    this.previousCharacter = character
  }

  /**
   * Start again for a client that has result `resultId`:  if it's ours, the next `buildEdits()` answers the edits
   * since it;  else it answers a full set.
   */
  previousResult(resultId: string): void {
    this.previousData = this.resultId === resultId ? this.finalData() : undefined
    this.initialize()
  }

  /** The full set of tokens. */
  build(): SemanticTokens {
    this.previousData = undefined
    return { resultId: this.resultId, data: this.finalData() }
  }

  /** Can `buildEdits()` answer edits, rather than a full set? */
  canBuildEdits(): boolean {
    return this.previousData !== undefined
  }

  /** The edits since the result `previousResult()` named, or the full set when there's none. */
  buildEdits(): SemanticTokens | SemanticTokensDelta {
    if (this.previousData === undefined) return this.build()
    return { resultId: this.resultId, edits: tokenEdits(this.previousData, this.finalData()) }
  }

  /** The tokens, delta-encoded and in order. */
  private finalData(): number[] {
    return this.isSortedAndDeltaEncoded ? this.data : sortedAndDeltaEncoded(this.plainData)
  }
}

/** Delta-encoded tokens `data`, as plain ones:  each token's line and character its own. */
function deltaDecoded(data: number[]): number[] {
  const result: number[] = []
  let previousLine = 0
  let previousCharacter = 0
  for (let at = 0; at + 4 < data.length; at += 5) {
    let line = data[at]!
    let character = data[at + 1]!
    if (line === 0) {
      line = previousLine
      character += previousCharacter
    } else line += previousLine
    result.push(line, character, data[at + 2]!, data[at + 3]!, data[at + 4]!)
    previousLine = line
    previousCharacter = character
  }
  return result
}

/** Plain tokens `data`, sorted by place and delta-encoded. */
function sortedAndDeltaEncoded(data: number[]): number[] {
  const order = Array.from({ length: Math.floor(data.length / 5) }, (_, index) => index)
  order.sort((a, b) => data[5 * a]! - data[5 * b]! || data[5 * a + 1]! - data[5 * b + 1]!)
  const result: number[] = []
  let previousLine = 0
  let previousCharacter = 0
  for (const index of order) {
    const at = 5 * index
    const line = data[at]!
    const character = data[at + 1]!
    const pushLine = line - previousLine
    result.push(
      pushLine,
      pushLine === 0 ? character - previousCharacter : character,
      data[at + 2]!,
      data[at + 3]!,
      data[at + 4]!
    )
    previousLine = line
    previousCharacter = character
  }
  return result
}

/** The one edit that turns token data `original` into `modified`:  none when they're the same. */
function tokenEdits(original: number[], modified: number[]): SemanticTokensEdit[] {
  let start = 0
  while (start < modified.length && start < original.length && original[start] === modified[start]) start++
  if (start < modified.length && start < original.length) {
    let originalEnd = original.length - 1
    let modifiedEnd = modified.length - 1
    while (originalEnd >= start && modifiedEnd >= start && original[originalEnd] === modified[modifiedEnd]) {
      originalEnd--
      modifiedEnd--
    }
    // moved behind the start:  forward again
    if (originalEnd < start || modifiedEnd < start) {
      originalEnd++
      modifiedEnd++
    }
    const deleteCount = originalEnd - start + 1
    const data = modified.slice(start, modifiedEnd + 1)
    // moved behind the start, we could have missed a plain delete
    if (data.length === 1 && data[0] === original[originalEnd]) return [{ start, deleteCount: deleteCount - 1 }]
    return [{ start, deleteCount, data }]
  }
  if (start < modified.length) return [{ start, deleteCount: 0, data: modified.slice(start) }]
  if (start < original.length) return [{ start, deleteCount: original.length - start }]
  return []
}
