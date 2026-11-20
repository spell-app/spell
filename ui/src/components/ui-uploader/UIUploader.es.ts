import type { E } from "spell/ui/core"

/**
 * `<ui-uploader>` in Spanish:  `<es-cargador-archivos>`, with the names and texts only it uses (from `UIUploader.en.ts`).
 * - The names it shares with other tags (`appearance`, `multiple`, `icon`, `button` ...) are translated once,
 *   for every tag:  in `components.es.ts`.
 * - Names stay ASCII (no accents);  values and texts keep theirs.
 * - Its events follow Spanish's moments, as the plan names them:  `archivo-soltado`, `carpeta-soltada`, `subiendo`.
 */
export const uploaderEs = {
  lang: "es",
  tag: "ui-uploader",
  name: "cargador-archivos",
  snippet: '<es-cargador-archivos extensiones="json" multiple></es-cargador-archivos>',
  aka: [
    "subir archivos",
    "subida de archivos",
    "zona para soltar",
    "selector de archivos",
    "arrastrar y soltar",
    "adjunto"
  ],
  attributes: {
    destination: "url-destino",
    action: "accion",
    extensions: "extensiones",
    folder: "carpeta",
    "max-size": "tamano-maximo",
    "max-files": "maximo-archivos",
    "drop-zone": "zona-soltar",
    message: "mensaje",
    "drop-message": "mensaje-soltar",
    "uploading-message": "mensaje-subiendo",
    "done-message": "mensaje-hecho"
  },
  values: {
    appearance: { hero: "destacado", button: "botón", input: "entrada", compact: "compacto" }
  },
  events: {
    "ui-file-dragged-over": "archivo-arrastrado-sobre",
    "ui-file-dragged-out": "archivo-arrastrado-fuera",
    "ui-folder-dragged-over": "carpeta-arrastrada-sobre",
    "ui-folder-dragged-out": "carpeta-arrastrada-fuera",
    "ui-file-dropping": "archivo-soltandose",
    "ui-file-dropped": "archivo-soltado",
    "ui-folder-dropping": "carpeta-soltandose",
    "ui-folder-dropped": "carpeta-soltada",
    "ui-uploading": "subiendo",
    "ui-upload-progress": "progreso-subida",
    "ui-uploaded": "subido",
    "ui-upload-failed": "fallo-al-subir"
  },
  slots: { message: "mensaje", button: "boton" },
  parts: {
    "drop-area": "zona-soltar",
    files: "archivos",
    file: "archivo",
    name: "nombre",
    size: "tamano",
    status: "estado",
    remove: "quitar",
    zone: "zona"
  },
  texts: {
    message: "Suelta archivos {kinds} aquí, o",
    messageAny: "Suelta archivos aquí, o",
    messageFolders: "Suelta carpetas aquí, o",
    compactMessage: "Suelta archivos {kinds}, o",
    compactMessageAny: "Suelta archivos, o",
    compactMessageFolders: "Suelta carpetas, o",
    buttonLabel: "Subir archivos {kinds}",
    buttonLabelAny: "Subir archivos",
    buttonLabelFolders: "Subir carpetas",
    choose: "Elegir archivos…",
    chooseFolders: "Elegir carpetas…",
    chooseShort: "Elegir",
    browse: "Examinar…",
    noFiles: "Ningún archivo elegido",
    fileCount: "{count} archivos",
    fileCountDone: "{count} archivos:  {done} subidos",
    dropMessage: "Suelta para añadir {count} archivos",
    dropMessageOne: "Suelta para añadir 1 archivo",
    uploadingMessage: "Subiendo {done} de {count}",
    doneMessage: "{count} archivos subidos",
    doneMessageOne: "1 archivo subido",
    limitsFiles: "Hasta {count} archivos",
    limitsBoth: "Hasta {count} archivos, {size} cada uno",
    limitsSizeOnly: "Hasta {size}",
    turnedAway: "{count} archivos no añadidos",
    turnedAwayOne: "1 archivo no añadido",
    uploaded: "Subido",
    taken: "Hecho",
    held: "Listo",
    uploading: "Subiendo",
    failed: "Falló:  {reason}",
    serverError: "error del servidor {status}",
    noConnection: "sin conexión",
    tooBig: "Demasiado grande",
    tooBigLong: "Este archivo es demasiado grande, así que no se añadió. Elige un archivo de {size} o menos.",
    wrongKind: "No es un archivo {kinds}",
    wrongKindLong: "Solo se pueden subir archivos {kinds}. Elige un archivo que termine en {kinds}.",
    tooMany: "Demasiados archivos",
    tooManyLong:
      "Este archivo no se añadió: se pueden añadir hasta {count} archivos a la vez. Quita uno y vuelve a añadir este.",
    oneOnly: "Solo un archivo",
    oneOnlyLong:
      "Este archivo no se añadió: se puede añadir un archivo cada vez. Quita el otro y vuelve a añadir este.",
    notAFolder: "No es una carpeta",
    notAFolderLong: "Aquí solo se pueden añadir carpetas. Elige una carpeta.",
    aFolder: "Una carpeta",
    aFolderLong: "Aquí no se pueden añadir carpetas. Elige archivos.",
    remove: "Quitar",
    files: "Archivos"
  }
} as const satisfies E.TagDictionary
