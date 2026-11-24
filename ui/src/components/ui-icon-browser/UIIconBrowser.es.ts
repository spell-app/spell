import type { E } from "spell/ui/core"

/**
 * `<ui-icon-browser>` in Spanish:  `<es-explorador-iconos>`, with the names and texts only it uses
 * (from `UIIconBrowser.en.ts`).
 * - The names it shares with other tags (`grid`, `search`, `loading` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - `pack`'s values are pack ids, never translated.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const iconBrowserEs = {
  lang: "es",
  tag: "ui-icon-browser",
  name: "explorador-iconos",
  aka: ["galería de iconos", "lista de iconos", "buscador de iconos", "catálogo de iconos"],
  attributes: { pack: "paquete", query: "consulta", address: "direccion", pick: "elegir" },
  parts: {
    packs: "paquetes",
    usage: "uso",
    count: "cuenta",
    copied: "copiado",
    tile: "casilla",
    glyph: "glifo",
    name: "nombre"
  },
  texts: {
    packs: "Paquete de iconos",
    packFree: "FA7 Free",
    packBrands: "FA7 Brands",
    packFomantic: "Fomantic",
    searchLabel: "Buscar iconos",
    searchPlaceholder: "Buscar iconos, como flecha, correo o corazón",
    usageFree: "El paquete por defecto:  todas las páginas lo tienen.",
    usageBrands: "Para usarlo en una página, añade {markup}, o ejecuta {script}.",
    usageFomantic:
      "Para usarlo en una página, añade {markup}.  Algunos nombres, como {examples}, están en los dos:  esa página usa el icono de este.",
    loading: "Cargando iconos…",
    count: "Mostrando {matches} de {total} iconos",
    copied: "Copiado el nombre «{name}».  Ya puedes pegarlo.",
    notCopied: "No se pudo copiar «{name}».  Selecciona el nombre y cópialo tú.",
    copyTip: "Copiar «{name}»",
    copyTipAlso: "Copiar «{name}».  También:  {others}",
    grid: "Iconos",
    noMatches: "Ningún icono coincide",
    dialogTitle: "Iconos"
  }
} as const satisfies E.TagDictionary
