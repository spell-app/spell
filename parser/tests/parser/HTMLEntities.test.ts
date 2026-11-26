import { decodeHTMLStrict } from "entities/decode"
import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"

describe("P.HTMLEntities", () => {
  test("decode() reads every name HTML knows, once the table is in", () => {
    // the tests load it up front (`htmlEntitiesUpFront`, through `spell/parser/spell/languages/all`)
    expect(P.HTMLEntities.decode("&copy; &frac34; &Dcaron; &amp;amp; &nosuch; &copy")).toBe(
      "© ¾ Ď &amp; &nosuch; &copy"
    )
  })

  test("decodeBasic() reads numbers and the common names as the table does", () => {
    const texts = [
      "a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos; f&nbsp;g",
      "&#123; &#x7B; &#X7b; &#35; &#0; &#128; &#x9f; &#xD800; &#1114112; &#99999999999;",
      "no references here, & not one;  &#; &#x; &1;"
    ]
    for (const text of texts) expect(P.HTMLEntities.decodeBasic(text)).toBe(decodeHTMLStrict(text))
  })

  test("decodeBasic() leaves any other name as it is", () => {
    expect(P.HTMLEntities.decodeBasic("&copy; &amp;")).toBe("&copy; &")
  })
})
