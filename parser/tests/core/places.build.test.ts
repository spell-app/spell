import { build } from "esbuild"
import { expect, test } from "vite-plus/test"

import { sourceNames } from "spell/toolchain/sourceNames"

/** `code`, built as a bundle from the kit's source:  its text. */
async function bundled(code: string): Promise<string> {
  const { outputFiles } = await build({
    stdin: { contents: code, resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
    external: ["solid-js", "@solidjs/*"],
    plugins: [sourceNames()]
  })
  return outputFiles[0]!.text
}

test("a built app leaves the sample out:  all of what it loads for places carries none of it", async () => {
  const app = await bundled(`
    import { Places, MemoryPlace } from "spell/util/places"
    import { PlaceThings } from "spell/parser/core/places"
    const places = new Places().add("cookbook", new MemoryPlace())
    console.log(new PlaceThings({ places, classNamed: () => undefined }), places.originOf({}, "title"))
  `)
  expect(app).toContain("originOf")
  expect(app).not.toContain("SamplePlace")
  expect(app).not.toContain("spell-samples")
  expect(app).not.toContain("rowsMadeFrom")
})

test("the test can tell:  the editor's own bundle does carry it", async () => {
  const editor = await bundled(`
    import { useSample } from "spell/util/places/SamplePlace"
    import { rowsMadeFrom } from "spell/parser/core/placeSamples"
    console.log(useSample, rowsMadeFrom)
  `)
  expect(editor).toContain("spell-samples")
  expect(editor).toContain("rowsMadeFrom")
})
