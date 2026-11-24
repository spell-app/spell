import type { RouteModule } from "spell/server/page"
import { CodeOnServer } from "./CodeOnServer.server"
import { MermaidOnServer } from "./MermaidOnServer.server"

/**
 * Spell UI's route module (its part of the page server's settings, `"pageServer": { "routes" }`):
 * what its elements show, drawn ahead on the page server (`SRV.Drawings`, epic `solid-2-final` P15).
 * - `<ui-code>`'s colours:  `CodeOnServer`, highlight.js in the server's process
 * - `<ui-mermaid-diagram>`'s diagrams:  `MermaidOnServer`, in a headless page
 *   - that page, at `MermaidOnServer.PAGE`:  the site bundle's sheet and its `drawings.js` entry, nothing else
 *     (`site/_src/drawings.ts`);  the bundle is the page server's to build (`"bundles"`, `site/_assets`)
 * - A server with no drawings (spell-epic's own) skips it all.
 */
const drawingRoutes: RouteModule = {
  name: "ui drawings",
  setup({ router, drawings, info }) {
    if (!drawings) return
    drawings.add(new CodeOnServer())
    drawings.add(new MermaidOnServer({ serverUrl: () => `http://127.0.0.1:${info.port}` }))
    router.get(MermaidOnServer.PAGE, (_request, reply) => reply.noStore().type("text/html").send(PAGE_HTML))
  }
}
export default drawingRoutes

/** The headless page Mermaid draws in:  Spell UI's site sheet and the drawings entry, from its component set. */
const PAGE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Spell UI drawings</title>
    <link rel="stylesheet" href="/components/ui/_assets/site.css" />
  </head>
  <body>
    <script type="module" src="/components/ui/_assets/drawings.js"></script>
  </body>
</html>
`
