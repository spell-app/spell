/**
 * A saved type's `- it lives in <place>` (`SavedInPlace`), when the place's name is several words holding `of` / `del`
 * (epic `language` I71).
 * - Lista de Tareas' `vive en almacén del navegador` was reported as not parsing;
 *   these hold it, with and without the `- `, beside its English twin.
 */
import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** What `lines` compile to, in the file at `path`. */
function compiled(lines: string[], path: string) {
  const { compiled: code, errors } = parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
  return { code: code ?? "", errors }
}

describe("a saved type's place, by a name of several words", () => {
  for (const line of [`\t- vive en almacén del navegador`, `\tvive en almacén del navegador`]) {
    test(`Spanish:  ${JSON.stringify(line.trim())}`, () => {
      const { code, errors } = compiled(
        [
          `almacén del navegador se guarda en este dispositivo`,
          `una "tarea del navegador" es una cosa`,
          line,
          `\tsu "título" es texto`
        ],
        "/T.es.spell"
      )
      expect(errors).toEqual([])
      expect(code).toContain(`place: "almacén_del_navegador"`)
      expect(code).toContain(`collection: "tareas_del_navegador"`)
    })
  }

  test("Spanish:  `el almacén del navegador`, with its article", () => {
    const { code, errors } = compiled(
      [
        `almacén del navegador se guarda en este dispositivo`,
        `una "tarea del navegador" es una cosa`,
        `\tvive en el almacén del navegador`
      ],
      "/T.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`place: "almacén_del_navegador"`)
  })

  test("English twin:  `it lives in browser storage`", () => {
    const { code, errors } = compiled(
      [`browser storage is stored on this device`, `a "browser task" is a thing`, `\t- it lives in browser storage`],
      "/T.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain(`place: "browser_storage"`)
  })
})
