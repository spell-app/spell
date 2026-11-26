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

  test("an org group's address:  the run page when the group holds its own page;  else the editor's page of it (P47)", () => {
    const folders = {
      isGroup: (group: string) => ["@acme/org-spell", "@acme/portal"].includes(group),
      hasOwnPage: (group: string) => group === "@acme/portal"
    }
    expect(editorPageFor("/@acme/portal", folders)).toBe("run.html")
    expect(editorPageFor("/run/@acme/portal/", folders)).toBe("run.html")
    expect(editorPageFor("/@acme/org-spell", folders)).toBe("index.html")
    expect(editorPageFor("/run/@acme/org-spell", folders)).toBe("index.html")
    expect(editorPageFor("/run/@acme", folders)).toBe("index.html")
    expect(editorPageFor("/@acme", folders)).toBe("index.html")
    // a project in a group, an org's own program, edits:  as before
    expect(editorPageFor("/run/@acme/org-spell/dashboard", folders)).toBe("run.html")
    expect(editorPageFor("/run/@rs/OrgAdmin", folders)).toBe("run.html")
    expect(editorPageFor("/edit/@acme/portal", folders)).toBe("index.html")
    expect(editorPageFor("/@acme/portal")).toBe("index.html")
  })

  test("`?editor`:  the editor, whatever the address -- its own tab loaded again in Run (I364)", () => {
    expect(editorPageFor("/run/@spell/examples/Solitaire?editor")).toBe("index.html")
    expect(editorPageFor("/run/@spell/examples/Solitaire?x=1&editor")).toBe("index.html")
    expect(editorPageFor("/run/@spell/examples/Solitaire?editors")).toBe("run.html")
    expect(editorPageFor("/run/@spell/examples/Solitaire?x=1")).toBe("run.html")
    expect(editorPageFor("/@acme/portal?editor", { isGroup: () => true, hasOwnPage: () => true })).toBe("index.html")
  })
})
