/**
 * `<spell-reference-page>`'s texts in Spanish:  its labels (epic `data` P53).
 * - Texts only:  its tag, attributes and parts keep their English names.
 * - A person's words stay in the file's language (Q103).
 * - Gathered with the editor's Spanish into one chunk, `AppTexts.es.ts`, which only a Spanish page loads.
 */

import type { AppTagTexts } from "spell/app/app/ui/AppTexts"
import type { spellReferencePageVocabulary } from "./SpellReferencePage.en"

export const spellReferencePageEs = {
  lang: "es",
  tag: "spell-reference-page",
  texts: {
    loading: "Leyendo el lugar…",
    notFound:
      "Spell no encontró la descripción de una fuente de datos en {path}.\nRevisa la dirección, o vuelve a ejecutar spell place ingest para leer su descripción.",
    version: "Versión {version}",
    looked: "Visto el {date}",
    lists: "Listas",
    deployments: "Dónde funciona",
    deploymentsNone: "Tu proyecto no indica otro servidor para ella, así que Spell usa {address}.",
    notes: "Notas",
    agentNotes: "Conviene saber",
    verified: "Comprobada",
    verifiedWhy: "Spell la probó en el servidor real, y respondió como dice su descripción.",
    failed: "Falló",
    failedWhy: "Spell la probó en el servidor real, y no respondió como dice su descripción.",
    untyped: "Campos sin tipo",
    untypedWhy:
      "La descripción no dice qué tipo de información guarda cada campo.\nSpell lo completa cuando lee la fuente de datos.",
    disabled: "Desactivada",
    disabledWhy:
      "Tu archivo de Spell desactiva esta lista, así que nunca se prueba.\nQuita esa línea para volver a activarla.",
    unverified: "Sin probar",
    unverifiedWhy:
      "Spell solo ha leído sobre esta lista, y no la ha probado en el servidor real.\nEjecuta spell place verify para probarla.",
    tried: "probada el {date}",
    triedOn: "probada en {deployment}, el {date}",
    rows: "{count} filas leídas",
    failed401:
      "El servidor real pidió una clave, el código secreto que deja entrar a Spell.\nAgrégala junto a este servidor en el archivo __project.json5 de tu proyecto, y vuelve a probar con spell place verify.",
    failed403:
      "El servidor real no aceptó la clave, el código secreto que deja entrar a Spell.\nRevisa la clave en el archivo __project.json5 de tu proyecto, y vuelve a probar con spell place verify.",
    failed404:
      "Spell no encontró esta lista en el servidor real, en la dirección que tenía.\nRevisa la dirección en la descripción del lugar, y vuelve a probar con spell place verify.",
    failed5xx:
      "Algo falló en el servidor real, no en tu proyecto.\nEspera unos minutos, y vuelve a probar con spell place verify.",
    failedOther:
      "La respuesta del servidor real no fue la que Spell esperaba.\nPasa el puntero sobre esta línea para ver qué dijo.",
    listLeftOut: "Fuera del Spell:  {why}",
    changes: "Qué puede cambiar",
    fields: "Campos",
    name: "Nombre",
    address: "Dirección",
    key: "Clave",
    readOnly: "Solo lectura",
    yes: "sí",
    takes: "recibe {params}",
    calledInSpell: "en Spell se llama {words}",
    isId: "dice qué fila es cuál",
    linksTo: "enlaza con {target}",
    required: "obligatorio",
    setByServer: "lo pone el servidor",
    oneOf: "uno de {choices}",
    leftOut: "fuera del Spell",
    markNew: "Nuevo desde el {date}",
    markNewWhy: "Spell encontró esto la última vez que leyó la fuente de datos, el {date}.",
    markGone: "No está desde el {date}",
    markGoneWhy:
      "Spell no encontró esto la última vez que leyó la fuente de datos, el {date}.\nTu programa todavía lo usa, así que se queda hasta que lo quites.",
    editTip: "Haz clic con Opción para aclarar lo que dice de esto",
    editLabel: "Lo que dice de {name}",
    save: "Guardar",
    cancel: "Cancelar",
    editKeys: "⌘-Intro guarda.  Esc cancela.",
    notSaved:
      "No se guardó lo que escribiste, porque esta página no puede cambiar archivos.\nAbre la referencia desde la pestaña Datos del editor para cambiarlo.",
    saveFailed: "No se guardó lo que escribiste.\n{error}"
  }
} as const satisfies AppTagTexts<typeof spellReferencePageVocabulary>
