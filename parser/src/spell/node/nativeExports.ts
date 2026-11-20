/**
 * Node's reader of a project's javascript or TypeScript code file, for `call native` (epic `from-console` P10):
 * its exported functions, read from its syntax tree by the kit's TypeScript reader (`readTypeScript()`).
 * - SIDE EFFECT:  importing it puts `exportedFunctionsIn()` in as `SP.NativeCode.readers.js`,
 *   in place of the browser's reading of `export function` lines.
 * - A node program that compiles projects imports it:  the `spell` command's language commands do.
 * - Node only:  the barrel never exports it.
 */
import { readTypeScript, type SourceNode } from "spell/util/node/typescript"
import { SP } from "spell/parser/spell"

/**
 * Every function `text`, the code file `path`, exports:
 * - `export function name()`, `export async function name()`
 * - `export const name = (...) => ...`, `= async (...) =>`, `= function ...`
 * - Each waits if it's `async`, or says it gives back a `Promise<...>`.
 * - NEVER throws:  what doesn't parse exports what the reader could read.
 */
export function exportedFunctionsIn(path: string, text: string): SP.NativeFunction[] {
  const source = readTypeScript(path, text)
  const found: SP.NativeFunction[] = []
  for (const statement of (source.program.body as SourceNode[] | undefined) ?? []) {
    if (statement.type !== "ExportNamedDeclaration") continue
    const declaration = statement.declaration as SourceNode | undefined
    if (declaration?.type === "FunctionDeclaration") {
      const name = (declaration.id as { name?: string } | undefined)?.name
      if (name) found.push({ name, waits: waits(declaration, text) })
    } else if (declaration?.type === "VariableDeclaration") {
      for (const each of (declaration.declarations as SourceNode[] | undefined) ?? []) {
        const init = each.init as SourceNode | undefined
        const name = (each.id as { name?: string } | undefined)?.name
        if (name && init && FUNCTION_NODES.has(init.type)) found.push({ name, waits: waits(init, text) })
      }
    }
  }
  return found
}

/** The kinds of node a function is. */
const FUNCTION_NODES = new Set(["FunctionExpression", "ArrowFunctionExpression"])

/** Does `fn` wait:  `async`, or its return type a `Promise<...>`? */
function waits(fn: SourceNode, text: string): boolean {
  if (fn.async) return true
  const returnType = fn.returnType as SourceNode | undefined
  return !!returnType && /^\s*:?\s*Promise\s*</.test(text.slice(returnType.start, returnType.end))
}

SP.NativeCode.readers.js = exportedFunctionsIn
