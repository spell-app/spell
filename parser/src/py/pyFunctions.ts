import { P } from "spell/parser/parser"

/**
 * The functions a Python code file defines, read from its text:  each top-level `def` and `async def`.
 * - So Spell can call one, `call native copyText with text`:  `SP.NativeCode` looks it up here by Python's name,
 *   `copy_text`.
 * - Plain TypeScript:  no Python tooling, so it reads in a browser too.
 * - Only lines starting a top-level definition count, at the start of a line:
 *   a method (indented), a nested function, a `def` inside a string or a comment don't.
 * - A name starting `_` is private, as Python's own `from x import *` treats it:  left out.
 * - NEVER throws.
 */
export function pyFunctionsOf(text: string): PyFunction[] {
  const functions: PyFunction[] = []
  for (const [, isAsync, name] of text.matchAll(TOP_LEVEL_DEF)) {
    if (!name!.startsWith("_")) functions.push({ name: name!, waits: !!isAsync })
  }
  return functions
}

/** A top-level `def name(` or `async def name(`, at the start of a line. */
const TOP_LEVEL_DEF = /^(async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm

/** One function a Python code file defines -- see `pyFunctionsOf()`. */
export type PyFunction = {
  /** Its name, as Python says it:  `copy_text`. */
  name: string
  /** Is it `async def`?  Then every call of it is awaited. */
  waits: boolean
}

/**
 * A code file's function, as Python names it:  its name in Python's case, through the writers' shared naming,
 * `copyText` => `copy_text`.
 * - What `call native` says, written in Python;  and what a `.py` file is looked up by (`SP.NativeCode`).
 * - Here, not only on `PyBaseWriter`:  `SP.NativeCode` reads it while parsing, so a program that never compiles to
 *   Python loads none of its writers (epic `solid-2-final` P19).
 */
export function pyNativeName(name: string): string {
  return PYTHON_NAMING.nameOf(name, "method")
}

/** Python's names, PEP 8's:  what a native call's name is written in -- see `pyNativeName()`. */
const PYTHON_NAMING = new P.Naming(P.Naming.PYTHON, P.Naming.PYTHON_CLASHES)
