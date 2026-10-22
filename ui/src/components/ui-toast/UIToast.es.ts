import type { E } from "spell-ui/core"

/**
 * `<ui-toast>` in Spanish:  `<es-notificacion>`, its own names and texts (`UIToast.en.ts`'s).
 * - The names it shares with other tags (`size`, `color`, `ui-change` ...) are Spanish's own file's:
 *   `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const toastEs = {
  lang: "es",
  tag: "ui-toast",
  name: "notificacion",
  aka: ["notificación", "aviso emergente", "toast", "mensaje flash", "snackbar"],
  attributes: {
    type: "tipo",
    message: "mensaje",
    "close-on-click": "cerrar-al-pulsar",
    progress: "progreso",
    "progress-up": "progreso-ascendente",
    "pause-on-hover": "pausar-al-pasar",
    actions: "acciones"
  },
  parts: { toast: "notificacion" },
  texts: { close: "Cerrar", notifications: "Notificaciones" }
} as const satisfies E.TagDictionary
