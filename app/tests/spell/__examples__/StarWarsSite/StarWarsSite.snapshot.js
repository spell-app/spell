import { core, View, Page, Site } from "@spell/core"
import { Character, Planet, Film, Species, Vehicle, Starship, WikiPage, Namespace, Title, Thumbnail, Originalimage, ContentUrl, Desktop, Mobile, Card } from "@spell/project/@spell/examples/StarWars"

export class SettingsDialog extends View {
  static elementTag = core.defineElement(this, "test-project")
}

export class PersonSidebar extends View {
  static elementTag = core.defineElement(this, "test-project")

  /** Whoever it's showing */
  // - its "person" is a character
  static { this.declareProp("person", { type: "Character" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }
}

/**
 * 
 * The whole Star Wars example as a site (epic `mockup` P1):  each of its collections, films, people, planets, species,
 * vehicles and starships, as a list page and a page for one of them.
 * Its pages are empty for now:  the click-through mockups draw them.
 * The site says where each page is, and fills what an address names:  "/films/:film" shows the film page, its film
 * the one the address names.
 * 
 */
export class FilmsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}
export const filmsPage = new FilmsPage()

export class FilmPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The film the address names:  /films/:film */
  // - its "film" is a film
  static { this.declareProp("film", { type: "Film" }) }
  get film() { return this.getProp("film") }
  set film(value) { this.setProp("film", value) }
}
export const filmPage = new FilmPage()

export class PeoplePage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}
export const peoplePage = new PeoplePage()

export class PersonPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The person the address names:  /people/:person */
  // - its "person" is a character
  static { this.declareProp("person", { type: "Character" }) }
  get person() { return this.getProp("person") }
  set person(value) { this.setProp("person", value) }
}
export const personPage = new PersonPage()

export class PlanetsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}
export const planetsPage = new PlanetsPage()

export class PlanetPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The planet the address names:  /planets/:planet */
  // - its "planet" is a planet
  static { this.declareProp("planet", { type: "Planet" }) }
  get planet() { return this.getProp("planet") }
  set planet(value) { this.setProp("planet", value) }
}
export const planetPage = new PlanetPage()

/** "species" is one and many:  so the list's page is "species list page" */
export class SpeciesListPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}
export const speciesListPage = new SpeciesListPage()

export class SpeciesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The species the address names:  /species/:species */
  // - its "species" is a species
  static { this.declareProp("species", { type: "Species" }) }
  get species() { return this.getProp("species") }
  set species(value) { this.setProp("species", value) }
}
export const speciesPage = new SpeciesPage()

export class VehiclesPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}
export const vehiclesPage = new VehiclesPage()

export class VehiclePage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The vehicle the address names:  /vehicles/:vehicle */
  // - its "vehicle" is a vehicle
  static { this.declareProp("vehicle", { type: "Vehicle" }) }
  get vehicle() { return this.getProp("vehicle") }
  set vehicle(value) { this.setProp("vehicle", value) }
}
export const vehiclePage = new VehiclePage()

export class StarshipsPage extends Page {
  static elementTag = core.defineElement(this, "test-project")
}
export const starshipsPage = new StarshipsPage()

export class StarshipPage extends Page {
  static elementTag = core.defineElement(this, "test-project")

  /** The starship the address names:  /starships/:starship */
  // - its "starship" is a starship
  static { this.declareProp("starship", { type: "Starship" }) }
  get starship() { return this.getProp("starship") }
  set starship(value) { this.setProp("starship", value) }
}
export const starshipPage = new StarshipPage()

export class GalaxyGuide extends Site {
  static elementTag = core.defineElement(this, "test-project")
  static pages = [{
    name: "films page",
    page: "FilmsPage",
    address: "/films",
    title: "Films",
    pages: [{
      name: "film page",
      page: "FilmPage",
      address: "/films/:film",
      title: "Film",
      params: ["film"]
    }]
  }, {
    name: "people page",
    page: "PeoplePage",
    address: "/people",
    title: "People",
    pages: [{
      name: "person page",
      page: "PersonPage",
      address: "/people/:person",
      title: "Person",
      params: ["person"]
    }]
  }, {
    name: "planets page",
    page: "PlanetsPage",
    address: "/planets",
    title: "Planets",
    pages: [{
      name: "planet page",
      page: "PlanetPage",
      address: "/planets/:planet",
      title: "Planet",
      params: ["planet"]
    }]
  }, {
    name: "species list page",
    page: "SpeciesListPage",
    address: "/species",
    title: "Species",
    pages: [{
      name: "species page",
      page: "SpeciesPage",
      address: "/species/:species",
      title: "Species",
      params: ["species"]
    }]
  }, {
    name: "vehicles page",
    page: "VehiclesPage",
    address: "/vehicles",
    title: "Vehicles",
    pages: [{
      name: "vehicle page",
      page: "VehiclePage",
      address: "/vehicles/:vehicle",
      title: "Vehicle",
      params: ["vehicle"]
    }]
  }, {
    name: "starships page",
    page: "StarshipsPage",
    address: "/starships",
    title: "Starships",
    pages: [{
      name: "starship page",
      page: "StarshipPage",
      address: "/starships/:starship",
      title: "Starship",
      params: ["starship"]
    }]
  }]
  static dialogs = [{ name: "settings dialog", view: "SettingsDialog" }]
  static sidebars = [{ name: "person sidebar", view: "PersonSidebar" }]
  static notFoundPage = { name: "not found page" }
  static errorPage = { name: "error page" }
}
export const galaxyGuide = new GalaxyGuide()

// -----------
if (!core.isCarryingOver) galaxyGuide.start()
