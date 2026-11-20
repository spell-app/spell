import type { E } from "spell/ui/core"

/**
 * `<ui-mermaid-diagram>` in Spanish:  `<es-diagrama-mermaid>`, with the names and texts only it uses
 * (from `UIMermaidDiagram.en.ts`).
 * - "diagrama" first, as Spanish puts the noun first;  Mermaid kept, a product name, as `<es-markdown>` keeps Markdown.
 * - The names it shares with other tags (`source`, `label`, `ui-changed` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - The themes' and layout engines' names (`forest`, `redux-color`, `elk`, `dagre`) stay as they are:  they're names.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const mermaidDiagramEs = {
  lang: "es",
  tag: "ui-mermaid-diagram",
  name: "diagrama-mermaid",
  aka: ["sirena", "diagrama", "diagrama de flujo", "gráfico", "diagrama de secuencia", "mapa mental", "cronología"],
  attributes: {
    theme: "tema",
    scheme: "esquema",
    look: "estilo",
    layout: "disposicion",
    seed: "semilla",
    controls: "controles",
    remember: "recordar"
  },
  values: {
    scheme: { auto: "automático" },
    look: { classic: "clásico", "hand-drawn": "a-mano" },
    layout: { auto: "automático" }
  },
  events: { "ui-drawn": "dibujado" },
  parts: { drawing: "dibujo", controls: "controles" },
  texts: {
    sourceLoading: "Cargando {source}",
    sourceLoadError: "No se pudo cargar {source}.",
    sourceCrossOrigin: "No se puede mostrar {source}:  solo se pueden mostrar archivos de este sitio.",
    sourceFileProtocol:
      "No se puede cargar {source}:  esta página se abrió desde el disco.  Ábrela desde un servidor web para verla.",
    sourceRenderError: "No se pudo mostrar {source}.",
    mermaidCantDraw: "No se pudo dibujar este diagrama.",
    mermaidStoppedAt: "Su texto tiene un error en la línea {line}.",
    mermaidExpected: "Puede que falte algo como {expected} ahí.",
    mermaidUnknownKind:
      "Empieza el texto con el tipo de diagrama, en una línea propia:  por ejemplo, flowchart TD para cajas y flechas.",
    mermaidOr: "o",
    mermaidFixIt: "Corrige esa línea y el diagrama vuelve.",
    mermaidLabel: "Diagrama:  {kind}",
    mermaidMenu: "Colores del diagrama",
    mermaidColors: "Tema de color",
    mermaidSpellTheme: "Spell (los colores de este sitio)",
    mermaidLightOrDark: "Claro u oscuro",
    mermaidAuto: "Como la página",
    mermaidLight: "Claro",
    mermaidDark: "Oscuro",
    mermaidPutBack: "Volver a como estaba"
  }
} as const satisfies E.TagDictionary
