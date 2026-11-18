import { SOUND_LIBRARY, type BuiltInSound, type SoundKind } from "./sounds.types"

/****************
 * ### `BuiltInSounds`
 * Spell's built-in sounds:  139 short sounds a program plays by name, `play "card slide"`.
 * - Picked from Kenney's free sound packs (CC0, no credit needed):  `LICENSE.md` beside this file says which.
 * - Each has a name in English and one in Spanish;  either finds it, in any case, with or without accents.
 * - Where the files are:  `sound-library/<name>.ogg`, next to the module that holds THIS class.
 *   - Dev / tests:  this file is `src/sounds/BuiltInSounds.ts`, so `src/sounds/sound-library/`.
 *   - Library build:  `dist/sound-library/`, where `emitSoundLibrary()` (`vite.config.ts`) copies them.
 *   - The editor's build and `<spell-viewer>`'s:  beside the chunk holding this class
 *     (`builtInFilesBesideTheirCode()`, the app's `vite.shared.ts`).
 *   - The docs site:  `site/_assets/sound-library`, a link (`Bundle.linkBuiltInFiles()`).
 * - Read by the runtime (`UI.sounds`), which core's `play` asks, and by the editor's sound picker.
 * - STATIC and instance-free on purpose, as `BuiltInPacks`:  the files sit in one place per page.
 *   No DOM.
 ****************/
export class BuiltInSounds {
  /**
   * Base the sound folder resolves against;  `import.meta.url` unless overridden (tests, unusual deployments).
   * - NOTE:  NEVER passed to `new URL()` as a literal `import.meta.url`:  Vite would turn a template URL next to
   *   it into a glob and bundle every sound.
   */
  static base = import.meta.url

  /** Every built-in sound, grouped by kind, in the sound picker's order. */
  static get all(): readonly BuiltInSound[] {
    return SOUNDS
  }

  /** The built-in sounds of `kind`. */
  static ofKind(kind: SoundKind): BuiltInSound[] {
    return SOUNDS.filter((sound) => sound.kind === kind)
  }

  /**
   * The built-in sound called `name`, in English or Spanish;  `undefined` if there's none.
   * - Any case, dashes or spaces, accents or not:  `Card-Slide`, `deslizar carta`, `tablon`.
   */
  static find(name: string): BuiltInSound | undefined {
    return BY_NAME.get(nameKey(name))
  }

  /**
   * The address of the built-in sound called `name`, `undefined` if there's none.
   * - Against `BuiltInSounds.base`, or `base` when given.
   */
  static url(name: string, base: string = BuiltInSounds.base): string | undefined {
    const sound = BuiltInSounds.find(name)
    if (!sound) return undefined
    return new URL(`${SOUND_LIBRARY}/${BuiltInSounds.fileOf(sound)}`, base).href
  }

  /** `sound`'s file name in the sound folder:  its English name, spaces as dashes (`card-slide.ogg`). */
  static fileOf(sound: BuiltInSound): string {
    return `${sound.name.replaceAll(" ", "-")}.ogg`
  }
}

/** `name` as a lookup key:  lowercase, accents dropped, dashes / underscores as spaces, spaces collapsed. */
function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(ACCENTS, "")
    .toLowerCase()
    .replace(SEPARATORS, " ")
    .trim()
}

/** Combining accents, once a name is split into letters and accents (`normalize("NFD")`). */
const ACCENTS = /[̀-ͯ]/g

/** What separates words in a name, as written. */
const SEPARATORS = /[\s_-]+/g

/**
 * Every built-in sound, as `[English name, Spanish name, kind]`:  from Kenney's packs (`LICENSE.md` says which file
 * each came from).
 */
// oxfmt-ignore
const SOUND_ROWS: [string, string, SoundKind][] = [
  // interface
  ["click", "clic", "interface"],
  ["click 2", "clic 2", "interface"],
  ["click 3", "clic 3", "interface"],
  ["tap", "toque", "interface"],
  ["tap 2", "toque 2", "interface"],
  ["mouse click", "clic de ratón", "interface"],
  ["mouse release", "soltar ratón", "interface"],
  ["toggle", "alternar", "interface"],
  ["toggle 2", "alternar 2", "interface"],
  ["switch", "interruptor", "interface"],
  ["switch 2", "interruptor 2", "interface"],
  ["select", "elegir", "interface"],
  ["select 2", "elegir 2", "interface"],
  ["tick", "tic", "interface"],
  ["tick 2", "tic 2", "interface"],
  ["scroll", "desplazar", "interface"],
  ["open", "abrir", "interface"],
  ["close", "cerrar", "interface"],
  ["back", "atrás", "interface"],
  ["grow", "agrandar", "interface"],
  ["shrink", "achicar", "interface"],
  ["drop", "soltar", "interface"],
  ["confirm", "confirmar", "interface"],
  ["confirm 2", "confirmar 2", "interface"],
  ["error", "error", "interface"],
  ["error 2", "error 2", "interface"],
  ["question", "pregunta", "interface"],
  ["bong", "bong", "interface"],
  ["glass", "cristal", "interface"],
  ["pluck", "punteo", "interface"],
  ["glitch", "interferencia", "interface"],
  ["scratch", "rasguño", "interface"],
  ["hover", "pasar por encima", "interface"],
  ["hover 2", "pasar por encima 2", "interface"],
  // cards
  ["card slide", "deslizar carta", "cards"],
  ["card slide 2", "deslizar carta 2", "cards"],
  ["card slide 3", "deslizar carta 3", "cards"],
  ["card slide 4", "deslizar carta 4", "cards"],
  ["card place", "poner carta", "cards"],
  ["card place 2", "poner carta 2", "cards"],
  ["card place 3", "poner carta 3", "cards"],
  ["card shove", "empujar carta", "cards"],
  ["card shove 2", "empujar carta 2", "cards"],
  ["card fan", "abanico de cartas", "cards"],
  ["card fan 2", "abanico de cartas 2", "cards"],
  ["shuffle", "barajar", "cards"],
  ["deck open", "abrir baraja", "cards"],
  ["deck take out", "sacar baraja", "cards"],
  // casino
  ["dice shake", "agitar dados", "casino"],
  ["dice shake 2", "agitar dados 2", "casino"],
  ["dice throw", "tirar dados", "casino"],
  ["dice throw 2", "tirar dados 2", "casino"],
  ["die throw", "tirar dado", "casino"],
  ["die throw 2", "tirar dado 2", "casino"],
  ["dice grab", "coger dados", "casino"],
  ["chip down", "poner ficha", "casino"],
  ["chip down 2", "poner ficha 2", "casino"],
  ["chips stack", "apilar fichas", "casino"],
  ["chips stack 2", "apilar fichas 2", "casino"],
  ["chips handle", "mover fichas", "casino"],
  ["chips collide", "chocar fichas", "casino"],
  ["coins", "monedas", "casino"],
  ["coins 2", "monedas 2", "casino"],
  // pieces
  ["piece down", "poner pieza", "pieces"],
  ["piece down 2", "poner pieza 2", "pieces"],
  ["piece down 3", "poner pieza 3", "pieces"],
  ["piece take", "comer pieza", "pieces"],
  ["piece take 2", "comer pieza 2", "pieces"],
  ["piece tap", "tocar pieza", "pieces"],
  ["piece tap 2", "tocar pieza 2", "pieces"],
  // impacts
  ["wood thud", "golpe de madera", "impacts"],
  ["plank", "tablón", "impacts"],
  ["soft thud", "golpe suave", "impacts"],
  ["soft thud 2", "golpe suave 2", "impacts"],
  ["metal tap", "toque de metal", "impacts"],
  ["metal clang", "golpe de metal", "impacts"],
  ["metal crash", "estruendo de metal", "impacts"],
  ["glass tap", "toque de cristal", "impacts"],
  ["glass clink", "tintineo de cristal", "impacts"],
  ["glass break", "cristal roto", "impacts"],
  ["bell", "campana", "impacts"],
  ["plate", "plato", "impacts"],
  ["tin", "lata", "impacts"],
  ["punch", "puñetazo", "impacts"],
  ["big punch", "puñetazo fuerte", "impacts"],
  ["pickaxe", "pico", "impacts"],
  // footsteps
  ["step", "paso", "footsteps"],
  ["step 2", "paso 2", "footsteps"],
  ["step on wood", "paso en madera", "footsteps"],
  ["step on grass", "paso en hierba", "footsteps"],
  ["step on snow", "paso en nieve", "footsteps"],
  ["step on stone", "paso en piedra", "footsteps"],
  ["step on carpet", "paso en alfombra", "footsteps"],
  // things
  ["door open", "abrir puerta", "things"],
  ["door close", "cerrar puerta", "things"],
  ["creak", "crujido", "things"],
  ["book open", "abrir libro", "things"],
  ["book close", "cerrar libro", "things"],
  ["page turn", "pasar página", "things"],
  ["page turn 2", "pasar página 2", "things"],
  ["book down", "dejar libro", "things"],
  ["cloth", "tela", "things"],
  ["latch", "pestillo", "things"],
  ["metal click", "clic de metal", "things"],
  ["knife draw", "sacar cuchillo", "things"],
  ["knife slice", "cortar", "things"],
  ["chop", "hachazo", "things"],
  ["pot", "olla", "things"],
  // digital
  ["laser", "láser", "digital"],
  ["laser 2", "láser 2", "digital"],
  ["zap", "chispazo", "digital"],
  ["power up", "subir poder", "digital"],
  ["power up 2", "subir poder 2", "digital"],
  ["power up 3", "subir poder 3", "digital"],
  ["rise", "subida", "digital"],
  ["fall", "bajada", "digital"],
  ["jump", "salto", "digital"],
  ["beep", "pitido", "digital"],
  ["two tones", "dos tonos", "digital"],
  ["three tones", "tres tonos", "digital"],
  ["high up", "agudo arriba", "digital"],
  ["low down", "grave abajo", "digital"],
  ["space junk", "chatarra espacial", "digital"],
  // jingles
  ["win", "ganar", "jingles"],
  ["lose", "perder", "jingles"],
  ["win 2", "ganar 2", "jingles"],
  ["lose 2", "perder 2", "jingles"],
  ["win 3", "ganar 3", "jingles"],
  ["lose 3", "perder 3", "jingles"],
  ["win 4", "ganar 4", "jingles"],
  ["lose 4", "perder 4", "jingles"],
  ["level up", "subir de nivel", "jingles"],
  ["fail", "fallo", "jingles"],
  ["jingle", "sintonía", "jingles"],
  ["jingle 2", "sintonía 2", "jingles"],
  ["jingle 3", "sintonía 3", "jingles"],
  ["jingle 4", "sintonía 4", "jingles"],
  ["orchestra hit", "golpe de orquesta", "jingles"],
  ["orchestra hit 2", "golpe de orquesta 2", "jingles"],
]

/** `SOUND_ROWS` as sounds. */
const SOUNDS: readonly BuiltInSound[] = SOUND_ROWS.map(([name, es, kind]) => ({ name, es, kind }))

/** Each sound by its English and its Spanish name, as `nameKey()`s. */
const BY_NAME = new Map<string, BuiltInSound>(
  SOUNDS.flatMap((sound) => [
    [nameKey(sound.name), sound],
    [nameKey(sound.es), sound]
  ])
)
