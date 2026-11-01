import { core, Thing, List, App, Place, prop, thing, drawn, position } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("Star Wars")
///////////////
// ## Star Wars
///////////////
// A guide to the galaxy, from two servers other people run, in one program:
//   swapi.info knows the films, people, planets and ships, and links them to each other by address
//   Wikipedia has the pictures, one page at a time
// Say what a field links to, and reading it follows the link:  `the name of its homeworld`.
// `star wars` and its types' fields are what this wrote, from looking at the server, cut down to what's used here:
//   spell place ingest https://swapi.info/api --into StarWars.spell --name "star wars"
//
// Star Wars and its pictures belong to Lucasfilm and Disney, the words to Wikipedia's writers.
// They're asked for as it runs, never kept here, and the page says where they come from.

core.heading("Where it all lives")
/** Show more:  only for a list with more to show, so it isn't all asked of Wikipedia at once */
export class MoreButton extends Thing {
  static { this.declareProp("full", { declaredAt: { path: "/StarWars.spell", start: 6954, end: 7045 }, readsFrom: ["star_wars"] }) }
  get full() {
    return core.itemCountOf(guide.listed) === guide.howMany
  }

  @drawn draw() {
    return core.drawRead(() => <div class={this.full ? "wide" : "hidden"}>
      <ui-button class="more" onClick={core.pressed(this, () => guide.showMore())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        Show more
      </ui-button>
    </div>, undefined, { waiting: () => <div class="hidden" />, failed: () => <div class="hidden" /> })
  }
}

/** A page of Wikipedia:  not every name has one, and a name may be someone else's (Zolan is a medicine) */
export class WikiPage extends Thing {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 7464, end: 7483 } })
  accessor title!: string

  // - its "about" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 7487, end: 7506 } })
  accessor about!: string

  // - its "summary" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 7510, end: 7531 } })
  accessor summary!: string

  // - its "picture" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 7535, end: 7556 } })
  accessor picture!: string

  // - its "address" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 7560, end: 7581 } })
  accessor address!: string

  static { this.declareProp("lowerAbout", { declaredAt: { path: "/StarWars.spell", start: 7585, end: 7629 }, readsFrom: ["wikipedia"] }) }
  get lowerAbout() {
    return this.about.toLocaleLowerCase()
  }

  static { this.declareProp("fits", { declaredAt: { path: "/StarWars.spell", start: 7633, end: 7817 }, readsFrom: ["wikipedia"] }) }
  get fits() {
    if (this.title.includes("List of")) return false
    return this.lowerAbout.includes("star wars") || this.lowerAbout.includes("fictional") || this.lowerAbout.includes(" film ")
  }

  static savedIn = { place: "wikipedia", collection: "wiki_pages" }
}

/** A picture:  its own page on Wikipedia, if it has one, else an initial on a colour */
export class Portrait extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "hue" is a number
  @prop({ type: "number" })
  accessor hue!: number

  // - its "shape" is text
  @prop({ type: "text" })
  accessor shape!: string

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 8003, end: 8051 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  get initial() {
    return core.getItemAt(this.name, 0)
  }

  static { this.declareProp("picture", { declaredAt: { path: "/StarWars.spell", start: 8104, end: 8206 }, readsFrom: ["wikipedia"] }) }
  get picture() {
    if (this.page && this.page.fits) return this.page.picture
    return ""
  }

  @drawn draw() {
    return (
      <span class={`portrait ${this.shape}`} style={`--hue: ${this.hue}`}>
        <span class="initial">{this.initial}</span>
        <slot name="photo">{this.drawPhoto()}</slot>
      </span>
    )
  }

  // Waiting for it, or if Wikipedia can't be reached, the initial stays
  drawPhoto() {
    return core.drawRead(() => <img class={this.picture === "" ? "hidden" : ""} src={this.picture} alt="" part="photo" />, undefined, { waiting: () => <span class="hidden" part="photo" />, failed: () => <span class="hidden" part="photo" /> })
  }
}

/** What Wikipedia says of it, and where to read the rest */
export class WikiNote extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  static { this.declareProp("page", { declaredAt: { path: "/StarWars.spell", start: 8754, end: 8802 }, readsFrom: ["wikipedia"] }) }
  get page() { return core.waitedValue(this, "page", async () => {
    return await core.savedThingWithId(WikiPage, this.name)
  }, () => [this.name]) }

  @drawn draw() {
    return core.drawRead(() => <p class={this.page && this.page.fits ? "note" : "hidden"}>
      {this.page.summary}
      <a href={this.page.address} target="_blank" rel="noopener">Read the rest on Wikipedia</a>
    </p>, undefined, { waiting: () => <p class="note waiting">Asking Wikipedia</p>, failed: () => <p class="note waiting">Wikipedia can't be reached just now.</p> })
  }
}

/** What they all have:  a card to click, a picture, a page */
export class Record extends Thing {
  // - its "label" is text
  @prop({ type: "text" })
  accessor label!: string

  // - its "kind" is text
  @prop({ type: "text" })
  accessor kind!: string

  // - its "shape" is text
  @prop({ type: "text" })
  accessor shape!: string

  static { this.declareProp("hue", { declaredAt: { path: "/StarWars.spell", start: 9325, end: 9366 }, readsFrom: ["star_wars"] }) }
  get hue() {
    return this.label.length * 47
  }

  /** A number for people to read, or that nobody knows */
  measureAmountInUnit(amount: number, unit: string) {
    if (amount === undefined) return "unknown"
    return `${core.withCommas(amount)} ${unit}`
  }

  open() {
    if (guide.showing) core.append(guide.trail, guide.showing)
    guide.search = ""
    guide.showing = this
    core.scrollToTop()
  }

  @drawn draw() {
    return (
      <ui-card class="card" appearance="link">
        {core.drawThing(new Portrait({
          name: this.label,
          hue: this.hue,
          shape: this.shape
        }))}
        <div class="words">
          <ui-button class="open" appearance="transparent" onClick={core.pressed(this, () => this.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            {this.label}
          </ui-button>
          <small>{this.kind}</small>
        </div>
      </ui-card>
    )
  }

  drawPage() {
    return <div part="page" />
  }

  // What a page can do besides read:  nothing, unless it says
  drawActions() {
    return <span part="actions" />
  }

  drawTop() {
    return (
      <>
        <ui-button class="back" appearance="transparent" icon="arrow left" onClick={core.pressed(this, () => guide.goBack())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Back
        </ui-button>
        <div class="hero">
          {core.drawThing(new Portrait({
            name: this.label,
            hue: this.hue,
            shape: this.shape
          }))}
          <div class="about">
            <h2>{this.label}</h2>
            <p class="kind">{this.kind}</p>
            <slot name="actions">{this.drawActions()}</slot>
            {core.drawThing(new WikiNote({ name: this.label }))}
          </div>
        </div>
      </>
    )
  }
}

/** A film */
export class Film extends Record {
  // - its "title" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 10680, end: 10699 } })
  accessor title!: string

  // - its "episode id" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 10703, end: 10731 } })
  accessor episodeId!: number

  // - its "opening crawl" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 10735, end: 10762 } })
  accessor openingCrawl!: string

  // - its "director" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 10766, end: 10788 } })
  accessor director!: string

  // - its "producer" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 10792, end: 10814 } })
  accessor producer!: string

  // - its "release date" is a date
  @prop({ type: "date", declaredAt: { path: "/StarWars.spell", start: 10818, end: 10846 } })
  accessor releaseDate!: Date

  // - its "characters" is a list of people
  static { this.declareProp("characters", { itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }), declaredAt: { path: "/StarWars.spell", start: 10850, end: 10886 } }) }
  get characters(): List<Person> { return core.linked(this, "characters", Person) as List<Person> }
  set characters(value: List<Person>) { this.setProp("characters", value) }

  // - its "planets" is a list of planets
  static { this.declareProp("planets", { itemType: "Planet", init: () => new List<Planet>({ instanceType: "Planet" }), declaredAt: { path: "/StarWars.spell", start: 10890, end: 10924 } }) }
  get planets(): List<Planet> { return core.linked(this, "planets", Planet) as List<Planet> }
  set planets(value: List<Planet>) { this.setProp("planets", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List<Starship>({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.spell", start: 10928, end: 10966 } }) }
  get starships(): List<Starship> { return core.linked(this, "starships", Starship) as List<Starship> }
  set starships(value: List<Starship>) { this.setProp("starships", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 10970, end: 10994 }, readsFrom: ["star_wars"] }) }
  get label(): string {
    return this.title
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 10998, end: 11039 }, readsFrom: ["star_wars"] }) }
  get kind(): string {
    return `Episode ${this.episodeId}`
  }

  play() {
    guide.playing = this
  }

  end() {
    guide.playing = undefined
  }

  drawActions() {
    return (
      <ui-button class="play" onClick={core.pressed(this, () => this.play())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="actions">
        Play the opening
      </ui-button>
    )
  }

  drawPage() {
    return [
      <slot name="top">{this.drawTop()}</slot>,
      <ui-table class="facts" appearance="very-basic" unstackable={true}>
        <table>
          <tbody>
            <tr>
              <th>Directed by</th>
              <td>{this.director}</td>
            </tr>
            <tr>
              <th>Produced by</th>
              <td>{this.producer}</td>
            </tr>
            <tr>
              <th>Released</th>
              <td>{core.dateShown(this.releaseDate)}</td>
            </tr>
          </tbody>
        </table>
      </ui-table>,
      <h3>Who's in it</h3>,
      core.drawRead(() => this.characters, (person: Person) => core.drawThing(person), { waiting: () => <ui-loader class="waiting" visible={true} inline={true} text={true} part="page">Following the links</ui-loader> }),
      <h3 part="page">Where it happens</h3>,
      core.drawRead(() => this.planets, (planet: Planet) => core.drawThing(planet)),
      <h3 part="page">What they fly</h3>,
      core.drawRead(() => this.starships, (starship: Starship) => core.drawThing(starship))
    ]
  }

  // The opening:  yellow, receding, and it stops when you say
  drawCrawl() {
    return (
      <ui-modal class="crawl" visible={true} overlay={true} fullscreen={true} on-ui-closed={() => this.end()} aria-label={`The opening of ${this.title}`} part="crawl">
        <div class="cinema">
          <div class="stars" aria-hidden="true" />
          <p class="long-ago">A long time ago in a galaxy far, far away....</p>
          <div class="stage">
            <div class="words">
              <p class="episode">Episode {this.episodeId}</p>
              <h2>{this.title}</h2>
              <p class="text">{this.openingCrawl}</p>
            </div>
          </div>
          <ui-button class="stop" onClick={core.pressed(this, () => this.end())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Stop
          </ui-button>
        </div>
      </ui-modal>
    )
  }

  static savedIn = { place: "star_wars", collection: "films" }
}

/** A person */
export class Person extends Record {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 12589, end: 12607 } })
  accessor name!: string

  // - its "height" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 12611, end: 12635 } })
  accessor height!: number

  // - its "mass" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 12639, end: 12661 } })
  accessor mass!: number

  // - its "hair color" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 12665, end: 12689 } })
  accessor hairColor!: string

  // - its "eye color" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 12693, end: 12716 } })
  accessor eyeColor!: string

  // - its "birth year" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 12720, end: 12744 } })
  accessor birthYear!: string

  // - its "gender" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 12748, end: 12768 } })
  accessor gender!: string

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.spell", start: 12772, end: 12799 } }) }
  get homeworld(): Planet { return core.linked(this, "homeworld", Planet) as Planet }
  set homeworld(value: Planet) { this.setProp("homeworld", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.spell", start: 12803, end: 12833 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  // - its "species" is a list of species
  static { this.declareProp("species", { itemType: "Species", init: () => new List<Species>({ instanceType: "Species" }), declaredAt: { path: "/StarWars.spell", start: 12837, end: 12871 } }) }
  get species(): List<Species> { return core.linked(this, "species", Species) as List<Species> }
  set species(value: List<Species>) { this.setProp("species", value) }

  // - its "vehicles" is a list of vehicles
  static { this.declareProp("vehicles", { itemType: "Vehicle", init: () => new List<Vehicle>({ instanceType: "Vehicle" }), declaredAt: { path: "/StarWars.spell", start: 12875, end: 12911 } }) }
  get vehicles(): List<Vehicle> { return core.linked(this, "vehicles", Vehicle) as List<Vehicle> }
  set vehicles(value: List<Vehicle>) { this.setProp("vehicles", value) }

  // - its "starships" is a list of starships
  static { this.declareProp("starships", { itemType: "Starship", init: () => new List<Starship>({ instanceType: "Starship" }), declaredAt: { path: "/StarWars.spell", start: 12915, end: 12953 } }) }
  get starships(): List<Starship> { return core.linked(this, "starships", Starship) as List<Starship> }
  set starships(value: List<Starship>) { this.setProp("starships", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 12957, end: 12980 }, readsFrom: ["star_wars"] }) }
  get label(): string {
    return this.name
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 12984, end: 13022 }, readsFrom: ["star_wars"] }) }
  get kind(): string {
    return `Born ${this.birthYear}`
  }

  drawPage() {
    return [
      <slot name="top">{this.drawTop()}</slot>,
      <ui-table class="facts" appearance="very-basic" unstackable={true}>
        <table>
          <tbody>
            <tr>
              <th>Height</th>
              <td class="number">{this.measureAmountInUnit(this.height, "cm")}</td>
            </tr>
            <tr>
              <th>Mass</th>
              <td class="number">{this.measureAmountInUnit(this.mass, "kg")}</td>
            </tr>
            <tr>
              <th>Born</th>
              <td>{this.birthYear}</td>
            </tr>
            <tr>
              <th>Hair</th>
              <td>{this.hairColor}</td>
            </tr>
            <tr>
              <th>Eyes</th>
              <td>{this.eyeColor}</td>
            </tr>
          </tbody>
        </table>
      </ui-table>,
      <h3>Home</h3>,
      core.drawThing(this.homeworld),
      <h3 part="page">Films</h3>,
      core.drawRead(() => this.films, (film: Film) => core.drawThing(film), { waiting: () => <ui-loader class="waiting" visible={true} inline={true} text={true} part="page">Following the links</ui-loader> }),
      <h3 part="page">What they are</h3>,
      core.drawRead(() => this.species, (one: Species) => core.drawThing(one), { none: () => <p class="none" part="page">Human, as far as anyone says.</p> }),
      <h3 part="page">What they fly</h3>,
      core.drawRead(() => this.starships, (starship: Starship) => core.drawThing(starship)),
      core.drawRead(() => this.vehicles, (vehicle: Vehicle) => core.drawThing(vehicle))
    ]
  }

  static savedIn = { place: "star_wars", collection: "people", select: ["name", "height", "mass", "hairColor", "eyeColor", "birthYear", "homeworld", "films", "species", "vehicles", "starships", "label", "kind", "shape"] }
}

/** A planet */
export class Planet extends Record {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 14027, end: 14045 } })
  accessor name!: string

  // - its "rotation period" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 14049, end: 14082 } })
  accessor rotationPeriod!: number

  // - its "orbital period" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 14086, end: 14118 } })
  accessor orbitalPeriod!: number

  // - its "diameter" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 14122, end: 14148 } })
  accessor diameter!: number

  // - its "climate" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 14152, end: 14173 } })
  accessor climate!: string

  // - its "gravity" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 14177, end: 14198 } })
  accessor gravity!: string

  // - its "terrain" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 14202, end: 14223 } })
  accessor terrain!: string

  // - its "surface water" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 14227, end: 14258 } })
  accessor surfaceWater!: number

  // - its "population" is a number
  @prop({ type: "number", declaredAt: { path: "/StarWars.spell", start: 14262, end: 14290 } })
  accessor population!: number

  // - its "residents" is a list of people
  static { this.declareProp("residents", { itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }), declaredAt: { path: "/StarWars.spell", start: 14294, end: 14329 } }) }
  get residents(): List<Person> { return core.linked(this, "residents", Person) as List<Person> }
  set residents(value: List<Person>) { this.setProp("residents", value) }

  // - its "films" is a list of films
  static { this.declareProp("films", { itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }), declaredAt: { path: "/StarWars.spell", start: 14333, end: 14363 } }) }
  get films(): List<Film> { return core.linked(this, "films", Film) as List<Film> }
  set films(value: List<Film>) { this.setProp("films", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 14367, end: 14390 }, readsFrom: ["star_wars"] }) }
  get label(): string {
    return this.name
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 14394, end: 14419 }, readsFrom: ["star_wars"] }) }
  get kind(): string {
    return this.climate
  }

  static { this.declareProp("shape", { declaredAt: { path: "/StarWars.spell", start: 14423, end: 14445 } }) }
  get shape(): string {
    return "world"
  }

  /** what colour a world is, from its weather */
  static { this.declareProp("hue", { declaredAt: { path: "/StarWars.spell", start: 14494, end: 14814 }, readsFrom: ["star_wars"] }) }
  get hue(): number {
    if (this.climate.includes("frozen")) return 200
    if (this.climate.includes("arid")) return 38
    if (this.climate.includes("murky") || this.climate.includes("polluted")) return 95
    if (this.climate.includes("tropical") || this.climate.includes("temperate")) return 130 + this.label.length * 9
    return 280
  }

  drawPage() {
    return [
      <slot name="top">{this.drawTop()}</slot>,
      <ui-table class="facts" appearance="very-basic" unstackable={true}>
        <table>
          <tbody>
            <tr>
              <th>Climate</th>
              <td>{this.climate}</td>
            </tr>
            <tr>
              <th>Terrain</th>
              <td>{this.terrain}</td>
            </tr>
            <tr>
              <th>Diameter</th>
              <td class="number">{this.measureAmountInUnit(this.diameter, "km")}</td>
            </tr>
            <tr>
              <th>Population</th>
              <td class="number">{this.measureAmountInUnit(this.population, "people")}</td>
            </tr>
            <tr>
              <th>A day</th>
              <td class="number">{this.measureAmountInUnit(this.rotationPeriod, "hours")}</td>
            </tr>
            <tr>
              <th>A year</th>
              <td class="number">{this.measureAmountInUnit(this.orbitalPeriod, "days")}</td>
            </tr>
          </tbody>
        </table>
      </ui-table>,
      <h3>Who's from here</h3>,
      core.drawRead(() => this.residents, (person: Person) => core.drawThing(person), { none: () => <p class="none" part="page">Nobody we know of.</p> }),
      <h3 part="page">Seen in</h3>,
      core.drawRead(() => this.films, (film: Film) => core.drawThing(film), { none: () => <p class="none" part="page">No film.</p> })
    ]
  }

  static savedIn = { place: "star_wars", collection: "planets", select: ["name", "rotationPeriod", "orbitalPeriod", "diameter", "climate", "terrain", "population", "residents", "films", "label", "kind", "shape"] }
}

/** A ship, or a vehicle:  much the same to look at */
export class Craft extends Record {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "model" is text
  @prop({ type: "text" })
  accessor model!: string

  // - its "manufacturer" is text
  @prop({ type: "text" })
  accessor manufacturer!: string

  // - its "cost in credits" is a number
  @prop({ type: "number" })
  accessor costInCredits!: number

  // - its "length" is a number
  @prop({ type: "number" })
  accessor length!: number

  // - its "crew" is text
  @prop({ type: "text" })
  accessor crew!: string

  // - its "passengers" is a number
  @prop({ type: "number" })
  accessor passengers!: number

  // - its "craft class" is text
  @prop({ type: "text" })
  accessor craftClass!: string

  // - its "pilots" is a list of people
  @prop({ itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }) })
  accessor pilots!: List<Person>

  // - its "films" is a list of films
  @prop({ itemType: "Film", init: () => new List<Film>({ instanceType: "Film" }) })
  accessor films!: List<Film>

  get label(): string {
    return this.name
  }

  get kind(): string {
    return this.craftClass
  }

  /** how long it is, in something you can picture:  an X-wing is 12.5 metres */
  get xWingsLong() {
    if (this.length === undefined) return undefined
    return Math.round(this.length / 12.5)
  }

  drawPage() {
    return [
      <slot name="top">{this.drawTop()}</slot>,
      <ui-table class="facts" appearance="very-basic" unstackable={true}>
        <table>
          <tbody>
            <tr>
              <th>Model</th>
              <td>{this.model}</td>
            </tr>
            <tr>
              <th>Made by</th>
              <td>{this.manufacturer}</td>
            </tr>
            <tr>
              <th>Length</th>
              <td class="number">{this.measureAmountInUnit(this.length, "m")}</td>
            </tr>
            <tr>
              <th>As long as</th>
              <td class="number">{this.measureAmountInUnit(this.xWingsLong, "X-wings")}</td>
            </tr>
            <tr>
              <th>Crew</th>
              <td class="number">{this.crew}</td>
            </tr>
            <tr>
              <th>Passengers</th>
              <td class="number">{this.measureAmountInUnit(this.passengers, "people")}</td>
            </tr>
            <tr>
              <th>Costs</th>
              <td class="number">{this.measureAmountInUnit(this.costInCredits, "credits")}</td>
            </tr>
          </tbody>
        </table>
      </ui-table>,
      <h3>Who flew it</h3>,
      core.drawRead(() => this.pilots, (person: Person) => core.drawThing(person), { none: () => <p class="none" part="page">Nobody named.</p> }),
      <h3 part="page">Seen in</h3>,
      core.drawRead(() => this.films, (film: Film) => core.drawThing(film))
    ]
  }
}

export class Starship extends Craft {
  static savedIn = { place: "star_wars", collection: "starships" }
}

export class Vehicle extends Craft {
  static savedIn = { place: "star_wars", collection: "vehicles" }
}

/** A species */
export class Species extends Record {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 17335, end: 17353 } })
  accessor name!: string

  // - its "classification" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 17357, end: 17385 } })
  accessor classification!: string

  // - its "language" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 17389, end: 17411 } })
  accessor language!: string

  // - its "average lifespan" is text
  @prop({ type: "text", declaredAt: { path: "/StarWars.spell", start: 17415, end: 17445 } })
  accessor averageLifespan!: string

  // - its "homeworld" is a planet
  static { this.declareProp("homeworld", { type: "Planet", link: true, declaredAt: { path: "/StarWars.spell", start: 17449, end: 17476 } }) }
  get homeworld(): Planet { return core.linked(this, "homeworld", Planet) as Planet }
  set homeworld(value: Planet) { this.setProp("homeworld", value) }

  // - its "people" is a list of people
  static { this.declareProp("people", { itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }), declaredAt: { path: "/StarWars.spell", start: 17480, end: 17512 } }) }
  get people(): List<Person> { return core.linked(this, "people", Person) as List<Person> }
  set people(value: List<Person>) { this.setProp("people", value) }

  static { this.declareProp("label", { declaredAt: { path: "/StarWars.spell", start: 17516, end: 17539 }, readsFrom: ["star_wars"] }) }
  get label(): string {
    return this.name
  }

  static { this.declareProp("kind", { declaredAt: { path: "/StarWars.spell", start: 17543, end: 17575 }, readsFrom: ["star_wars"] }) }
  get kind(): string {
    return this.classification
  }

  drawPage() {
    return [
      <slot name="top">{this.drawTop()}</slot>,
      <ui-table class="facts" appearance="very-basic" unstackable={true}>
        <table>
          <tbody>
            <tr>
              <th>Language</th>
              <td>{this.language}</td>
            </tr>
            <tr>
              <th>Lives for</th>
              <td>{this.averageLifespan}</td>
            </tr>
          </tbody>
        </table>
      </ui-table>,
      <h3>Home</h3>,
      core.drawThing(this.homeworld),
      <h3 part="page">Who's one</h3>,
      core.drawRead(() => this.people, (person: Person) => core.drawThing(person), { none: () => <p class="none" part="page">Nobody we know of.</p> })
    ]
  }

  static savedIn = { place: "star_wars", collection: "species" }
}

/** Where it all lives */
export class StarWar extends Place {}
export const starWars = core.place(new StarWar(), {
  name: "star_wars",
  kind: "web server",
  at: "https://swapi.info/api",
  idColumn: "url",
  checkedEvery: 86400,
  collections: {
    films: { at: "/films", fields: {
      episodeId: "episode_id",
      openingCrawl: "opening_crawl",
      releaseDate: "release_date"
    } },
    people: { at: "/people", fields: {
      hairColor: "hair_color",
      eyeColor: "eye_color",
      birthYear: "birth_year"
    } },
    planets: { at: "/planets", fields: {
      rotationPeriod: "rotation_period",
      orbitalPeriod: "orbital_period",
      surfaceWater: "surface_water"
    } },
    species: { at: "/species", fields: { averageLifespan: "average_lifespan" } },
    vehicles: { at: "/vehicles", fields: { costInCredits: "cost_in_credits", craftClass: "vehicle_class" } },
    starships: { at: "/starships", fields: { costInCredits: "cost_in_credits", craftClass: "starship_class" } }
  }, firstReads: () => [[Film], [Person], [Planet], [Vehicle], [Species], [Starship]] })

export class Wikipedia extends Place {}
export const wikipedia = core.place(new Wikipedia(), {
  name: "wikipedia",
  kind: "web server",
  at: "https://en.wikipedia.org/api/rest_v1",
  checkedEvery: 86400,
  collections: { wikiPages: { at: "/page/summary", fields: {
    id: "pageid",
    picture: "thumbnail.source",
    about: "description",
    summary: "extract",
    address: "content_urls.desktop.page"
  } } }
})

core.heading("The app:  what's showing, and how you get about")
/** The app:  what's showing, and how you get about */
@thing
export class Guide extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "showing" is a record
  @prop({ type: "Record" })
  accessor showing!: Record

  // - its "trail" is a new list of records
  @prop({ itemType: "Record", init: () => new List<Record>({ instanceType: "Record" }) })
  accessor trail!: List<Record>

  // - its "playing" is a film
  @prop({ type: "Film" })
  accessor playing!: Film

  // - its "jumping" is yes or no
  @prop({ type: "choice" })
  accessor jumping!: boolean

  // - its "how many" is a number
  @prop({ type: "number" })
  accessor howMany!: number

  get lookingFor() {
    return this.search.toLocaleLowerCase()
  }

  /** What the shelf lists:  whatever's found, else its tab's, a few at a time */
  static { this.declareProp("listed", { declaredAt: { path: "/StarWars.spell", start: 2524, end: 3003 }, readsFrom: ["star_wars"] }) }
  get listed() { return core.waitedValue(this, "listed", async () => {
    if (this.search !== "") return await core.answerOf(this, "found")
    if (this.tab === "films") return await core.savedThings(Film)
    if (this.tab === "people") return core.rangeStartingAt(await core.savedThings(Person), 0, this.howMany)
    if (this.tab === "planets") return core.rangeStartingAt(await core.savedThings(Planet), 0, this.howMany)
    if (this.tab === "vehicles") return core.rangeStartingAt(await core.savedThings(Vehicle), 0, this.howMany)
    if (this.tab === "species") return core.rangeStartingAt(await core.savedThings(Species), 0, this.howMany)
    return core.rangeStartingAt(await core.savedThings(Starship), 0, this.howMany)
  }, () => [this.search, this.tab, this.howMany]) }

  static { this.declareProp("found", { declaredAt: { path: "/StarWars.spell", start: 3008, end: 3870 }, readsFrom: ["star_wars"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const matches = new List<Record>({ instanceType: "Record" })
    core.map(core.filter(await core.savedThings(Film, {}, "looks through"), (film: Film) => film.title.toLocaleLowerCase().includes(this.lookingFor)), (film: Film) => matches.append(film))
    core.map(core.filter(await core.savedThings(Person, {}, "looks through"), (person: Person) => person.name.toLocaleLowerCase().includes(this.lookingFor)), (person: Person) => matches.append(person))
    core.map(core.filter(await core.savedThings(Planet, {}, "looks through"), (planet: Planet) => planet.name.toLocaleLowerCase().includes(this.lookingFor)), (planet: Planet) => matches.append(planet))
    core.map(core.filter(await core.savedThings(Starship, {}, "looks through"), (starship: Starship) => starship.name.toLocaleLowerCase().includes(this.lookingFor)), (starship: Starship) => matches.append(starship))
    core.map(core.filter(await core.savedThings(Vehicle, {}, "looks through"), (vehicle: Vehicle) => vehicle.name.toLocaleLowerCase().includes(this.lookingFor)), (vehicle: Vehicle) => matches.append(vehicle))
    core.map(core.getItemAt(this, position(core.filter(await core.savedThings(Species, {}, "looks through"), (species: Species) => species.name.toLocaleLowerCase().includes(this.lookingFor)))), (one) => matches.append(one))
    return matches
  }, () => [this.lookingFor]) }

  create() {
    this.tab = "films"
    this.howMany = 12
  }

  goBack() {
    if (core.isEmpty(this.trail)) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(this.trail, -1)
    core.removeItemAt(this.trail, -1)
    core.scrollToTop()
  }

  goToWhere(where: string) {
    this.tab = where
    this.search = ""
    this.showing = undefined
    core.clear(this.trail)
    this.howMany = 12
    core.scrollToTop()
  }

  showMore() {
    this.howMany = this.howMany + 12
  }

  /** Punch it:  a jump to light speed, and wherever it lands */
  async punch() {
    this.jumping = true
    const landing = core.randomItemOf<Person>(await core.savedThings(Person))
    await core.pauseFor(900, "msec")
    landing?.open()
    this.jumping = false
  }

  @drawn draw() {
    return [
      <div class="stars" aria-hidden="true" />,
      this.jumping ? <div class="jump" aria-hidden="true" /> : undefined,
      <header class="top">
        <ui-button class="logo" appearance="transparent" onClick={core.pressed(this, () => this.goToWhere("films"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Star Wars
        </ui-button>
        <ui-form class="find" value={this}>
          <ui-field label="Search the galaxy">
            <ui-input name="search" icon="search" placeholder="Luke, Hoth, Falcon" />
          </ui-field>
        </ui-form>
        <ui-button class="punch" color="primary" onClick={core.pressed(this, async () => await this.punch())} title="Jump to light speed, and land on someone" style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Punch it
        </ui-button>
      </header>,
      <ui-toolbar class="tabs" appearance="secondary pointing" aria-label="Browse">
        <ui-item active={this.tab === "films"} onClick={core.pressed(this, () => this.goToWhere("films"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Films
        </ui-item>
        <ui-item active={this.tab === "people"} onClick={core.pressed(this, () => this.goToWhere("people"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          People
        </ui-item>
        <ui-item active={this.tab === "planets"} onClick={core.pressed(this, () => this.goToWhere("planets"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Planets
        </ui-item>
        <ui-item active={this.tab === "ships"} onClick={core.pressed(this, () => this.goToWhere("ships"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Ships
        </ui-item>
        <ui-item active={this.tab === "vehicles"} onClick={core.pressed(this, () => this.goToWhere("vehicles"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Vehicles
        </ui-item>
        <ui-item active={this.tab === "species"} onClick={core.pressed(this, () => this.goToWhere("species"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Species
        </ui-item>
      </ui-toolbar>,
      <main class="shelf">
        <slot name="shelf">{this.drawShelf()}</slot>
      </main>,
      <footer class="credits">
        {"Films, people, planets and ships from "}
        <a href="https://swapi.info/">swapi.info</a>
        {". Pictures and what they're of from "}
        <a href="https://en.wikipedia.org/">Wikipedia</a>
        , asked for as you look. Star Wars belongs to Lucasfilm and Disney.
      </footer>,
      this.playing ? this.playing.drawCrawl() : undefined
    ]
  }

  drawShelf() {
    if (this.showing && this.search === "") return this.showing.drawPage()
    else {
      return [
        this.search !== "" ? <h2 class="heading" part="shelf">Searching for “{this.search}”</h2> : undefined,
        core.drawRead(() => this.listed, (record) => core.drawThing(record), {
          waiting: () => <div class="wide" part="shelf">
            <ui-loader visible={true} inline={true} text={true}>Waiting for a signal from swapi.info</ui-loader>
          </div>,
          none: () => <p class="none" part="shelf">Nobody and nothing by that name, in this galaxy.</p>,
          failed: () => <div class="wide" part="shelf">
            <ui-message color="red">
              <p>The signal from swapi.info is lost.</p>
              <ui-button onClick={core.pressed(this, () => core.reloadSaved())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
                Try again
              </ui-button>
            </ui-message>
          </div>
        }),
        core.drawThing(new MoreButton())
      ]
    }
  }
}

/**
 * `<test-project-app>`:  a guide, drawn in its own element, e.g. by `draw the guide`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its guide's properties;  its methods call its guide's.
 * - What every view's element does, e.g. drawing its guide, is `SpellElement`'s.
 */
export class GuideElement extends SpellElement<Guide> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "guide", [
    { name: "tab", kind: "string", description: "Its tab." },
    { name: "search", kind: "string", description: "Its search." },
    { name: "showing", kind: "string", description: "Its showing." },
    { name: "trail", kind: "json", description: "Its trail." },
    { name: "playing", kind: "string", description: "Its playing." },
    { name: "jumping", kind: "boolean", description: "Its jumping." },
    { name: "how-many", kind: "number", description: "Its howMany." }
  ])

  create() {
    return this.currentThing?.create()
  }

  goBack() {
    return this.currentThing?.goBack()
  }

  goToWhere(where: string) {
    return this.currentThing?.goToWhere(where)
  }

  showMore() {
    return this.currentThing?.showMore()
  }

  punch() {
    return this.currentThing?.punch()
  }

  drawShelf() {
    return this.currentThing?.drawShelf()
  }
}
core.useElement(Guide, GuideElement)
export const guide = new Guide()

core.heading("A page of Wikipedia:  not every name has one, and a name may be someone else's (Zolan is a medicine)")

core.heading("A film")

core.heading("A person")

core.heading("A planet")

core.heading("A ship, or a vehicle:  much the same to look at")

core.heading("A species")

if (!core.isCarryingOver) guide.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  how the guide looks, its own look, whichever scheme the page is in:  deep space, a starfield,¬   and the yellow of the title.¬   - \`color-scheme: dark\` here is what turns the Spell UI elements dark too.¬   - Every animation is under "no preference" for motion:  with reduced motion the stars stand still,¬     and the opening is a page you read at your own speed. */¬¬star-wars-app {¬  --space: #05060f;¬  --space-low: #0d1330;¬  --ink: #eef1ff;¬  --ink-muted: #a7aecb;¬  --yellow: #ffe81f;¬  --panel: rgb(255 255 255 / 6%);¬  --panel-hover: rgb(255 255 255 / 12%);¬  --edge: rgb(255 255 255 / 14%);¬  --glow: rgb(255 232 31 / 30%);¬  --title-font: "Arial Black", "Helvetica Neue", Impact, sans-serif;¬¬  color-scheme: dark;¬  position: relative;¬  isolation: isolate;¬  display: block;¬  min-height: 100vh;¬  overflow: clip;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: linear-gradient(var(--space), var(--space-low));¬  color: var(--ink);¬  font-size: 15px;¬}¬¬/****************¬ * The stars:  a few layers of dots, which drift¬ ****************/¬¬.stars {¬  position: absolute;¬  inset: 0;¬  z-index: -1;¬  pointer-events: none;¬  background-image:¬    radial-gradient(1px 1px at 20px 30px, #fff, transparent),¬    radial-gradient(1px 1px at 140px 80px, #dfe6ff, transparent),¬    radial-gradient(1.5px 1.5px at 240px 180px, #fff, transparent),¬    radial-gradient(1px 1px at 70px 210px, #ffe9c9, transparent),¬    radial-gradient(2px 2px at 290px 40px, #cfe0ff, transparent);¬  background-size:¬    310px 270px,¬    250px 310px,¬    370px 290px,¬    230px 340px,¬    430px 390px;¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .stars {¬    animation: drift 240s linear infinite;¬  }¬}¬¬@keyframes drift {¬  to {¬    background-position:¬      -310px 135px,¬      -500px 155px,¬      -370px 145px,¬      -460px 170px,¬      -430px 195px;¬  }¬}¬¬/****************¬ * Across the top:  the name, the search, and Punch it¬ ****************/¬¬.top {¬  display: flex;¬  flex-wrap: wrap;¬  align-items: end;¬  gap: 0.75em 1.5em;¬}¬¬.logo {¬  flex: none;¬¬  &::part(button) {¬    padding: 0;¬    background: none;¬    color: var(--yellow);¬    font: 900 1.9em / 1 var(--title-font);¬    letter-spacing: 0.02em;¬    text-transform: uppercase;¬  }¬}¬¬.find {¬  --ui-form-row-distance: 0;¬¬  flex: 1 1 14em;¬  max-width: 28em;¬  margin-inline-start: auto;¬}¬¬.punch {¬  flex: none;¬¬  &::part(button) {¬    background: var(--yellow);¬    color: var(--space);¬    font-weight: 800;¬  }¬}¬¬/****************¬ * The tabs¬ ****************/¬¬.tabs {¬  --ui-primary: var(--yellow);¬¬  margin-block: 1em;¬}¬¬/****************¬ * The shelf:  cards in a grid;  anything else across the whole of it¬ ****************/¬¬.shelf {¬  display: grid;¬  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13em), 1fr));¬  gap: 0.75em;¬  min-height: 20em;¬¬  .back,¬  .hero,¬  .facts,¬  .heading,¬  h3,¬  .none,¬  .wide {¬    grid-column: 1 / -1;¬  }¬¬  .back {¬    justify-self: start;¬  }¬¬  .hidden {¬    display: none;¬  }¬¬  h2,¬  h3 {¬    margin: 0;¬    color: var(--yellow);¬  }¬¬  h3 {¬    margin-block-start: 1em;¬    font-size: 1.05em;¬    letter-spacing: 0.06em;¬    text-transform: uppercase;¬  }¬¬  .none {¬    margin: 0;¬    color: var(--ink-muted);¬  }¬}¬¬/****************¬ * A card:  a picture, a name, what kind.  Its name is the button, and fills the card.¬ ****************/¬¬.card {¬  --ui-card-margin-block: 0;¬¬  position: relative;¬  overflow: hidden;¬  border-radius: 0.6em;¬  background: var(--panel);¬  box-shadow: 0 0 0 1px var(--edge);¬  transition:¬    background 120ms,¬    box-shadow 120ms,¬    translate 120ms;¬¬  &:hover,¬  &:focus-within {¬    background: var(--panel-hover);¬    box-shadow:¬      0 0 0 1px var(--yellow),¬      0 0 1.5em var(--glow);¬    translate: 0 -2px;¬  }¬¬  .words {¬    padding: 0.5em 0.75em 0.7em;¬  }¬¬  .open::part(button) {¬    padding: 0;¬    background: none;¬    color: var(--ink);¬    font-weight: 700;¬    text-align: start;¬    white-space: normal;¬  }¬¬  .open::part(button)::after {¬    content: "";¬    position: absolute;¬    inset: 0;¬  }¬¬  small {¬    display: block;¬    color: var(--ink-muted);¬  }¬}¬¬/****************¬ * A picture, over an initial on a colour, so nothing's ever a broken image.  A world is a world.¬ ****************/¬¬.portrait {¬  --hue: 200;¬¬  position: relative;¬  display: grid;¬  place-items: center;¬  aspect-ratio: 4 / 3;¬  overflow: hidden;¬  background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 70% 58%), hsl(var(--hue) 60% 18%));¬¬  .initial {¬    color: rgb(255 255 255 / 85%);¬    font: 900 3.4em / 1 var(--title-font);¬  }¬¬  img {¬    position: absolute;¬    inset: 0;¬    width: 100%;¬    height: 100%;¬    object-fit: cover;¬    object-position: 50% 20%;¬  }¬¬  &.world {¬    background: radial-gradient(circle at 50% 50%, rgb(255 255 255 / 5%), transparent 70%);¬¬    &::before {¬      content: "";¬      position: absolute;¬      height: 78%;¬      aspect-ratio: 1;¬      border-radius: 50%;¬      background: radial-gradient(circle at 35% 30%, hsl(var(--hue) 75% 62%), hsl(var(--hue) 60% 14%) 75%);¬      box-shadow: 0 0 2em hsl(var(--hue) 70% 50% / 35%);¬    }¬¬    .initial {¬      position: relative;¬    }¬  }¬}¬¬/****************¬ * A whole page¬ ****************/¬¬.hero {¬  display: flex;¬  flex-wrap: wrap;¬  gap: 1em 1.5em;¬  align-items: start;¬¬  star-wars-portrait,¬  > .portrait {¬    flex: 1 1 16em;¬    max-width: 22em;¬  }¬¬  .about {¬    flex: 999 1 20em;¬    min-width: 0;¬  }¬¬  h2 {¬    font: 900 clamp(1.6em, 5vw, 2.8em) / 1.05 var(--title-font);¬    text-transform: uppercase;¬  }¬¬  .kind {¬    margin: 0.25em 0 0;¬    color: var(--ink-muted);¬  }¬¬  .note {¬    margin: 0.75em 0 0;¬    max-width: 44em;¬  }¬¬  .note.waiting {¬    color: var(--ink-muted);¬  }¬¬  .note a {¬    margin-inline-start: 0.25em;¬    color: var(--yellow);¬    white-space: nowrap;¬  }¬¬  .portrait {¬    border-radius: 0.6em;¬    box-shadow: 0 0 0 1px var(--edge);¬  }¬}¬¬.play {¬  display: block;¬  margin-block-start: 0.75em;¬¬  &::part(button) {¬    background: var(--yellow);¬    color: var(--space);¬    font-weight: 800;¬  }¬}¬¬.facts {¬  display: block;¬  max-width: 30em;¬¬  td {¬    color: var(--ink);¬  }¬¬  th {¬    width: 8em;¬    color: var(--ink-muted);¬    font-weight: 500;¬    text-align: start;¬    white-space: nowrap;¬  }¬¬  td.number {¬    font-variant-numeric: tabular-nums;¬    text-align: end;¬  }¬}¬¬.credits {¬  margin-block-start: 2.5em;¬  color: var(--ink-muted);¬  font-size: 0.85em;¬¬  a {¬    color: inherit;¬    text-decoration: underline;¬  }¬}¬¬/****************¬ * The jump to light speed:  the stars stretch into lines, then you're there¬ ****************/¬¬.jump {¬  position: absolute;¬  inset: 0;¬  z-index: 5;¬  pointer-events: none;¬  background:¬    repeating-conic-gradient(from 3deg at 50% 45vh, #dfe6ff 0 0.15deg, transparent 0.15deg 3deg),¬    var(--space);¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .jump {¬    animation: jump 900ms ease-in both;¬  }¬}¬¬@keyframes jump {¬  from {¬    opacity: 0;¬    scale: 0.2;¬  }¬  40% {¬    opacity: 1;¬  }¬  to {¬    opacity: 1;¬    scale: 3;¬  }¬}¬¬/****************¬ * The opening:  yellow words going away, over deep space.  A modal the whole window high, so it's a cinema, and Escape ends it.¬ ****************/¬¬.crawl {¬  color-scheme: dark;¬}¬¬.crawl::part(modal) {¬  background: #05060f;¬  padding: 0;¬}¬¬.cinema {¬  --space: #05060f;¬  --yellow: #ffe81f;¬¬  position: relative;¬  height: 100vh;¬  overflow: hidden;¬  background: var(--space);¬  color: var(--yellow);¬¬  .stars {¬    z-index: 0;¬  }¬¬  .stop {¬    position: absolute;¬    inset: 1em 1em auto auto;¬    z-index: 1;¬  }¬¬  .long-ago {¬    position: absolute;¬    inset: 38% 0 auto;¬    margin: 0 auto;¬    max-width: 22em;¬    padding-inline: 1em;¬    color: #4bd5ee;¬    font-size: 1.4em;¬    opacity: 0;¬  }¬¬  .stage {¬    position: absolute;¬    inset: 0;¬    perspective: 340px;¬    perspective-origin: 50% 40%;¬  }¬¬  .words {¬    position: absolute;¬    inset: auto 0 0;¬    margin-inline: auto;¬    width: min(88%, 30em);¬    font: 700 clamp(1.3em, 3.2vw, 2.8em) / 1.45 "Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif;¬    text-align: justify;¬    transform-origin: 50% 100%;¬    transform: rotateX(24deg);¬  }¬¬  h2,¬  .episode {¬    margin: 0 0 0.6em;¬    color: inherit;¬    text-align: center;¬  }¬¬  h2 {¬    font: inherit;¬    font-size: 1.6em;¬    text-transform: uppercase;¬  }¬¬  /* its lines are the film's own, so it's they that are centred, not each word */¬  .text {¬    width: fit-content;¬    margin: 0 auto;¬    text-align: start;¬    white-space: pre-line;¬  }¬}¬¬@media (prefers-reduced-motion: no-preference) {¬  .cinema {¬    .long-ago {¬      animation: long-ago 5s ease-in-out both;¬    }¬¬    .words {¬      animation: crawl 70s linear 5s both;¬    }¬  }¬}¬¬/* with reduced motion:  no tilt, no movement, the whole of it to read */¬@media (prefers-reduced-motion: reduce) {¬  .cinema {¬    overflow: auto;¬¬    .long-ago,¬    .stage,¬    .words {¬      position: static;¬      opacity: 1;¬      transform: none;¬    }¬¬    .stage {¬      padding: 1em;¬    }¬  }¬}¬¬@keyframes long-ago {¬  0%,¬  100% {¬    opacity: 0;¬  }¬  20%,¬  80% {¬    opacity: 1;¬  }¬}¬¬@keyframes crawl {¬  from {¬    transform: rotateX(24deg) translateY(100%);¬  }¬  to {¬    transform: rotateX(24deg) translateY(-160%) translateZ(-900px);¬  }¬}¬¬/****************¬ * On a phone:  everything stacks, and there's room for two cards across¬ ****************/¬¬@media (max-width: 34em) {¬  .find {¬    flex-basis: 100%;¬    order: 3;¬    max-width: none;¬    margin: 0;¬  }¬¬  .logo::part(button) {¬    font-size: 1.45em;¬  }¬¬  .punch {¬    margin-inline-start: auto;¬  }¬¬  .shelf {¬    grid-template-columns: repeat(2, minmax(0, 1fr));¬  }¬}¬`)

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `GuideElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
