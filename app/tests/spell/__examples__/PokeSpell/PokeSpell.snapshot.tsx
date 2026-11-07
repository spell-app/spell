import { core, Thing, List, App, Place, prop, thing, drawn, position, withSpellPositions } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("PokéAPI:  every pokemon, and all about it")
///////////////////////////////////////////////
// ## PokéAPI:  every pokemon, and all about it
///////////////////////////////////////////////
// A server other people run, and what it holds.  No game yet:  its lists give only names, each one's page the rest.
// `poke api` is what this wrote, from looking at the server:
//   spell place ingest https://pokeapi.co/api/v2 --into PokeSpell.api.spell --name "poke api" --no-ai
//     --collections pokemon,pokemon-species,type,ability,move,evolution-chain,generation
// `spell place update PokeSpell.api.spell` looks again, and changes only this file and PokeSpell.api.json5.
// A height is in tenths of a metre, a weight in tenths of a kilogram, as PokéAPI keeps them.
//
// Pokémon belongs to Nintendo, Game Freak and Creatures.

export class Pokemon extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 1286, end: 1326 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1330, end: 1348 } })
  accessor name!: string

  // - its "base experience" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1352, end: 1385 } })
  accessor baseExperience!: number

  // - its "height" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1389, end: 1413 } })
  accessor height!: number

  // - its "default" is yes or no, stored as "is_default"
  @prop({ type: "choice", storedAs: "is_default", declaredAt: { path: "/PokeSpell.api.spell", start: 1417, end: 1467 } })
  accessor default!: boolean

  // - its "order" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1471, end: 1494 } })
  accessor order!: number

  // - its "weight" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1498, end: 1522 } })
  accessor weight!: number

  // - its "abilities" is a list of pokemon abilities
  @prop({ itemType: "PokemonAbility", init: () => new List<PokemonAbility>({ instanceType: "PokemonAbility" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1526, end: 1572 } })
  accessor abilities!: List<PokemonAbility>

  // - its "past abilities" is a list of past abilities
  @prop({ itemType: "PastAbility", init: () => new List<PastAbility>({ instanceType: "PastAbility" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1576, end: 1624 } })
  accessor pastAbilities!: List<PastAbility>

  // - its "forms" is a list of poke api names
  @prop({ itemType: "PokeApiName", init: () => new List<PokeApiName>({ instanceType: "PokeApiName" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1628, end: 1667 } })
  accessor forms!: List<PokeApiName>

  // - its "game indices" is a list of game indices
  @prop({ itemType: "GameIndex", init: () => new List<GameIndex>({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1671, end: 1715 } })
  accessor gameIndices!: List<GameIndex>

  // - its "held items" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1719, end: 1753 } })
  accessor heldItems!: List<string>

  /** an address */
  // - its "location area encounters" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1757, end: 1795 } })
  accessor locationAreaEncounters!: string

  // - its "moves" is a list of pokemon moves
  @prop({ itemType: "PokemonMove", init: () => new List<PokemonMove>({ instanceType: "PokemonMove" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1814, end: 1852 } })
  accessor moves!: List<PokemonMove>

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 1856, end: 1890 } }) }
  get species(): PokemonSpecies { return core.linked(this, "species", PokemonSpecies) as PokemonSpecies }
  set species(value: PokemonSpecies) { this.setProp("species", value) }

  // - its "sprites" is a sprite
  @prop({ type: "Sprite", declaredAt: { path: "/PokeSpell.api.spell", start: 1894, end: 1919 } })
  accessor sprites!: Sprite

  // - its "cries" is a cry
  @prop({ type: "Cry", declaredAt: { path: "/PokeSpell.api.spell", start: 1923, end: 1943 } })
  accessor cries!: Cry

  // - its "stats" is a list of stats
  @prop({ itemType: "Stat", init: () => new List<Stat>({ instanceType: "Stat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1947, end: 1977 } })
  accessor stats!: List<Stat>

  // - its "past stats" is a list of past stats
  @prop({ itemType: "PastStat", init: () => new List<PastStat>({ instanceType: "PastStat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1981, end: 2021 } })
  accessor pastStats!: List<PastStat>

  // - its "types" is a list of pokemon types
  @prop({ itemType: "PokemonType", init: () => new List<PokemonType>({ instanceType: "PokemonType" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2025, end: 2063 } })
  accessor types!: List<PokemonType>

  // - its "past types" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2067, end: 2101 } })
  accessor pastTypes!: List<string>

  /** Its big picture, the official artwork */
  static { this.declareProp("picture", { declaredAt: { path: "/Pokemon.spellml", start: 434, end: 585 }, readsFrom: ["poke_api"] }) }
  get picture() {
    return this.sprites?.other?.officialArtwork?.frontDefault
  }

  /** What it says:  its cry, a sound file */
  static { this.declareProp("sound", { declaredAt: { path: "/Pokemon.spellml", start: 600, end: 702 }, readsFrom: ["poke_api"] }) }
  get sound() {
    return this.cries?.latest
  }

  /** Its number as the games write it, four figures:  #0001 */
  static { this.declareProp("numberTag", { declaredAt: { path: "/Pokemon.spellml", start: 717, end: 984 }, readsFrom: ["poke_api"] }) }
  get numberTag() {
    if (this.number < 10) return `#000${this.number}`
    if (this.number < 100) return `#00${this.number}`
    if (this.number < 1000) return `#0${this.number}`
    return `#${this.number}`
  }

  /** Its family, from the first:  its species' evolution chain */
  static { this.declareProp("evolutions", { declaredAt: { path: "/Pokemon.spellml", start: 999, end: 1151 }, readsFrom: ["poke_api"] }) }
  get evolutions() {
    return this.species?.evolutionChain?.chain
  }

  /** Is it one of your favourites? */
  static { this.declareProp("loved", { declaredAt: { path: "/Pokemon.spellml", start: 1166, end: 1311 }, readsFrom: ["my_favourites"] }) }
  get loved() { return core.waitedValue(this, "loved", async () => {
    const address = this.id
    return core.itemCountOf(await core.savedThings(Favourite, { filter: { address: address } })) > 0
  }, () => [this.id]) }

  /** Its own page:  the page before it is kept, for Back */
  async open() {
    if ((await core.answerOf(pokedex, "showing")) === this) return
    if (await core.answerOf(pokedex, "showing")) {
      // the last one's cry ends with its page
      core.stop((await core.answerOf(pokedex, "showing"))?.sound!)
      core.append(await core.answerOf(pokedex, "trail"), (await core.answerOf(pokedex, "showing"))!)
    }
    pokedex.search = ""
    pokedex.showing = this
    // its cry loads now, still, so Hear it plays it at once
    core.stop(this.sound)
    core.scrollToTop()
  }

  /** Its cry, from the start:  played by the click itself, so every browser lets it */
  hear() {
    core.play(this.sound)
  }

  /** Its heart:  keep it as a favourite, or let it go */
  async love() {
    const address = this.id
    if (core.itemCountOf(await core.savedThings(Favourite, { filter: { address: address } })) > 0) await core.inOneGo(async () => core.map(core.filter(await core.savedThings(Favourite, { filter: { address: address } }), (favourite: Favourite) => favourite.address === address), (favourite: Favourite) => core.removeSaved(favourite)))
    else core.saveThing(new Favourite({ name: this.name, address: address }))
  }

  /** Its card:  a click anywhere on it opens its page */
  @drawn draw() {
    return (
      <ui-card appearance="link raised" onClick={core.pressed(this, async () => await this.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        <ui-image appearance="circular" background="yellow" src={this.picture} alt="" aspect-ratio="1" />
        <ui-content>
          <ui-header size="large" font="title-caps">{this.name}</ui-header>
          <ui-meta>Number {this.number}</ui-meta>
        </ui-content>
      </ui-card>
    )
  }

  drawPage() {
    return [
      <ui-stack direction="horizontal" wrap={true} align="center">
        <ui-image appearance="circular" background="yellow" size="large" src={this.picture} alt={this.name} aspect-ratio="1" />
        <ui-stack fluid={true} align="start">
          <ui-header size="poster" color="red" font="title-caps heavy">{this.name}</ui-header>
          <ui-text size="huge">Number {this.number}</ui-text>
          <ui-stack direction="horizontal" wrap={true}>
            <slot name="kinds">{this.drawKinds()}</slot>
          </ui-stack>
          <ui-text size="large">
            <ui-dimension value={this.height * 10} dimension="length" unit="cm" />
            {" tall, and "}
            <ui-dimension value={this.weight / 10} dimension="weight" unit="kg" />
            {" heavy"}
          </ui-text>
          <ui-stack direction="horizontal" align="center">
            <slot name="heart">{this.drawHeart()}</slot>
            <ui-button color="blue" appearance="circular" size="massive" icon="volume up" onClick={core.pressed(this, () => this.hear())} title="Hear it" aria-label="Hear it" style="cursor:var(--ui-control-cursor,pointer);user-select:none" />
          </ui-stack>
        </ui-stack>
      </ui-stack>,
      <ui-header size="large">How strong is it?</ui-header>,
      <slot name="strengths">{this.drawStrengths()}</slot>,
      <ui-header class="section" size="large" part="page">Evolutions</ui-header>,
      <slot name="family">{this.drawFamily()}</slot>
    ]
  }

  // Its evolutions in a row, from the first:  each one's own part, as each reads PokéAPI
  drawFamily() {
    return core.drawThing(this.evolutions)
  }

  // Its place in its family:  a round picture, its name, number and kinds;  a click opens its page
  drawEvolution() {
    return (
      <ui-card appearance="link" width="10em" onClick={core.pressed(this, async () => await this.open())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="evolution">
        <ui-image appearance="circular" background="yellow" aspect-ratio="1" size="small" align="center" src={this.picture} alt="" />
        <ui-content align="center">
          <ui-header>{this.name}</ui-header>
          <ui-meta>{this.numberTag}</ui-meta>
          <slot name="pills">{this.drawPills()}</slot>
        </ui-content>
      </ui-card>
    )
  }

  // Its kinds, small:  a group of labels sizes them all
  drawPills() {
    return core.drawRead(() => this.types, (type: Pokemontype) => core.drawThing(type), { items: () => <ui-labels size="small" part="pills" /> })
  }

  // Full and red when it's a favourite;  press it to change
  drawHeart() {
    if (this.loved) return <ui-button color="red" appearance="circular" size="massive" icon="heart" onClick={core.pressed(this, async () => await this.love())} title="One of my favourites" aria-label="One of my favourites" style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="heart" />
    else return <ui-button appearance="circular" size="massive" icon="heart outline" onClick={core.pressed(this, async () => await this.love())} title="Keep it as a favourite" aria-label="Keep it as a favourite" style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="heart" />
  }

  // Its kinds, big:  a group of labels sizes them all
  drawKinds() {
    return core.drawRead(() => this.types, (type: Pokemontype) => core.drawThing(type), { items: () => <ui-labels size="huge" part="kinds" /> })
  }

  // A bar for each of its six numbers:  255 is as strong as any Pokémon gets
  drawStrengths() {
    return core.drawEach(this.stats, withSpellPositions((stat: Stat, place: number) => <ui-progress max-width="36em" value={stat.baseStat} total="255" color="green" size="large" label={`${core.getItemAt(strengthWords, position(place))}:  {value}`} part="strengths" />))
  }

  static savedIn = { place: "poke_api", collection: "pokemon", select: ["number", "name", "height", "weight", "species", "sprites", "cries", "stats", "types"] }
}

export class PokemonSpecies extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 2162, end: 2202 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2206, end: 2224 } })
  accessor name!: string

  // - its "order" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2228, end: 2251 } })
  accessor order!: number

  // - its "gender rate" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2255, end: 2284 } })
  accessor genderRate!: number

  // - its "capture rate" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2288, end: 2318 } })
  accessor captureRate!: number

  // - its "base happiness" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2322, end: 2354 } })
  accessor baseHappiness!: number

  // - its "baby" is yes or no, stored as "is_baby"
  @prop({ type: "choice", storedAs: "is_baby", declaredAt: { path: "/PokeSpell.api.spell", start: 2358, end: 2402 } })
  accessor baby!: boolean

  // - its "legendary" is yes or no, stored as "is_legendary"
  @prop({ type: "choice", storedAs: "is_legendary", declaredAt: { path: "/PokeSpell.api.spell", start: 2406, end: 2460 } })
  accessor legendary!: boolean

  // - its "mythical" is yes or no, stored as "is_mythical"
  @prop({ type: "choice", storedAs: "is_mythical", declaredAt: { path: "/PokeSpell.api.spell", start: 2464, end: 2516 } })
  accessor mythical!: boolean

  // - its "hatch counter" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2520, end: 2551 } })
  accessor hatchCounter!: number

  // - its "gender differences" is yes or no, stored as "has_gender_differences"
  @prop({ type: "choice", storedAs: "has_gender_differences", declaredAt: { path: "/PokeSpell.api.spell", start: 2555, end: 2628 } })
  accessor genderDifferences!: boolean

  // - its "forms switchable" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/PokeSpell.api.spell", start: 2632, end: 2667 } })
  accessor formsSwitchable!: boolean

  // - its "growth rate" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2671, end: 2707 } })
  accessor growthRate!: PokeApiName

  // - its "pokedex numbers" is a list of pokedex numbers
  @prop({ itemType: "PokedexNumber", init: () => new List<PokedexNumber>({ instanceType: "PokedexNumber" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2711, end: 2761 } })
  accessor pokedexNumbers!: List<PokedexNumber>

  // - its "egg groups" is a list of poke api names
  @prop({ itemType: "PokeApiName", init: () => new List<PokeApiName>({ instanceType: "PokeApiName" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2765, end: 2809 } })
  accessor eggGroups!: List<PokeApiName>

  // - its "color" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2813, end: 2843 } })
  accessor color!: PokeApiName

  // - its "shape" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2847, end: 2877 } })
  accessor shape!: PokeApiName

  // - its "evolves from species" is a pokemon species
  static { this.declareProp("evolvesFromSpecies", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2881, end: 2928 } }) }
  get evolvesFromSpecies(): PokemonSpecies { return core.linked(this, "evolvesFromSpecies", PokemonSpecies) as PokemonSpecies }
  set evolvesFromSpecies(value: PokemonSpecies) { this.setProp("evolvesFromSpecies", value) }

  // - its "evolution chain" is an evolution chain
  static { this.declareProp("evolutionChain", { type: "EvolutionChain", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2932, end: 2975 } }) }
  get evolutionChain(): EvolutionChain { return core.linked(this, "evolutionChain", EvolutionChain) as EvolutionChain }
  set evolutionChain(value: EvolutionChain) { this.setProp("evolutionChain", value) }

  // - its "habitat" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 2979, end: 3011 } })
  accessor habitat!: PokeApiName

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3015, end: 3047 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3051, end: 3081 } })
  accessor names!: List<Name>

  // - its "pal park encounters" is a list of pal park encounters
  @prop({ itemType: "PalParkEncounter", init: () => new List<PalParkEncounter>({ instanceType: "PalParkEncounter" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3085, end: 3143 } })
  accessor palParkEncounters!: List<PalParkEncounter>

  // - its "form descriptions" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3147, end: 3188 } })
  accessor formDescriptions!: List<string>

  // - its "flavor text entries" is a list of flavor text entries
  @prop({ itemType: "FlavorTextEntry", init: () => new List<FlavorTextEntry>({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3192, end: 3250 } })
  accessor flavorTextEntries!: List<FlavorTextEntry>

  // - its "genera" is a list of genera
  @prop({ itemType: "Genus", init: () => new List<Genus>({ instanceType: "Genus" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3254, end: 3286 } })
  accessor genera!: List<Genus>

  // - its "varieties" is a list of varieties
  @prop({ itemType: "Variety", init: () => new List<Variety>({ instanceType: "Variety" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3290, end: 3328 } })
  accessor varieties!: List<Variety>

  /** The Pokémon it is, as the games show it first */
  static { this.declareProp("pokemon", { declaredAt: { path: "/Pokemon.spellml", start: 7913, end: 8049 }, readsFrom: ["poke_api", "my_favourites"] }) }
  get pokemon() { return core.waitedValue(this, "pokemon", async () => {
    return await core.answerOf(core.getItemAt(this.varieties, 0), "pokemon")
  }, () => [this.varieties]) }

  static drawsWaiting = true
  @drawn draw() {
    return this.pokemon.drawEvolution()
  }

  static savedIn = { place: "poke_api", collection: "pokemon_species", select: ["number", "name", "evolutionChain", "varieties"] }
}

export class Type extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3378, end: 3418 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3422, end: 3440 } })
  accessor name!: string

  // - its "damage relations" is a damage relation
  @prop({ type: "DamageRelation", declaredAt: { path: "/PokeSpell.api.spell", start: 3444, end: 3487 } })
  accessor damageRelations!: DamageRelation

  // - its "past damage relations" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3491, end: 3536 } })
  accessor pastDamageRelations!: List<string>

  // - its "game indices" is a list of game indices
  @prop({ itemType: "GameIndex", init: () => new List<GameIndex>({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3540, end: 3584 } })
  accessor gameIndices!: List<GameIndex>

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3588, end: 3620 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "move damage class" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 3624, end: 3666 } })
  accessor moveDamageClass!: PokeApiName

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3670, end: 3700 } })
  accessor names!: List<Name>

  // - its "pokemon" is a list of type pokemon
  @prop({ itemType: "TypePokemon", init: () => new List<TypePokemon>({ instanceType: "TypePokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3704, end: 3743 } })
  accessor pokemon!: List<TypePokemon>

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3747, end: 3777 } }) }
  get moves(): List<Move> { return core.linked(this, "moves", Move) as List<Move> }
  set moves(value: List<Move>) { this.setProp("moves", value) }

  /** Two kinds no Pokémon is:  only in the games' code */
  static { this.declareProp("isReal", { declaredAt: { path: "/Pokemon.spellml", start: 5345, end: 5520 }, readsFrom: ["poke_api"] }) }
  get isReal() {
    return this.name !== "unknown" && this.name !== "shadow" && this.name !== "stellar"
  }

  /** Each kind's colour, as the games paint it */
  static { this.declareProp("colour", { declaredAt: { path: "/Pokemon.spellml", start: 5533, end: 6239 }, readsFrom: ["poke_api"] }) }
  get colour() {
    if (this.name === "fire") return "red"
    if (this.name === "water" || this.name === "ice") return "blue"
    if (this.name === "grass" || this.name === "bug") return "green"
    if (this.name === "electric") return "yellow"
    if (this.name === "psychic" || this.name === "fairy") return "pink"
    if (this.name === "poison" || this.name === "ghost") return "purple"
    if (this.name === "dragon") return "violet"
    if (this.name === "ground" || this.name === "rock" || this.name === "fighting") return "brown"
    if (this.name === "flying") return "teal"
    if (this.name === "dark") return "black"
    if (this.name === "steel") return "grey"
    return "orange"
  }

  /** See every Pokémon of this kind */
  async pick() {
    pokedex.pickedKind = this
    pokedex.showing = undefined
  }

  /** A big button:  press it to see every Pokémon of this kind */
  @drawn draw() {
    return (
      <ui-button class="kind" color={this.colour} size="large" font="title-caps" onClick={core.pressed(this, async () => await this.pick())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {this.name}
      </ui-button>
    )
  }

  static savedIn = { place: "poke_api", collection: "types", select: ["number", "name", "pokemon"] }
}

export class Ability extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3831, end: 3871 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3875, end: 3893 } })
  accessor name!: string

  // - its "main series" is yes or no, stored as "is_main_series"
  @prop({ type: "choice", storedAs: "is_main_series", declaredAt: { path: "/PokeSpell.api.spell", start: 3897, end: 3955 } })
  accessor mainSeries!: boolean

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3959, end: 3991 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3995, end: 4025 } })
  accessor names!: List<Name>

  // - its "effect entries" is a list of effect entries
  @prop({ itemType: "EffectEntry", init: () => new List<EffectEntry>({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4029, end: 4077 } })
  accessor effectEntries!: List<EffectEntry>

  // - its "effect changes" is a list of effect changes
  @prop({ itemType: "EffectChange", init: () => new List<EffectChange>({ instanceType: "EffectChange" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4081, end: 4129 } })
  accessor effectChanges!: List<EffectChange>

  // - its "flavor text entries" is a list of flavor text entries
  @prop({ itemType: "FlavorTextEntry", init: () => new List<FlavorTextEntry>({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4133, end: 4191 } })
  accessor flavorTextEntries!: List<FlavorTextEntry>

  // - its "pokemon" is a list of ability pokemon
  @prop({ itemType: "AbilityPokemon", init: () => new List<AbilityPokemon>({ instanceType: "AbilityPokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4195, end: 4237 } })
  accessor pokemon!: List<AbilityPokemon>

  static savedIn = { place: "poke_api", collection: "abilities", select: ["number", "name", "pokemon"] }
}

export class Move extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 4287, end: 4327 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4331, end: 4349 } })
  accessor name!: string

  // - its "accuracy" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4353, end: 4379 } })
  accessor accuracy!: number

  // - its "pp" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4383, end: 4403 } })
  accessor pp!: number

  // - its "priority" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4407, end: 4433 } })
  accessor priority!: number

  // - its "power" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4437, end: 4460 } })
  accessor power!: number

  // - its "contest combos" is a contest combo
  @prop({ type: "ContestCombo", declaredAt: { path: "/PokeSpell.api.spell", start: 4464, end: 4503 } })
  accessor contestCombos!: ContestCombo

  // - its "contest type" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4507, end: 4544 } })
  accessor contestType!: PokeApiName

  // - its "contest effect" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4548, end: 4587 } })
  accessor contestEffect!: PokeApiName

  // - its "damage class" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4591, end: 4628 } })
  accessor damageClass!: PokeApiName

  // - its "effect entries" is a list of effect entries
  @prop({ itemType: "EffectEntry", init: () => new List<EffectEntry>({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4632, end: 4680 } })
  accessor effectEntries!: List<EffectEntry>

  // - its "effect changes" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4684, end: 4722 } })
  accessor effectChanges!: List<string>

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 4726, end: 4758 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "meta" is a meta
  @prop({ type: "Meta", declaredAt: { path: "/PokeSpell.api.spell", start: 4762, end: 4782 } })
  accessor meta!: Meta

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4786, end: 4816 } })
  accessor names!: List<Name>

  // - its "past values" is a list of past values
  @prop({ itemType: "PastValue", init: () => new List<PastValue>({ instanceType: "PastValue" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4820, end: 4862 } })
  accessor pastValues!: List<PastValue>

  // - its "stat changes" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4866, end: 4902 } })
  accessor statChanges!: List<string>

  // - its "super contest effect" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4906, end: 4951 } })
  accessor superContestEffect!: PokeApiName

  // - its "target" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 4955, end: 4986 } })
  accessor target!: PokeApiName

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 4990, end: 5028 } }) }
  get kind(): Type { return core.linked(this, "kind", Type) as Type }
  set kind(value: Type) { this.setProp("kind", value) }

  // - its "machines" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5032, end: 5064 } })
  accessor machines!: List<string>

  // - its "flavor text entries" is a list of flavor text entries
  @prop({ itemType: "FlavorTextEntry", init: () => new List<FlavorTextEntry>({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5068, end: 5126 } })
  accessor flavorTextEntries!: List<FlavorTextEntry>

  // - its "learned by pokemon" is a list of pokemon
  static { this.declareProp("learnedByPokemon", { itemType: "Pokemon", init: () => new List<Pokemon>({ instanceType: "Pokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5130, end: 5175 } }) }
  get learnedByPokemon(): List<Pokemon> { return core.linked(this, "learnedByPokemon", Pokemon) as List<Pokemon> }
  set learnedByPokemon(value: List<Pokemon>) { this.setProp("learnedByPokemon", value) }

  static savedIn = { place: "poke_api", collection: "moves", select: ["number", "name", "kind"] }
}

export class EvolutionChain extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5237, end: 5277 } })
  accessor number!: number

  // - its "chain" is a chain
  @prop({ type: "Chain", declaredAt: { path: "/PokeSpell.api.spell", start: 5281, end: 5303 } })
  accessor chain!: Chain

  static savedIn = { place: "poke_api", collection: "evolution_chains" }
}

export class Generation extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5359, end: 5399 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 5403, end: 5421 } })
  accessor name!: string

  // - its "abilities" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5425, end: 5458 } })
  accessor abilities!: List<string>

  // - its "main region" is a poke api name
  @prop({ type: "PokeApiName", declaredAt: { path: "/PokeSpell.api.spell", start: 5462, end: 5498 } })
  accessor mainRegion!: PokeApiName

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5502, end: 5532 } }) }
  get moves(): List<Move> { return core.linked(this, "moves", Move) as List<Move> }
  set moves(value: List<Move>) { this.setProp("moves", value) }

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5536, end: 5566 } })
  accessor names!: List<Name>

  // - its "pokemon species" is a list of pokemon species
  @prop({ itemType: "PokemonSpecies", init: () => new List<PokemonSpecies>({ instanceType: "PokemonSpecies" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5570, end: 5620 } })
  accessor pokemonSpecies!: List<PokemonSpecies>

  // - its "types" is a list of types
  static { this.declareProp("types", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5624, end: 5654 } }) }
  get types(): List<Type> { return core.linked(this, "types", Type) as List<Type> }
  set types(value: List<Type>) { this.setProp("types", value) }

  // - its "version groups" is a list of poke api names
  @prop({ itemType: "PokeApiName", init: () => new List<PokeApiName>({ instanceType: "PokeApiName" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5658, end: 5706 } })
  accessor versionGroups!: List<PokeApiName>

  static savedIn = { place: "poke_api", collection: "generations", select: ["number", "name", "types"] }
}

export class PokemonAbility extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  @prop({ type: "choice", storedAs: "is_hidden" })
  accessor hidden!: boolean

  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "ability" is an ability
  static { this.declareProp("ability", { type: "Ability", link: true }) }
  get ability(): Ability { return core.linked(this, "ability", Ability) as Ability }
  set ability(value: Ability) { this.setProp("ability", value) }
}

export class PastAbility extends Thing {
  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "abilities" is a list of past ability abilities
  @prop({ itemType: "PastAbilityAbility", init: () => new List<PastAbilityAbility>({ instanceType: "PastAbilityAbility" }) })
  accessor abilities!: List<PastAbilityAbility>
}

export class PastAbilityAbility extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  @prop({ type: "choice", storedAs: "is_hidden" })
  accessor hidden!: boolean

  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number
}

export class GameIndex extends Thing {
  // - its "game index" is a number
  @prop({ type: "number" })
  accessor gameIndex!: number

  // - its "version" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor version!: PokeApiName
}

export class PokemonMove extends Thing {
  // - its "move" is a move
  static { this.declareProp("move", { type: "Move", link: true }) }
  get move(): Move { return core.linked(this, "move", Move) as Move }
  set move(value: Move) { this.setProp("move", value) }

  // - its "version group details" is a list of version group details
  @prop({ itemType: "VersionGroupDetail", init: () => new List<VersionGroupDetail>({ instanceType: "VersionGroupDetail" }) })
  accessor versionGroupDetails!: List<VersionGroupDetail>
}

export class VersionGroupDetail extends Thing {
  // - its "level learned at" is a number
  @prop({ type: "number" })
  accessor levelLearnedAt!: number

  // - its "version group" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor versionGroup!: PokeApiName

  // - its "move learn method" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor moveLearnMethod!: PokeApiName

  // - its "order" is a number
  @prop({ type: "number" })
  accessor order!: number
}

export class Sprite extends Thing {
  // - its "other" is an other
  @prop({ type: "Other" })
  accessor other!: Other

  /** an address */
  // - its "back shiny" is text
  @prop({ type: "text" })
  accessor backShiny!: string

  /** an address */
  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  /** an address */
  // - its "back default" is text
  @prop({ type: "text" })
  accessor backDefault!: string

  /** an address */
  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class Other extends Thing {
  // - its "home" is a home
  @prop({ type: "Home" })
  accessor home!: Home

  // - its "showdown" is a showdown
  @prop({ type: "Showdown" })
  accessor showdown!: Showdown

  // - its "dream world" is a dream world
  @prop({ type: "DreamWorld" })
  accessor dreamWorld!: DreamWorld

  // - its "official artwork" is an official artwork
  @prop({ type: "OfficialArtwork" })
  accessor officialArtwork!: OfficialArtwork
}

export class Home extends Thing {
  /** an address */
  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  /** an address */
  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class Showdown extends Thing {
  /** an address */
  // - its "back shiny" is text
  @prop({ type: "text" })
  accessor backShiny!: string

  /** an address */
  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  /** an address */
  // - its "back default" is text
  @prop({ type: "text" })
  accessor backDefault!: string

  /** an address */
  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class DreamWorld extends Thing {
  /** an address */
  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class OfficialArtwork extends Thing {
  /** an address */
  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  /** an address */
  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class Cry extends Thing {
  /** an address */
  // - its "latest" is text
  @prop({ type: "text" })
  accessor latest!: string

  /** an address */
  // - its "legacy" is text
  @prop({ type: "text" })
  accessor legacy!: string
}

export class Stat extends Thing {
  // - its "base stat" is a number
  @prop({ type: "number" })
  accessor baseStat!: number

  // - its "effort" is a number
  @prop({ type: "number" })
  accessor effort!: number

  // - its "stat" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor stat!: PokeApiName
}

export class PastStat extends Thing {
  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "stats" is a list of stats
  @prop({ itemType: "Stat", init: () => new List<Stat>({ instanceType: "Stat" }) })
  accessor stats!: List<Stat>
}

export class PokemonType extends Thing {
  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind(): Type { return core.linked(this, "kind", Type) as Type }
  set kind(value: Type) { this.setProp("kind", value) }

  static drawsWaiting = true
  @drawn draw() {
    return (
      <ui-label class="kind" color={this.kind?.colour} size="huge" font="title-caps">
        {core.whileWaiting(() => this.kind?.name)}
      </ui-label>
    )
  }
}

export class PokedexNumber extends Thing {
  // - its "entry number" is a number
  @prop({ type: "number" })
  accessor entryNumber!: number

  // - its "pokedex" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor pokedex!: PokeApiName
}

export class Name extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "language" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor language!: PokeApiName
}

export class PalParkEncounter extends Thing {
  // - its "base score" is a number
  @prop({ type: "number" })
  accessor baseScore!: number

  // - its "rate" is a number
  @prop({ type: "number" })
  accessor rate!: number

  // - its "area" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor area!: PokeApiName
}

export class FlavorTextEntry extends Thing {
  // - its "flavor text" is text
  @prop({ type: "text" })
  accessor flavorText!: string

  // - its "language" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor language!: PokeApiName

  // - its "version" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor version!: PokeApiName
}

export class Genus extends Thing {
  // - its "genus" is text
  @prop({ type: "text" })
  accessor genus!: string

  // - its "language" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor language!: PokeApiName
}

export class Variety extends Thing {
  // - its "default" is yes or no, stored as "is_default"
  @prop({ type: "choice", storedAs: "is_default" })
  accessor default!: boolean

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon(): Pokemon { return core.linked(this, "pokemon", Pokemon) as Pokemon }
  set pokemon(value: Pokemon) { this.setProp("pokemon", value) }
}

export class DamageRelation extends Thing {
  // - its "no damage to" is a list of types
  static { this.declareProp("noDamageTo", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) }) }
  get noDamageTo(): List<Type> { return core.linked(this, "noDamageTo", Type) as List<Type> }
  set noDamageTo(value: List<Type>) { this.setProp("noDamageTo", value) }

  // - its "half damage to" is a list of types
  static { this.declareProp("halfDamageTo", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) }) }
  get halfDamageTo(): List<Type> { return core.linked(this, "halfDamageTo", Type) as List<Type> }
  set halfDamageTo(value: List<Type>) { this.setProp("halfDamageTo", value) }

  // - its "double damage to" is a list of types
  static { this.declareProp("doubleDamageTo", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) }) }
  get doubleDamageTo(): List<Type> { return core.linked(this, "doubleDamageTo", Type) as List<Type> }
  set doubleDamageTo(value: List<Type>) { this.setProp("doubleDamageTo", value) }

  // - its "no damage from" is a list of types
  static { this.declareProp("noDamageFrom", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) }) }
  get noDamageFrom(): List<Type> { return core.linked(this, "noDamageFrom", Type) as List<Type> }
  set noDamageFrom(value: List<Type>) { this.setProp("noDamageFrom", value) }

  // - its "half damage from" is a list of types
  static { this.declareProp("halfDamageFrom", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) }) }
  get halfDamageFrom(): List<Type> { return core.linked(this, "halfDamageFrom", Type) as List<Type> }
  set halfDamageFrom(value: List<Type>) { this.setProp("halfDamageFrom", value) }

  // - its "double damage from" is a list of types
  static { this.declareProp("doubleDamageFrom", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) }) }
  get doubleDamageFrom(): List<Type> { return core.linked(this, "doubleDamageFrom", Type) as List<Type> }
  set doubleDamageFrom(value: List<Type>) { this.setProp("doubleDamageFrom", value) }
}

export class TypePokemon extends Thing {
  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon(): Pokemon { return core.linked(this, "pokemon", Pokemon) as Pokemon }
  set pokemon(value: Pokemon) { this.setProp("pokemon", value) }

  static drawsWaiting = true
  @drawn draw() {
    return core.drawThing(this.pokemon!)
  }
}

export class EffectEntry extends Thing {
  // - its "effect" is text
  @prop({ type: "text" })
  accessor effect!: string

  // - its "short effect" is text
  @prop({ type: "text" })
  accessor shortEffect!: string

  // - its "language" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor language!: PokeApiName
}

export class EffectChange extends Thing {
  // - its "version group" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor versionGroup!: PokeApiName

  // - its "effect entries" is a list of effect entries
  @prop({ itemType: "EffectEntry", init: () => new List<EffectEntry>({ instanceType: "EffectEntry" }) })
  accessor effectEntries!: List<EffectEntry>
}

export class AbilityPokemon extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  @prop({ type: "choice", storedAs: "is_hidden" })
  accessor hidden!: boolean

  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "pokemon" is a pokemon
  static { this.declareProp("pokemon", { type: "Pokemon", link: true }) }
  get pokemon(): Pokemon { return core.linked(this, "pokemon", Pokemon) as Pokemon }
  set pokemon(value: Pokemon) { this.setProp("pokemon", value) }
}

export class ContestCombo extends Thing {
  // - its "normal" is a normal
  @prop({ type: "Normal" })
  accessor normal!: Normal

  // - its "super" is a super
  @prop({ type: "Super" })
  accessor super!: Super
}

export class Normal extends Thing {
  // - its "use before" is a list of moves
  static { this.declareProp("useBefore", { itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }) }) }
  get useBefore(): List<Move> { return core.linked(this, "useBefore", Move) as List<Move> }
  set useBefore(value: List<Move>) { this.setProp("useBefore", value) }

  // - its "use after" is a list of moves
  static { this.declareProp("useAfter", { itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }) }) }
  get useAfter(): List<Move> { return core.linked(this, "useAfter", Move) as List<Move> }
  set useAfter(value: List<Move>) { this.setProp("useAfter", value) }
}

export class Super extends Thing {}

export class Meta extends Thing {
  // - its "ailment" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor ailment!: PokeApiName

  // - its "category" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor category!: PokeApiName

  // - its "drain" is a number
  @prop({ type: "number" })
  accessor drain!: number

  // - its "healing" is a number
  @prop({ type: "number" })
  accessor healing!: number

  // - its "crit rate" is a number
  @prop({ type: "number" })
  accessor critRate!: number

  // - its "ailment chance" is a number
  @prop({ type: "number" })
  accessor ailmentChance!: number

  // - its "flinch chance" is a number
  @prop({ type: "number" })
  accessor flinchChance!: number

  // - its "stat chance" is a number
  @prop({ type: "number" })
  accessor statChance!: number
}

export class PastValue extends Thing {
  // - its "effect entries" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor effectEntries!: List<string>

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true }) }
  get kind(): Type { return core.linked(this, "kind", Type) as Type }
  set kind(value: Type) { this.setProp("kind", value) }

  // - its "version group" is a poke api name
  @prop({ type: "PokeApiName" })
  accessor versionGroup!: PokeApiName
}

export class Chain extends Thing {
  // - its "baby" is yes or no, stored as "is_baby"
  @prop({ type: "choice", storedAs: "is_baby" })
  accessor baby!: boolean

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies", link: true }) }
  get species(): PokemonSpecies { return core.linked(this, "species", PokemonSpecies) as PokemonSpecies }
  set species(value: PokemonSpecies) { this.setProp("species", value) }

  // - its "evolution details" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor evolutionDetails!: List<string>

  // - its "evolves to" is a list of chains
  @prop({ itemType: "Chain", init: () => new List<Chain>({ instanceType: "Chain" }) })
  accessor evolvesTo!: List<Chain>

  @drawn draw() {
    return (
      <ui-stack direction="horizontal" align="center" spacing="sm" stackable="34em">
        {core.whileWaiting(() => core.drawThing(this.species!))}
        <ui-icon name="chevron right" size="large" rotated="when stacked" hidden={!core.isEmpty(this.evolvesTo) ? undefined : true} />
        <ui-stack direction="horizontal" wrap={true} align="center" justify="center" spacing="sm" hidden={!core.isEmpty(this.evolvesTo) ? undefined : true}>
          <slot name="branches">{this.drawBranches()}</slot>
        </ui-stack>
      </ui-stack>
    )
  }

  // What it becomes:  one, or several side by side, wrapping when they don't fit
  drawBranches() {
    return core.drawEach(this.evolvesTo, (chain: Chain) => core.drawThing(chain))
  }
}

export class PokeApiName extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  /** never read:  its collection wasn't asked for */
  // - its "address" is text, stored as "url"
  @prop({ type: "text", storedAs: "url" })
  accessor address!: string
}

export class PokeApi extends Place {}
export const pokeApi = core.place(new PokeApi(), {
  name: "poke_api",
  kind: "web server",
  at: "https://pokeapi.co/api/v2",
  idColumn: "url",
  rowsIn: "results",
  nextPageIn: "next",
  pageSize: 2000,
  listsGive: ["name"],
  checkedEvery: 86400,
  keptOnDevice: true,
  namesLike: "base_experience",
  collections: {
    pokemon: { at: "/pokemon" },
    pokemonSpecies: { at: "/pokemon-species" },
    types: { at: "/type" },
    abilities: { at: "/ability" },
    moves: { at: "/move" },
    evolutionChains: { at: "/evolution-chain" },
    generations: { at: "/generation" }
  }, firstReads: () => [[Pokemon], [Type]] })

// -----------
core.heading("Your favourites:  kept on this device")
///////////////////////////////////////////
// ## Your favourites:  kept on this device
///////////////////////////////////////////

export class Favourite extends Thing {
  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/Favourites.api.spell", start: 316, end: 334 } })
  accessor name!: string

  /** the pokemon's own, at PokéAPI */
  // - its "address" is text
  @prop({ type: "text", declaredAt: { path: "/Favourites.api.spell", start: 338, end: 359 } })
  accessor address!: string

  static { this.declareProp("pokemon", { declaredAt: { path: "/Pokemon.spellml", start: 8231, end: 8286 }, readsFrom: ["poke_api", "my_favourites"] }) }
  get pokemon() { return core.waitedValue(this, "pokemon", async () => {
    return await core.savedThingWithId(Pokemon, this.address)
  }, () => [this.address]) }

  static drawsWaiting = true
  @drawn draw() {
    return core.drawThing(this.pokemon!)
  }

  static savedIn = { place: "my_favourites", collection: "favourites" }
}

/**
 * The Pokémon you love, kept in this browser, beside PokéAPI's own:  one program shows both.
 * Change the next line to keep them somewhere else, and nothing else changes.
 */
export class MyFavourite extends Place {}
export const myFavourites = core.place(new MyFavourite(), { name: "my_favourites", kind: "database on this device" })

// -----------
core.heading("A Pokémon:  its card, its own page, and its family")
////////////////////////////////////////////////////////
// ## A Pokémon:  its card, its own page, and its family
////////////////////////////////////////////////////////
// Each adds to its type in PokeSpell.api.spell, with `<spell-more-of>`:  so looking at PokéAPI again never touches a line of this.

/** What each of a Pokémon's six numbers means, in plain words:  PokéAPI always lists them in this order */
export const strengthWords: any /* spell: list */ = ["Health", "Attack", "Defence", "Special attack", "Special defence", "Speed"]

core.heading("A kind of Pokémon:  fire, water, grass ...")
//# A kind of Pokémon:  fire, water, grass ...

// One of a Pokémon's kinds:  a label of its colour

// One Pokémon of a kind

core.heading("A family:  how a Pokémon evolves")
//////////////////////////////////////
// ## A family:  how a Pokémon evolves
//////////////////////////////////////
// PokéAPI keeps a family as a chain:  its first species, and the chains each one becomes, each with the chains it becomes.
// So a chain draws its species, then an arrow and the chains it becomes, side by side:
// Bulbasaur > Ivysaur > Venusaur is one row, and Eevee's eight evolutions sit together after its arrow.

core.heading("A favourite:  kept on this device, it draws the Pokémon it's of")
//# A favourite:  kept on this device, it draws the Pokémon it's of

// -----------
core.heading("Who's that Pokémon?")
/////////////////////////
// ## Who's that Pokémon?
/////////////////////////
// A Pokémon hides in its shadow:  pick its name from four, and it steps into the light.
// Only the first 151, from the very first games:  their names are the ones most kids know.

export class Guess extends Thing {
  // - its "hiding" is a pokemon
  static { this.declareProp("hiding", { type: "Pokemon", link: true }) }
  get hiding(): Pokemon { return core.linked(this, "hiding", Pokemon) as Pokemon }
  set hiding(value: Pokemon) { this.setProp("hiding", value) }

  // - its "choices" is a new list of pokemon
  static { this.declareProp("choices", { itemType: "Pokemon", init: () => new List<Pokemon>({ instanceType: "Pokemon" }) }) }
  get choices(): List<Pokemon> { return core.linked(this, "choices", Pokemon) as List<Pokemon> }
  set choices(value: List<Pokemon>) { this.setProp("choices", value) }

  // - its "guessed" is a pokemon
  static { this.declareProp("guessed", { type: "Pokemon", link: true }) }
  get guessed(): Pokemon { return core.linked(this, "guessed", Pokemon) as Pokemon }
  set guessed(value: Pokemon) { this.setProp("guessed", value) }

  get foundOut() {
    return this.guessed !== undefined
  }

  get right() {
    return this.guessed === this.hiding
  }

  /** In the shadow, until you've guessed */
  get look() {
    if (this.foundOut) return "shadow found"
    return "shadow"
  }

  /** Four from the first 151, and one of them hides */
  async playAgain() {
    const firstOnes = core.rangeStartingAt(await core.savedThings(Pokemon), 0, 151)
    this.choices = core.randomItemsOf(firstOnes, 4)
    this.hiding = core.randomItemOf(await core.answerOf(this, "choices"))
    this.guessed = undefined
  }

  static drawsWaiting = true
  @drawn draw() {
    if (this.hiding) {
      return [
        <ui-segment class={this.look} align="center">
          <ui-image class="art" align="center" src={this.hiding?.picture} alt="A Pokémon, hiding" />
        </ui-segment>,
        <slot name="answer">{this.drawAnswer()}</slot>
      ]
    } else {
      return (
        <ui-segment class="shadow" align="center">
          <ui-header size="huge">Who's that Pokémon?</ui-header>
          <ui-button color="yellow" size="massive" appearance="pill raised" onClick={core.pressed(this, async () => await this.playAgain())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Let's play!
          </ui-button>
        </ui-segment>
      )
    }
  }

  drawAnswer() {
    if (this.foundOut) {
      return [
        this.right ? <ui-header class="said" size="huge" align="center" font="title-caps" part="answer">
          {"Yes!  It's "}
          {core.whileWaiting(() => this.hiding?.name)}
          !
        </ui-header> : <ui-header class="said" size="huge" align="center" font="title-caps" part="answer">
          {"It's "}
          {core.whileWaiting(() => this.hiding?.name)}
          !
        </ui-header>,
        <ui-stack direction="horizontal" justify="center" part="answer">
          <ui-button color="yellow" size="massive" appearance="pill raised" onClick={core.pressed(this, async () => await this.playAgain())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
            Play again
          </ui-button>
        </ui-stack>
      ]
    } else {
      return (
        <ui-stack direction="horizontal" wrap={true} justify="center" part="answer">
          <slot name="choice_buttons">{this.drawChoiceButtons()}</slot>
        </ui-stack>
      )
    }
  }

  drawChoiceButtons() {
    return core.drawRead(() => this.choices, (choice: Pokemon) => <ui-button color="yellow" size="huge" appearance="pill raised" font="title-caps" onClick={core.pressed(this, async () => (this.guessed = choice))} style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="choice_buttons">
      {choice.name}
    </ui-button>)
  }
}
// -----------
core.heading("PokéSpell")
///////////////
// ## PokéSpell
///////////////
// A Pokédex for kids:  look through every Pokémon, find one by name, keep your favourites, and guess who's hiding.
// Every Pokémon is in PokeSpell.api.spell, as `spell place ingest` wrote it;  your favourites are in Favourites.api.spell.
// How a Pokémon looks is in Pokemon.spellml, and the guessing game in WhosThat.spellml.

// Every button is a round-ended pill, unless it says otherwise
core.useDefaults("/PokeSpell.spellml", {
  "ui-button": { appearance: "pill" }
})

@thing
export class Pokedex extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "tab" is text
  @prop({ type: "text" })
  accessor tab!: string

  // - its "search" is text
  @prop({ type: "text" })
  accessor search!: string

  // - its "showing" is a pokemon
  static { this.declareProp("showing", { type: "Pokemon", link: true }) }
  get showing(): Pokemon { return core.linked(this, "showing", Pokemon) as Pokemon }
  set showing(value: Pokemon) { this.setProp("showing", value) }

  // - its "trail" is a new list of pokemon
  static { this.declareProp("trail", { itemType: "Pokemon", init: () => new List<Pokemon>({ instanceType: "Pokemon" }) }) }
  get trail(): List<Pokemon> { return core.linked(this, "trail", Pokemon) as List<Pokemon> }
  set trail(value: List<Pokemon>) { this.setProp("trail", value) }

  // - its "picked kind" is a type
  static { this.declareProp("pickedKind", { type: "Type", link: true }) }
  get pickedKind(): Type { return core.linked(this, "pickedKind", Type) as Type }
  set pickedKind(value: Type) { this.setProp("pickedKind", value) }

  // - its "game" is a new guess
  @prop({ init: () => new Guess(), early: true })
  accessor game!: Guess

  create() {
    this.tab = "everyone"
    this.search = ""
  }

  async goToWhere(where: string) {
    this.tab = where
    this.search = ""
    this.showing = undefined
    core.clear(await core.answerOf(this, "trail"))
    core.scrollToTop()
  }

  async goBack() {
    if (core.isEmpty(await core.answerOf(this, "trail"))) {
      this.showing = undefined
      return
    }
    this.showing = core.getItemAt(await core.answerOf(this, "trail"), -1)
    core.removeItemAt(await core.answerOf(this, "trail"), -1)
    core.scrollToTop()
  }

  /** Any Pokémon at all */
  async surpriseMe() {
    await core.randomItemOf(await core.savedThings(Pokemon))?.open()
  }

  static { this.declareProp("kindsToPick", { declaredAt: { path: "/PokeSpell.spellml", start: 1227, end: 1280 }, readsFrom: ["poke_api"] }) }
  get kindsToPick() { return core.waitedValue(this, "kindsToPick", async () => {
    return core.filter(await core.savedThings(Type, {}, "looks through"), (type: Type) => type.isReal)
  }) }

  /** Pokémon names are all small letters:  so the search is too */
  static { this.declareProp("found", { declaredAt: { path: "/PokeSpell.spellml", start: 1294, end: 1490 }, readsFrom: ["poke_api"] }) }
  get found() { return core.waitedValue(this, "found", async () => {
    const lookingFor = this.search.toLocaleLowerCase()
    return core.filter(await core.savedThings(Pokemon, {}, "looks through"), (pokemon: Pokemon) => core.includes(pokemon.name, lookingFor))
  }, () => [this.search]) }

  @drawn draw() {
    return [
      <ui-stack direction="horizontal" wrap={true} align="center" justify="between">
        <ui-button appearance="tertiary" color="red" padding="none" size="poster" font="heavy" shadow="yellow" onClick={core.pressed(this, async () => await this.goToWhere("everyone"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          PokéSpell
        </ui-button>
        <ui-form value={this} fluid={true} min-width="16em" max-width="26em">
          <ui-field label="Find a Pokémon">
            <ui-input name="search" icon="search" size="large" placeholder="Pikachu" />
          </ui-field>
        </ui-form>
        <ui-button color="yellow" size="huge" appearance="pill raised" icon="wand magic sparkles" onClick={core.pressed(this, async () => await this.surpriseMe())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Surprise me!
        </ui-button>
      </ui-stack>,
      <ui-toolbar appearance="secondary pointing" size="huge" aria-label="Look through">
        <ui-item selected={this.tab === "everyone"} onClick={core.pressed(this, async () => await this.goToWhere("everyone"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Everyone
        </ui-item>
        <ui-item selected={this.tab === "kinds"} onClick={core.pressed(this, async () => await this.goToWhere("kinds"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Kinds
        </ui-item>
        <ui-item selected={this.tab === "favourites"} onClick={core.pressed(this, async () => await this.goToWhere("favourites"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Favourites
        </ui-item>
        <ui-item selected={this.tab === "guess"} onClick={core.pressed(this, async () => await this.goToWhere("guess"))} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
          Who's that Pokémon?
        </ui-item>
      </ui-toolbar>,
      <slot name="shelf">{this.drawShelf()}</slot>,
      <ui-text paragraph={true} size="small">
        {"Every Pokémon, its pictures and its sounds, from "}
        <ui-link link="https://pokeapi.co/">PokéAPI</ui-link>
        . Pokémon belongs to Nintendo, Game Freak and Creatures.
      </ui-text>
    ]
  }

  // What shows under the tabs:  only the tab that's open reads anything
  drawShelf() {
    if (this.showing && this.search === "") {
      return [
        <ui-button appearance="basic" icon="arrow left" size="large" onClick={core.pressed(this, async () => await this.goBack())} style="cursor:var(--ui-control-cursor,pointer);user-select:none" part="shelf">
          Back
        </ui-button>,
        this.showing?.drawPage()
      ]
    } else if (this.search !== "") {
      return core.drawRead(() => this.found, (pokemon: Pokemon) => core.drawThing(pokemon), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{"Looking…"}</ui-loader>,
        none: () => <ui-text part="shelf">{"Nobody's called that.  Try another name!"}</ui-text>,
        paging: () => "pages",
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
      })
    } else if (this.tab === "kinds") return <slot name="kinds">{this.drawKinds()}</slot>
    else if (this.tab === "favourites") return core.drawRead(async () => await core.savedThings(Favourite, {}, "as drawn"), (favourite: Favourite) => core.drawThing(favourite), { none: () => <ui-text part="shelf">{"No favourites yet.  Press a Pokémon's heart to keep it here!"}</ui-text>, items: () => <ui-cards columns="4" doubling={true} part="shelf" /> })
    else if (this.tab === "guess") return core.drawThing(this.game)
    else {
      return core.drawRead(async () => await core.savedThings(Pokemon, {}, "as drawn"), (pokemon: Pokemon) => core.drawThing(pokemon), {
        waiting: () => <ui-loader visible={true} inline={true} text={true} part="shelf">{"Waking up the Pokémon…"}</ui-loader>,
        paging: () => "pages",
        items: () => <ui-cards columns="4" doubling={true} part="shelf" />
      })
    }
  }

  // A button for every kind, and the Pokémon of the one you pick
  drawKinds() {
    return [
      <ui-stack direction="horizontal" wrap={true} justify="center" part="kinds">
        <slot name="kind_buttons">{this.drawKindButtons()}</slot>
      </ui-stack>,
      this.pickedKind ? [
        <ui-header class="kind-heading" size="large" font="title-caps" part="kinds">
          {core.whileWaiting(() => this.pickedKind?.name)}
          {" Pokémon"}
        </ui-header>,
        core.drawRead(() => this.pickedKind?.pokemon, (item: Typepokemon) => core.drawThing(item), {
          waiting: () => <ui-loader visible={true} inline={true} text={true} part="kinds">{"Finding them…"}</ui-loader>,
          paging: () => "pages",
          items: () => <ui-cards columns="4" doubling={true} part="kinds" />
        })
      ] : <ui-header size="small" align="center" part="kinds">Pick a kind, and see who's that kind.</ui-header>
    ]
  }

  drawKindButtons() {
    return core.drawRead(() => this.kindsToPick, (type: Type) => core.drawThing(type))
  }
}

/**
 * `<test-project-app>`:  a pokedex, drawn in its own element, e.g. by `draw the pokedex`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its pokedex's properties;  its methods call its pokedex's.
 * - What every view's element does, e.g. drawing its pokedex, is `SpellElement`'s.
 */
export class PokedexElement extends SpellElement<Pokedex> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "pokedex", [
    { name: "tab", kind: "string", description: "Its tab." },
    { name: "search", kind: "string", description: "Its search." },
    { name: "showing", kind: "string", description: "Its showing." },
    { name: "trail", kind: "json", description: "Its trail." },
    { name: "picked-kind", kind: "string", description: "Its pickedKind." },
    { name: "game", kind: "json", description: "Its game." }
  ])

  create() {
    return this.currentThing?.create()
  }

  goToWhere(where: string) {
    return this.currentThing?.goToWhere(where)
  }

  goBack() {
    return this.currentThing?.goBack()
  }

  surpriseMe() {
    return this.currentThing?.surpriseMe()
  }

  drawShelf() {
    return this.currentThing?.drawShelf()
  }

  drawKinds() {
    return this.currentThing?.drawKinds()
  }

  drawKindButtons() {
    return this.currentThing?.drawKindButtons()
  }
}
core.useElement(Pokedex, PokedexElement)
export const pokedex = new Pokedex()

core.heading("Start it")
//////////////
// ## Start it
//////////////
// This file is the project's last:  every kind of thing the pokedex holds, a guess and the rest, is made by then.

if (!core.isCarryingOver) pokedex.start()
// -----------
core.installStyles(undefined, `/* File styles.css:  PokéSpell's theme, and Who's that Pokémon's shadow.¬   - The theme:  a bright sky (a night sky in dark mode), round friendly letters, white cards with round corners.¬     Spell UI's own tokens, so every card, header and button follows.¬   - Every other look is an attribute, in the spellml files:¬     - the logo and a Pokémon's name:  \`size="poster"\`, \`font="heavy"\`, the logo's \`shadow="yellow"\`¬     - each picture's sunny circle:  \`background="yellow"\`¬     - how wide the search, a strength bar and a card in a family are:  \`width\`, \`min-width\`, \`max-width\`¬     - a family's row that runs down a phone, its arrows turning:  \`stackable="34em"\`, \`rotated="when stacked"\`¬     - each kind's colour, a button's own \`color\`;  every button a pill, the app's \`<ui-defaults>\` */¬¬poke-spell-app {¬  --sky: linear-gradient(180deg, #8fd8ff 0%, #d9f4ff 45%, #fff6c9 100%);¬  --ink: #1d2b4f;¬  --ui-text-color: var(--ink);¬  --ui-header-color: var(--ink);¬  --ui-font-family: var(--ui-font-family-rounded);¬  --ui-font-family-heading: var(--ui-font-family-rounded);¬  /* A card stays white in the dark, so its words stay dark */¬  --ui-card-background: #fff;¬  --ui-card-header-color: #1d2b4f;¬  --ui-card-border-color: transparent;¬  --ui-card-margin-block: 0;¬  --ui-card-radius: 1.5em;¬  --ui-card-link-raise: 0.4em;¬  --ui-segment-radius: 1.5em;¬¬  color-scheme: light;¬  container-type: inline-size;¬  display: block;¬  min-height: 100vh;¬  padding: 1em clamp(1em, 4vw, 3em) 2em;¬  background: var(--sky);¬  color: var(--ink);¬}¬¬@media (prefers-color-scheme: dark) {¬  poke-spell-app {¬    --sky: radial-gradient(ellipse at 50% 0%, #2c3f8f 0%, #141c45 55%, #0b1030 100%);¬    --ink: #f2f5ff;¬¬    color-scheme: dark;¬  }¬}¬¬/****************¬ * Who's that Pokémon?  Black as a shadow, until you've guessed.¬ ****************/¬¬.shadow::part(segment) {¬  background: radial-gradient(circle, #fff 0%, #ffe066 45%, #ff9f1c 100%);¬}¬¬/* No hairline round it (the theme's, for photos with white edges):  a black shape on the sunburst */¬.shadow .art::part(image) {¬  width: min(18em, 70vw);¬  outline: none;¬  filter: brightness(0);¬  transition: filter 0.6s ease;¬}¬¬.shadow.found .art::part(image) {¬  filter: none;¬}¬`)

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `PokedexElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
