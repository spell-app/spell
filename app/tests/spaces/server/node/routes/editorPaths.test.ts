import { describe, expect, test } from "vite-plus/test"

import { editorPageFor } from "spell/app/spaces/server/node/routes/editorPaths"

describe("editorPageFor():  the page an address opens (epic `solid-2-final` P12)", () => {
  test("the run page for /run/<project>, a site's page or a file of it;  the editor for every other", () => {
    expect(editorPageFor("/run/@spell/examples/Solitaire")).toBe("run.html")
    expect(editorPageFor("/run/@spell/examples/StarWarsSite/films/4")).toBe("run.html")
    expect(editorPageFor("/run/owen@spell/dashboard/home.spell")).toBe("run.html")
    expect(editorPageFor("/run/")).toBe("index.html")
    expect(editorPageFor("/edit/@spell/examples/Solitaire")).toBe("index.html")
    expect(editorPageFor("/runner/x")).toBe("index.html")
    expect(editorPageFor("/")).toBe("index.html")
  })
})
