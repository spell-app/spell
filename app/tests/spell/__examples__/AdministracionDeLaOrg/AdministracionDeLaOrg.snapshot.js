import { core, Thing, App, Place, h } from "@spell/core"

core.heading("Administración de la org:  dónde se guardan los roles de una org")
//////////////////////////////////////////////////////////////////////
// ## Administración de la org:  dónde se guardan los roles de una org
//////////////////////////////////////////////////////////////////////

/** La org misma, para el título de la página y como espacio que diseñar. */
export class Perfil extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1117, end: 1159 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "espacio" es texto, guardado como "space"
  static { this.declareProp("espacio", { type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1164, end: 1208 } }) }
  get espacio() { return this.getProp("espacio") }
  set espacio(value) { this.setProp("espacio", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "perfiles",
    times: ["created", "modified"], select: ["nombre", "espacio"] }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1089, end: 1112 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1089, end: 1112 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

/** Un rol de la org, por su nombre. */
export class Función extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1342, end: 1384 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "funciones",
    times: ["created", "modified"], select: ["nombre"] }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1314, end: 1337 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1314, end: 1337 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class Miembro extends Thing {
  // su "persona" es texto, guardado como "person"
  static { this.declareProp("persona", { type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1482, end: 1527 } }) }
  get persona() { return this.getProp("persona") }
  set persona(value) { this.setProp("persona", value) }

  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1532, end: 1574 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "rol" es texto, guardado como "role"
  static { this.declareProp("rol", { type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1579, end: 1618 } }) }
  get rol() { return this.getProp("rol") }
  set rol(value) { this.setProp("rol", value) }

  // su "cargo" es texto, guardado como "roleName"
  static { this.declareProp("cargo", { type: "text", storedAs: "roleName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1623, end: 1668 } }) }
  get cargo() { return this.getProp("cargo") }
  set cargo(value) { this.setProp("cargo", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "miembros",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1454, end: 1477 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1454, end: 1477 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class Equipo extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1765, end: 1807 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "espacio" es texto, guardado como "space"
  static { this.declareProp("espacio", { type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1812, end: 1856 } }) }
  get espacio() { return this.getProp("espacio") }
  set espacio(value) { this.setProp("espacio", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "equipos",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1737, end: 1760 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1737, end: 1760 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class Proyecto extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1955, end: 1997 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "equipo" es texto, guardado como "team"
  static { this.declareProp("equipo", { type: "text", storedAs: "team", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2002, end: 2044 } }) }
  get equipo() { return this.getProp("equipo") }
  set equipo(value) { this.setProp("equipo", value) }

  // su "espacio" es texto, guardado como "space"
  static { this.declareProp("espacio", { type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2049, end: 2093 } }) }
  get espacio() { return this.getProp("espacio") }
  set espacio(value) { this.setProp("espacio", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "proyectos",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1927, end: 1950 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 1927, end: 1950 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class Mandato extends Thing {
  // su "rol" es texto, guardado como "role"
  static { this.declareProp("rol", { type: "text", storedAs: "role", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2191, end: 2230 } }) }
  get rol() { return this.getProp("rol") }
  set rol(value) { this.setProp("rol", value) }

  // su "titular" es texto, guardado como "holder"
  static { this.declareProp("titular", { type: "text", storedAs: "holder", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2235, end: 2280 } }) }
  get titular() { return this.getProp("titular") }
  set titular(value) { this.setProp("titular", value) }

  // su "ámbito" es texto, guardado como "manages"
  static { this.declareProp("ámbito", { type: "text", storedAs: "manages", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2285, end: 2330 } }) }
  get ámbito() { return this.getProp("ámbito") }
  set ámbito(value) { this.setProp("ámbito", value) }

  // su "cargo" es texto, guardado como "roleName"
  static { this.declareProp("cargo", { type: "text", storedAs: "roleName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2335, end: 2380 } }) }
  get cargo() { return this.getProp("cargo") }
  set cargo(value) { this.setProp("cargo", value) }

  // su "nombre titular" es texto, guardado como "holderName"
  static { this.declareProp("nombreTitular", { type: "text", storedAs: "holderName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2385, end: 2441 } }) }
  get nombreTitular() { return this.getProp("nombreTitular") }
  set nombreTitular(value) { this.setProp("nombreTitular", value) }

  // su "nombre ámbito" es texto, guardado como "managesName"
  static { this.declareProp("nombreÁmbito", { type: "text", storedAs: "managesName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2446, end: 2502 } }) }
  get nombreÁmbito() { return this.getProp("nombreÁmbito") }
  set nombreÁmbito(value) { this.setProp("nombreÁmbito", value) }

  // su "inicio" es texto, guardado como "starts"
  static { this.declareProp("inicio", { type: "text", storedAs: "starts", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2507, end: 2551 } }) }
  get inicio() { return this.getProp("inicio") }
  set inicio(value) { this.setProp("inicio", value) }

  // su "fin" es texto, guardado como "ends"
  static { this.declareProp("fin", { type: "text", storedAs: "ends", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2556, end: 2595 } }) }
  get fin() { return this.getProp("fin") }
  set fin(value) { this.setProp("fin", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "mandatos",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2163, end: 2186 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2163, end: 2186 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class Aprobación extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2696, end: 2738 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "versión" es texto, guardado como "version"
  static { this.declareProp("versión", { type: "text", storedAs: "version", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2743, end: 2789 } }) }
  get versión() { return this.getProp("versión") }
  set versión(value) { this.setProp("versión", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "aprobaciones",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2668, end: 2691 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2668, end: 2691 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

/** Quien diseña cambia las páginas y el código de un espacio, sea cual sea su rol allí:  un Manager las publica. */
export class Diseñador extends Thing {
  // su "persona" es texto, guardado como "person"
  static { this.declareProp("persona", { type: "text", storedAs: "person", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3002, end: 3047 } }) }
  get persona() { return this.getProp("persona") }
  set persona(value) { this.setProp("persona", value) }

  // su "espacio" es texto, guardado como "space"
  static { this.declareProp("espacio", { type: "text", storedAs: "space", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3052, end: 3096 } }) }
  get espacio() { return this.getProp("espacio") }
  set espacio(value) { this.setProp("espacio", value) }

  // su "nombre persona" es texto, guardado como "personName"
  static { this.declareProp("nombrePersona", { type: "text", storedAs: "personName", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3101, end: 3157 } }) }
  get nombrePersona() { return this.getProp("nombrePersona") }
  set nombrePersona(value) { this.setProp("nombrePersona", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "diseñadores",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2974, end: 2997 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 2974, end: 2997 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

/** Las etapas de un evento, en orden:  a cada una la mueve "the team" o "its organizers". */
export class Etapa extends Thing {
  // su "nombre" es texto, guardado como "name"
  static { this.declareProp("nombre", { type: "text", storedAs: "name", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3343, end: 3385 } }) }
  get nombre() { return this.getProp("nombre") }
  set nombre(value) { this.setProp("nombre", value) }

  // su "siguiente" es texto, guardado como "movesTo"
  static { this.declareProp("siguiente", { type: "text", storedAs: "movesTo", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3390, end: 3438 } }) }
  get siguiente() { return this.getProp("siguiente") }
  set siguiente(value) { this.setProp("siguiente", value) }

  // su "quién mueve" es texto, guardado como "movedBy"
  static { this.declareProp("quiénMueve", { type: "text", storedAs: "movedBy", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3443, end: 3493 } }) }
  get quiénMueve() { return this.getProp("quiénMueve") }
  set quiénMueve(value) { this.setProp("quiénMueve", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "etapas",
    times: ["created", "modified"]
  }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3315, end: 3338 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3315, end: 3338 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

export class Cambio extends Thing {
  // su "cuándo" es texto, guardado como "at"
  static { this.declareProp("cuándo", { type: "text", storedAs: "at", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3590, end: 3630 } }) }
  get cuándo() { return this.getProp("cuándo") }
  set cuándo(value) { this.setProp("cuándo", value) }

  // su "quién" es texto, guardado como "who"
  static { this.declareProp("quién", { type: "text", storedAs: "who", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3635, end: 3675 } }) }
  get quién() { return this.getProp("quién") }
  set quién(value) { this.setProp("quién", value) }

  // su "hecho" es texto, guardado como "did"
  static { this.declareProp("hecho", { type: "text", storedAs: "did", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3680, end: 3720 } }) }
  get hecho() { return this.getProp("hecho") }
  set hecho(value) { this.setProp("hecho", value) }

  // su "qué" es texto, guardado como "what"
  static { this.declareProp("qué", { type: "text", storedAs: "what", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3725, end: 3764 } }) }
  get qué() { return this.getProp("qué") }
  set qué(value) { this.setProp("qué", value) }

  // su "por qué" es texto, guardado como "why"
  static { this.declareProp("porQué", { type: "text", storedAs: "why", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3769, end: 3811 } }) }
  get porQué() { return this.getProp("porQué") }
  set porQué(value) { this.setProp("porQué", value) }

  static savedIn = {
    place: "roles_de_la_org",
    collection: "cambios",
    times: ["created", "modified"], select: ["cuándo", "quién", "hecho", "qué", "porQué"] }

  // vive en roles de la org
  static { this.declareProp("creado", { type: "date", storedAs: "created", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3562, end: 3585 } }) }
  get creado() { return this.getProp("creado") }
  set creado(value) { this.setProp("creado", value) }

  // vive en roles de la org
  static { this.declareProp("modificado", { type: "date", storedAs: "modified", declaredAt: { path: "/AdministracionDeLaOrg.api.es.spell", start: 3562, end: 3585 } }) }
  get modificado() { return this.getProp("modificado") }
  set modificado(value) { this.setProp("modificado", value) }
}

/**
 * Los roles de una org viven en su espacio de administración:  quién está, sus equipos y proyectos, quién dirige qué, y
 * hasta cuándo.  Cada cambio pasa por el servidor de Encanto, con las reglas de la org, y queda en el registro:
 * tampoco desde esta página puede un Project Manager quitar a un Team Manager.
 * La página de tu org nombra su propia org en la línea siguiente:  "@rs" es la de la Rock Society.
 */
export class RolDeLaOrg extends Place {}
export const rolesDeLaOrg = core.place(new RolDeLaOrg(), {
  name: "roles_de_la_org",
  kind: "data folder",
  at: "/api/places/spaces/@rs/__admin/roles",
  checkedEvery: 30,
  collections: {
    perfiles: { at: "org_profiles" },
    funciones: { at: "org_roles" },
    miembros: { at: "members" },
    equipos: { at: "teams" },
    proyectos: { at: "projects" },
    mandatos: { at: "terms" },
    aprobaciones: { at: "approved_apps" },
    diseñadores: { at: "designers" },
    etapas: { at: "event_stages" },
    cambios: { at: "role_changes" }
  },
  unclearNumbers: ",", firstReads: () => [[Perfil], [Cambio, { sort: [{ field: "cuándo", descending: true }] }], [Etapa], [Aprobación], [Miembro, { sort: [{ field: "nombre" }] }], [Equipo, { sort: [{ field: "nombre" }] }], [Proyecto, { sort: [{ field: "nombre" }] }], [Diseñador], [Función], [Mandato]] })

// -----------
core.heading("Administración de la org")
//////////////////////////////
// ## Administración de la org
//////////////////////////////
// La página de administración de una org:  quién está, sus equipos y proyectos, quién dirige qué y hasta cuándo, qué
// aplicaciones pueden instalar sus espacios, las etapas de sus eventos y el registro de cada cambio.
// Una barra con quién ha iniciado sesión, las secciones a un lado, y una sección cada vez junto a ellas.
// Dónde se guardan está en AdministracionDeLaOrg.api.es.spell, y solo su primera línea lo sabe.
// Cada cambio pasa por el servidor de Encanto, con las reglas de la org:  uno que no puedes hacer dice por qué, y no cambia nada.

core.heading("La página:  una barra arriba, las secciones al lado, y la elegida")
//## La página:  una barra arriba, las secciones al lado, y la elegida

export class AdministraciónDeLaOrg extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** A quién agregar, por su dirección:  ana@rs */
  // su "miembro nuevo" es un nuevo miembro
  static { this.declareProp("miembroNuevo", { init: () => new Miembro(), early: true }) }
  get miembroNuevo() { return this.getProp("miembroNuevo") }
  set miembroNuevo(value) { this.setProp("miembroNuevo", value) }

  /** Un equipo permanente nuevo, por su nombre */
  // su "equipo nuevo" es un nuevo equipo
  static { this.declareProp("equipoNuevo", { init: () => new Equipo(), early: true }) }
  get equipoNuevo() { return this.getProp("equipoNuevo") }
  set equipoNuevo(value) { this.setProp("equipoNuevo", value) }

  /** Un proyecto nuevo, bajo un equipo (por su carpeta) o, sin ninguno, la org misma */
  // su "proyecto nuevo" es un nuevo proyecto
  static { this.declareProp("proyectoNuevo", { init: () => new Proyecto(), early: true }) }
  get proyectoNuevo() { return this.getProp("proyectoNuevo") }
  set proyectoNuevo(value) { this.setProp("proyectoNuevo", value) }

  // su "mandato nuevo" es un nuevo mandato
  static { this.declareProp("mandatoNuevo", { init: () => new Mandato(), early: true }) }
  get mandatoNuevo() { return this.getProp("mandatoNuevo") }
  set mandatoNuevo(value) { this.setProp("mandatoNuevo", value) }

  // su "aprobación nueva" es una nueva aprobación
  static { this.declareProp("aprobaciónNueva", { init: () => new Aprobación(), early: true }) }
  get aprobaciónNueva() { return this.getProp("aprobaciónNueva") }
  set aprobaciónNueva(value) { this.setProp("aprobaciónNueva", value) }

  /** Quién diseña las páginas de qué espacio:  ana@rs, picnic@rs */
  // su "diseñador nuevo" es un nuevo diseñador
  static { this.declareProp("diseñadorNuevo", { init: () => new Diseñador(), early: true }) }
  get diseñadorNuevo() { return this.getProp("diseñadorNuevo") }
  set diseñadorNuevo(value) { this.setProp("diseñadorNuevo", value) }

  /** Una etapa por la que pasa un evento:  su nombre cambia la etapa de ese nombre, o agrega una antes de la última */
  // su "etapa nueva" es una nueva etapa
  static { this.declareProp("etapaNueva", { init: () => new Etapa(), early: true }) }
  get etapaNueva() { return this.getProp("etapaNueva") }
  set etapaNueva(value) { this.setProp("etapaNueva", value) }

  agregarElMiembroNuevo() {
    core.saveThing(this.miembroNuevo)
    this.miembroNuevo = new Miembro()
  }

  agregarElEquipoNuevo() {
    core.saveThing(this.equipoNuevo)
    this.equipoNuevo = new Equipo()
  }

  agregarElProyectoNuevo() {
    core.saveThing(this.proyectoNuevo)
    this.proyectoNuevo = new Proyecto()
  }

  darElMandatoNuevo() {
    core.saveThing(this.mandatoNuevo)
    this.mandatoNuevo = new Mandato()
  }

  aprobarLaAprobaciónNueva() {
    core.saveThing(this.aprobaciónNueva)
    this.aprobaciónNueva = new Aprobación()
  }

  agregarElDiseñadorNuevo() {
    core.saveThing(this.diseñadorNuevo)
    this.diseñadorNuevo = new Diseñador()
  }

  agregarLaEtapaNueva() {
    core.saveThing(this.etapaNueva)
    this.etapaNueva = new Etapa()
  }

  // La sección elegida queda en la dirección de la página, y al recargar vuelve a ella
  draw() {
    return h("ui-stack", { class: "org-admin", spacing: "none" },
      h("ui-toolbar", { class: "top-bar", appearance: "text", "aria-label": "Administración de la org" },
        () => core.drawRead(async () => await core.savedThings(Perfil, {}, "as drawn"), (org) => h("ui-text", { slot: "title", size: "large" }, "Administración de ", () => org.nombre)),
        h("ui-item", { link: "OrgChat" }, "Chat"),
        h("ui-item", { link: "OrgFeed" }, "Novedades"),
        h("ui-item", { link: "Inbox" }, "Bandeja"),
        h("ui-stack", { slot: "right", direction: "horizontal" }, () => core.signInMenu())
      ),
      h("ui-tabs", {
        class: "body",
        parameter: "sección",
        direction: "vertical",
        appearance: "secondary",
        "aria-label": "Secciones"
      },
        h("ui-tab", { label: "Personas", icon: "users", value: "personas" },
          h("slot", { name: "sección_personas" }, () => this.drawSecciónPersonas())
        ),
        h("ui-tab", { label: "Equipos y proyectos", icon: "sitemap", value: "equipos" },
          h("slot", { name: "sección_equipos" }, () => this.drawSecciónEquipos())
        ),
        h("ui-tab", { label: "Quién dirige qué", icon: "user tie", value: "roles" },
          h("slot", { name: "sección_roles" }, () => this.drawSecciónRoles())
        ),
        h("ui-tab", { label: "Quién diseña qué", icon: "paint brush", value: "diseñadores" },
          h("slot", { name: "sección_diseñadores" }, () => this.drawSecciónDiseñadores())
        ),
        h("ui-tab", { label: "Aplicaciones aprobadas", icon: "check circle outline", value: "aplicaciones" },
          h("slot", { name: "sección_aplicaciones" }, () => this.drawSecciónAplicaciones())
        ),
        h("ui-tab", { label: "Etapas de los eventos", icon: "stream", value: "etapas" },
          h("slot", { name: "sección_etapas" }, () => this.drawSecciónEtapas())
        ),
        h("ui-tab", { label: "Registro", icon: "history", value: "registro" },
          h("slot", { name: "sección_registro" }, () => this.drawSecciónRegistro())
        )
      )
    )
  }

  drawSecciónPersonas() {
    return h("ui-stack", { class: "people", part: "sección_personas" },
      h("ui-header", { size: "medium" }, "Personas"),
      h("ui-form", { class: "add", "prop:value": () => this.miembroNuevo },
        h("ui-input", {
          name: "persona",
          placeholder: "Agrega a alguien, por su dirección:  ana@rs",
          "aria-label": "Agrega a alguien, por su dirección",
          fluid: true,
          action: true
        },
          h("ui-button", {
            class: "add",
            slot: "action",
            color: "primary",
            title: "Agregarle a la org",
            disabled: () => this.miembroNuevo.persona === "",
            onClick: core.pressed(this, () => this.agregarElMiembroNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Miembro, { sort: [{ field: "nombre" }] }, "as drawn"), (miembro) => [
        h("es-celda", { "data-column": "Nombre" }, () => miembro.nombre),
        h("es-celda", { "data-column": "Dirección" }, h("ui-text", { color: "grey" }, () => miembro.persona)),
        h("es-celda", { "data-column": "Rol" }, h("ui-label", { size: "small" }, () => miembro.cargo)),
        h("es-celda", { "data-column": "" },
          h("ui-button", {
            class: "remove",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Sacarle de la org",
            title: "Sacarle de la org",
            onClick: core.pressed(this, () => core.removeSaved(miembro)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_personas" },
          "Buscando a la gente de la org"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_personas" },
          h("es-fila")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_personas" }, "Nadie todavía."),
        failed: () => h("ui-text", { color: "red", part: "sección_personas" },
          "No podemos leer a la gente de la org ahora mismo."
        )
      })
    )
  }

  drawSecciónEquipos() {
    return h("ui-stack", { class: "teams", part: "sección_equipos" },
      h("ui-header", { size: "medium" }, "Equipos"),
      h("ui-form", { class: "add new-team", "prop:value": () => this.equipoNuevo },
        h("ui-input", {
          name: "nombre",
          placeholder: "Un equipo nuevo:  Equipo de eventos",
          "aria-label": "Un equipo nuevo",
          fluid: true,
          action: true
        },
          h("ui-button", {
            class: "add",
            slot: "action",
            color: "primary",
            title: "Agregar este equipo",
            disabled: () => this.equipoNuevo.nombre === "",
            onClick: core.pressed(this, () => this.agregarElEquipoNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar equipo")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo) => [
        h("es-celda", { "data-column": "Nombre" }, () => equipo.nombre),
        h("es-celda", { "data-column": "Espacio" }, h("ui-text", { color: "grey" }, () => equipo.espacio))
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_equipos" },
          "Buscando los equipos"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_equipos" },
          h("es-fila")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_equipos" }, "Ningún equipo todavía.")
      }),
      h("ui-header", { size: "medium" }, "Proyectos"),
      h("ui-form", { class: "add new-project", "prop:value": () => this.proyectoNuevo },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-input", {
            name: "nombre",
            placeholder: "Un proyecto nuevo:  2026 T4",
            "aria-label": "Un proyecto nuevo",
            fluid: true
          }),
          h("ui-select", { name: "equipo", placeholder: "Bajo la org misma", "aria-label": "Bajo el equipo" },
            () => core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo) => h("ui-item", { value: () => equipo.id, part: "sección_equipos" }, () => equipo.nombre))
          ),
          h("ui-button", {
            class: "add-project",
            color: "primary",
            title: "Agregar este proyecto",
            disabled: () => this.proyectoNuevo.nombre === "",
            onClick: core.pressed(this, () => this.agregarElProyectoNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar proyecto")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Proyecto, { sort: [{ field: "nombre" }] }, "as drawn"), (proyecto) => [
        h("es-celda", { "data-column": "Nombre" }, () => proyecto.nombre),
        h("es-celda", { "data-column": "Bajo" }, () => proyecto.equipo),
        h("es-celda", { "data-column": "Espacio" }, h("ui-text", { color: "grey" }, () => proyecto.espacio))
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_equipos" },
          "Buscando los proyectos"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_equipos" },
          h("es-fila")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_equipos" }, "Ningún proyecto todavía.")
      })
    )
  }

  drawSecciónRoles() {
    return h("ui-stack", { class: "roles", part: "sección_roles" },
      h("ui-header", { size: "medium" }, "Quién dirige qué"),
      h("ui-form", { class: "add", "prop:value": () => this.mandatoNuevo },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-select", { name: "titular", placeholder: "Quién", "aria-label": "Quién:  una persona, o un equipo" },
            () => core.drawRead(async () => await core.savedThings(Miembro, { sort: [{ field: "nombre" }] }, "as drawn"), (miembro) => h("ui-item", { value: () => miembro.persona, part: "sección_roles" }, () => miembro.nombre)),
            () => core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo) => h("ui-item", { value: () => equipo.id, part: "sección_roles" }, () => equipo.nombre))
          ),
          h("ui-select", { name: "rol", placeholder: "Rol", "aria-label": "Rol" },
            () => core.drawRead(async () => await core.savedThings(Función, {}, "as drawn"), (función) => h("ui-item", { value: () => función.id, part: "sección_roles" }, () => función.nombre))
          ),
          h("ui-select", { name: "ámbito", placeholder: "Toda la org", "aria-label": "De" },
            () => core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo) => h("ui-item", { value: () => equipo.id, part: "sección_roles" }, () => equipo.nombre)),
            () => core.drawRead(async () => await core.savedThings(Proyecto, { sort: [{ field: "nombre" }] }, "as drawn"), (proyecto) => h("ui-item", { value: () => proyecto.id, part: "sección_roles" }, () => proyecto.nombre))
          ),
          h("ui-input", { name: "fin", type: "date", "aria-label": "Hasta" }),
          h("ui-button", {
            class: "give",
            color: "primary",
            title: "Darle este rol",
            disabled: () => this.mandatoNuevo.titular === "",
            onClick: core.pressed(this, () => this.darElMandatoNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Nombrarle")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Mandato, {}, "as drawn"), (mandato) => [
        h("es-celda", { "data-column": "Quién", title: () => mandato.titular }, () => mandato.nombreTitular),
        h("es-celda", { "data-column": "Rol" }, h("ui-label", { size: "small" }, () => mandato.cargo)),
        h("es-celda", { "data-column": "De" }, () => mandato.nombreÁmbito),
        h("es-celda", { "data-column": "Desde" }, () => mandato.inicio),
        h("es-celda", { "data-column": "Hasta" }, () => mandato.fin),
        h("es-celda", { "data-column": "" },
          h("ui-button", {
            class: "end",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Terminar este mandato",
            title: "Terminar este mandato:  su registro se queda",
            onClick: core.pressed(this, () => core.removeSaved(mandato)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_roles" },
          "Buscando quién dirige qué"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_roles" },
          h("es-fila")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_roles" }, "Nadie nombrado todavía.")
      })
    )
  }

  drawSecciónDiseñadores() {
    return h("ui-stack", { class: "designers", part: "sección_diseñadores" },
      h("ui-header", { size: "medium" }, "Quién diseña qué"),
      h("ui-text", { color: "grey" },
        "Cambian las páginas de un espacio, sea cual sea su rol allí;  sus Managers las publican."
      ),
      h("ui-form", { class: "add", "prop:value": () => this.diseñadorNuevo },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-select", { name: "persona", placeholder: "Quién", "aria-label": "Quién" },
            () => core.drawRead(async () => await core.savedThings(Miembro, { sort: [{ field: "nombre" }] }, "as drawn"), (miembro) => h("ui-item", { value: () => miembro.persona, part: "sección_diseñadores" }, () => miembro.nombre))
          ),
          h("ui-select", { name: "espacio", placeholder: "Qué espacio", "aria-label": "Qué espacio" },
            () => core.drawRead(async () => await core.savedThings(Perfil, {}, "as drawn"), (org) => h("ui-item", { value: () => org.espacio, part: "sección_diseñadores" }, () => org.nombre)),
            () => core.drawRead(async () => await core.savedThings(Equipo, { sort: [{ field: "nombre" }] }, "as drawn"), (equipo) => h("ui-item", { value: () => equipo.espacio, part: "sección_diseñadores" }, () => equipo.nombre)),
            () => core.drawRead(async () => await core.savedThings(Proyecto, { sort: [{ field: "nombre" }] }, "as drawn"), (proyecto) => h("ui-item", { value: () => proyecto.espacio, part: "sección_diseñadores" }, () => proyecto.nombre))
          ),
          h("ui-button", {
            class: "design",
            color: "primary",
            title: "Dejarle cambiar las páginas de este espacio",
            disabled: () => this.diseñadorNuevo.persona === "",
            onClick: core.pressed(this, () => this.agregarElDiseñadorNuevo()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Puede diseñarlo")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Diseñador, {}, "as drawn"), (diseñador) => [
        h("es-celda", { "data-column": "Quién", title: () => diseñador.persona },
          () => diseñador.nombrePersona
        ),
        h("es-celda", { "data-column": "Diseña" }, h("ui-text", { color: "grey" }, () => diseñador.espacio)),
        h("es-celda", { "data-column": "" },
          h("ui-button", {
            class: "undesign",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Ya no lo diseña",
            title: "Ya no lo diseña:  sus borradores se quedan, para un Manager",
            onClick: core.pressed(this, () => core.removeSaved(diseñador)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_diseñadores" },
          "Buscando quién diseña qué"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_diseñadores" },
          h("es-fila")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_diseñadores" },
          "Solo los Managers de cada espacio, por ahora."
        )
      })
    )
  }

  drawSecciónAplicaciones() {
    return h("ui-stack", { class: "apps", part: "sección_aplicaciones" },
      h("ui-header", { size: "medium" }, "Aplicaciones aprobadas"),
      h("ui-form", { class: "add", "prop:value": () => this.aprobaciónNueva },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-input", { name: "nombre", placeholder: "@spell/sign-up-sheet", "aria-label": "Aplicación", fluid: true }),
          h("ui-input", { name: "versión", placeholder: "1.0.0", "aria-label": "Versión" }),
          h("ui-button", {
            class: "approve",
            color: "primary",
            title: "Dejar que los espacios de la org la instalen",
            disabled: () => this.aprobaciónNueva.nombre === "",
            onClick: core.pressed(this, () => this.aprobarLaAprobaciónNueva()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Aprobar")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Aprobación, {}, "as drawn"), (aprobación) => [
        h("es-celda", { "data-column": "Aplicación" }, () => aprobación.nombre),
        h("es-celda", { "data-column": "Versión" }, () => aprobación.versión),
        h("es-celda", { "data-column": "" },
          h("ui-button", {
            class: "unapprove",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Quitarla de la lista",
            title: "Quitarla de la lista",
            onClick: core.pressed(this, () => core.removeSaved(aprobación)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_aplicaciones" },
          "Buscando las aplicaciones aprobadas"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_aplicaciones" },
          h("es-fila")
        ),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_aplicaciones" },
          "Ninguna aplicación aprobada todavía."
        )
      })
    )
  }

  drawSecciónEtapas() {
    return h("ui-stack", { class: "stages", part: "sección_etapas" },
      h("ui-header", { size: "medium" }, "Etapas de los eventos"),
      h("ui-form", { class: "add", "prop:value": () => this.etapaNueva },
        h("ui-stack", { class: "row", direction: "horizontal", align: "center", wrap: true },
          h("ui-input", { name: "nombre", placeholder: "Una etapa:  Ensayo", "aria-label": "Etapa", fluid: true }),
          h("ui-select", { name: "siguiente", placeholder: "Lleva a", "aria-label": "Lleva a" },
            () => core.drawRead(async () => await core.savedThings(Etapa, {}, "as drawn"), (etapa) => h("ui-item", { value: () => etapa.id, part: "sección_etapas" }, () => etapa.nombre))
          ),
          h("ui-select", { name: "quién mueve", placeholder: "La mueve", "aria-label": "La mueve" },
            h("ui-item", { value: "the team" }, "El equipo"),
            h("ui-item", { value: "its organizers" }, "Sus organizadores")
          ),
          h("ui-button", {
            class: "stage-it",
            color: "primary",
            title: "Agregar esta etapa, o cambiar la de ese nombre",
            disabled: () => this.etapaNueva.nombre === "",
            onClick: core.pressed(this, () => this.agregarLaEtapaNueva()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "Agregar o cambiar")
        )
      ),
      () => core.drawRead(async () => await core.savedThings(Etapa, {}, "as drawn"), (etapa) => [
        h("es-celda", { "data-column": "Etapa" }, () => etapa.nombre),
        h("es-celda", { "data-column": "Lleva a" }, h("ui-text", { color: "grey" }, () => etapa.siguiente)),
        h("es-celda", { "data-column": "La mueve" }, () => etapa.quiénMueve),
        h("es-celda", { "data-column": "" },
          h("ui-button", {
            class: "unstage",
            icon: "close",
            size: "mini",
            appearance: "transparent",
            "aria-label": "Quitar esta etapa",
            title: "Quitar esta etapa:  no mientras haya un evento en ella, o otra lleve a ella",
            onClick: core.pressed(this, () => core.removeSaved(etapa)),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          })
        )
      ], { waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_etapas" },
        "Buscando las etapas de los eventos"
      ), items: () => h("es-tabla", { appearance: "very-basic", selectable: true, unstackable: true, part: "sección_etapas" },
        h("es-fila")
      ) })
    )
  }

  drawSecciónRegistro() {
    return h("ui-stack", { class: "log", part: "sección_registro" },
      h("ui-header", { size: "medium" }, "Registro"),
      () => core.drawRead(async () => await core.savedThings(Cambio, { sort: [{ field: "cuándo", descending: true }] }, "as drawn"), (cambio) => [
        h("es-celda", { "data-column": "Cuándo" }, h("ui-text", { color: "grey" }, () => cambio.cuándo)),
        h("es-celda", { "data-column": "Quién" }, () => cambio.quién),
        h("es-celda", { "data-column": "Hizo" }, h("ui-label", { size: "small" }, () => cambio.hecho)),
        h("es-celda", { "data-column": "Qué" }, () => cambio.qué),
        h("es-celda", { "data-column": "Por qué" }, () => cambio.porQué)
      ], {
        waiting: () => h("ui-loader", { visible: true, inline: true, text: true, part: "sección_registro" },
          "Leyendo el registro"
        ),
        items: () => h("es-tabla", { appearance: "very-basic", unstackable: true, part: "sección_registro" }, h("es-fila")),
        none: () => h("ui-text", { class: "none", color: "grey", part: "sección_registro" }, "Nada ha cambiado todavía.")
      })
    )
  }
}
export const administraciónDeLaOrg = new AdministraciónDeLaOrg()
// -----------
core.installStyles(undefined, `/* The page takes the theme's colours and type, light or dark, as its controls do. */¬.org-admin {¬  min-height: 100%;¬  color: CanvasText;¬  background: var(--ui-background);¬  font-family: var(--ui-font-family);¬}¬¬/* The section showing stands a little apart from the list of them. */¬.org-admin ui-tab {¬  margin-inline-start: 1rem;¬}¬¬/* The toolbar:  a rule below it, its title over the sections' labels. */¬.org-admin .top-bar {¬  padding-inline: 15px 0;¬  border-block-end: var(--ui-border-width, 1px) solid var(--ui-border-color);¬  margin-block-end: 0.75rem;¬  --ui-menu-item-padding: 0.5em 0.6em;¬}¬.org-admin .top-bar::part(menu) {¬  margin-block: 0;¬}¬.org-admin .top-bar::part(title) {¬  margin-inline-end: 12px;¬}¬¬/* Tables scroll inside themselves on a narrow page, rather than breaking a date in two. */¬.org-admin es-fila > es-celda {¬  color: CanvasText;¬  white-space: nowrap;¬  min-inline-size: max-content;¬}¬¬/* An add form:  its button keeps its size as the row wraps. */¬.org-admin .add .row > ui-button {¬  flex: none;¬}¬¬/* A row's take-away button stays quiet until the row is pointed at, or the button has the keyboard. */¬.org-admin es-tabla ui-button[icon="close"] {¬  opacity: 0;¬}¬.org-admin es-tabla es-fila:hover ui-button[icon="close"],¬.org-admin es-tabla ui-button[icon="close"]:focus-within {¬  opacity: 1;¬}¬¬/* A phone has nothing to point with. */¬@media (hover: none) {¬  .org-admin es-tabla ui-button[icon="close"] {¬    opacity: 1;¬  }¬}¬¬/* Too narrow for the sections to sit beside what they show:  they go above it. */¬@media (max-width: 640px) {¬  .org-admin ui-tab {¬    min-width: 100%;¬    margin-inline-start: 0;¬    margin-block-start: 0.75rem;¬  }¬}¬`)
// -----------
if (!core.isCarryingOver) administraciónDeLaOrg.start()
