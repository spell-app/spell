import { core, Thing, List, Place, prop } from "@spell/core"

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
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 1256, end: 1296 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1300, end: 1318 } })
  accessor name!: string

  // - its "base experience" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1322, end: 1355 } })
  accessor baseExperience!: number

  // - its "height" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1359, end: 1383 } })
  accessor height!: number

  // - its "default" is yes or no, stored as "is_default"
  @prop({ type: "choice", storedAs: "is_default", declaredAt: { path: "/PokeSpell.api.spell", start: 1387, end: 1437 } })
  accessor default!: boolean

  // - its "order" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1441, end: 1464 } })
  accessor order!: number

  // - its "weight" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 1468, end: 1492 } })
  accessor weight!: number

  // - its "abilities" is a list of pokemon abilities
  @prop({ itemType: "PokemonAbility", init: () => new List<PokemonAbility>({ instanceType: "PokemonAbility" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1496, end: 1542 } })
  accessor abilities!: List<PokemonAbility>

  // - its "past abilities" is a list of past abilities
  @prop({ itemType: "PastAbility", init: () => new List<PastAbility>({ instanceType: "PastAbility" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1546, end: 1594 } })
  accessor pastAbilities!: List<PastAbility>

  /** each an address */
  // - its "forms" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1598, end: 1627 } })
  accessor forms!: List<string>

  // - its "game indices" is a list of game indices
  @prop({ itemType: "GameIndex", init: () => new List<GameIndex>({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1651, end: 1695 } })
  accessor gameIndices!: List<GameIndex>

  // - its "held items" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1699, end: 1733 } })
  accessor heldItems!: List<string>

  /** an address */
  // - its "location area encounters" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 1737, end: 1775 } })
  accessor locationAreaEncounters!: string

  // - its "moves" is a list of pokemon moves
  @prop({ itemType: "PokemonMove", init: () => new List<PokemonMove>({ instanceType: "PokemonMove" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1794, end: 1832 } })
  accessor moves!: List<PokemonMove>

  // - its "species" is a pokemon species
  static { this.declareProp("species", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 1836, end: 1870 } }) }
  get species(): PokemonSpecies { return core.linked(this, "species", PokemonSpecies) as PokemonSpecies }
  set species(value: PokemonSpecies) { this.setProp("species", value) }

  // - its "sprites" is a sprite
  @prop({ type: "Sprite", declaredAt: { path: "/PokeSpell.api.spell", start: 1874, end: 1899 } })
  accessor sprites!: Sprite

  // - its "cries" is a cry
  @prop({ type: "Cry", declaredAt: { path: "/PokeSpell.api.spell", start: 1903, end: 1923 } })
  accessor cries!: Cry

  // - its "stats" is a list of stats
  @prop({ itemType: "Stat", init: () => new List<Stat>({ instanceType: "Stat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1927, end: 1957 } })
  accessor stats!: List<Stat>

  // - its "past stats" is a list of past stats
  @prop({ itemType: "PastStat", init: () => new List<PastStat>({ instanceType: "PastStat" }), declaredAt: { path: "/PokeSpell.api.spell", start: 1961, end: 2001 } })
  accessor pastStats!: List<PastStat>

  // - its "types" is a list of pokemon types
  @prop({ itemType: "PokemonType", init: () => new List<PokemonType>({ instanceType: "PokemonType" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2005, end: 2043 } })
  accessor types!: List<PokemonType>

  // - its "past types" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2047, end: 2081 } })
  accessor pastTypes!: List<string>

  static savedIn = { place: "poke_api", collection: "pokemon", select: ["name"] }
}

export class PokemonSpecies extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 2142, end: 2182 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2186, end: 2204 } })
  accessor name!: string

  // - its "order" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2208, end: 2231 } })
  accessor order!: number

  // - its "gender rate" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2235, end: 2264 } })
  accessor genderRate!: number

  // - its "capture rate" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2268, end: 2298 } })
  accessor captureRate!: number

  // - its "base happiness" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2302, end: 2334 } })
  accessor baseHappiness!: number

  // - its "baby" is yes or no, stored as "is_baby"
  @prop({ type: "choice", storedAs: "is_baby", declaredAt: { path: "/PokeSpell.api.spell", start: 2338, end: 2382 } })
  accessor baby!: boolean

  // - its "legendary" is yes or no, stored as "is_legendary"
  @prop({ type: "choice", storedAs: "is_legendary", declaredAt: { path: "/PokeSpell.api.spell", start: 2386, end: 2440 } })
  accessor legendary!: boolean

  // - its "mythical" is yes or no, stored as "is_mythical"
  @prop({ type: "choice", storedAs: "is_mythical", declaredAt: { path: "/PokeSpell.api.spell", start: 2444, end: 2496 } })
  accessor mythical!: boolean

  // - its "hatch counter" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 2500, end: 2531 } })
  accessor hatchCounter!: number

  // - its "gender differences" is yes or no, stored as "has_gender_differences"
  @prop({ type: "choice", storedAs: "has_gender_differences", declaredAt: { path: "/PokeSpell.api.spell", start: 2535, end: 2608 } })
  accessor genderDifferences!: boolean

  // - its "forms switchable" is yes or no
  @prop({ type: "choice", declaredAt: { path: "/PokeSpell.api.spell", start: 2612, end: 2647 } })
  accessor formsSwitchable!: boolean

  /** an address */
  // - its "growth rate" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2651, end: 2676 } })
  accessor growthRate!: string

  // - its "pokedex numbers" is a list of pokedex numbers
  @prop({ itemType: "PokedexNumber", init: () => new List<PokedexNumber>({ instanceType: "PokedexNumber" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2695, end: 2745 } })
  accessor pokedexNumbers!: List<PokedexNumber>

  /** each an address */
  // - its "egg groups" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 2749, end: 2783 } })
  accessor eggGroups!: List<string>

  /** an address */
  // - its "color" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2807, end: 2826 } })
  accessor color!: string

  /** an address */
  // - its "shape" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2845, end: 2864 } })
  accessor shape!: string

  // - its "evolves from species" is a pokemon species
  static { this.declareProp("evolvesFromSpecies", { type: "PokemonSpecies", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2883, end: 2930 } }) }
  get evolvesFromSpecies(): PokemonSpecies { return core.linked(this, "evolvesFromSpecies", PokemonSpecies) as PokemonSpecies }
  set evolvesFromSpecies(value: PokemonSpecies) { this.setProp("evolvesFromSpecies", value) }

  // - its "evolution chain" is an evolution chain
  static { this.declareProp("evolutionChain", { type: "EvolutionChain", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 2934, end: 2977 } }) }
  get evolutionChain(): EvolutionChain { return core.linked(this, "evolutionChain", EvolutionChain) as EvolutionChain }
  set evolutionChain(value: EvolutionChain) { this.setProp("evolutionChain", value) }

  /** an address */
  // - its "habitat" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 2981, end: 3002 } })
  accessor habitat!: string

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3021, end: 3053 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3057, end: 3087 } })
  accessor names!: List<Name>

  // - its "pal park encounters" is a list of pal park encounters
  @prop({ itemType: "PalParkEncounter", init: () => new List<PalParkEncounter>({ instanceType: "PalParkEncounter" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3091, end: 3149 } })
  accessor palParkEncounters!: List<PalParkEncounter>

  // - its "form descriptions" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3153, end: 3194 } })
  accessor formDescriptions!: List<string>

  // - its "flavor text entries" is a list of flavor text entries
  @prop({ itemType: "FlavorTextEntry", init: () => new List<FlavorTextEntry>({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3198, end: 3256 } })
  accessor flavorTextEntries!: List<FlavorTextEntry>

  // - its "genera" is a list of genera
  @prop({ itemType: "Genus", init: () => new List<Genus>({ instanceType: "Genus" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3260, end: 3292 } })
  accessor genera!: List<Genus>

  // - its "varieties" is a list of varieties
  @prop({ itemType: "Variety", init: () => new List<Variety>({ instanceType: "Variety" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3296, end: 3334 } })
  accessor varieties!: List<Variety>

  static savedIn = { place: "poke_api", collection: "pokemon_species", select: ["name"] }
}

export class Type extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3384, end: 3424 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3428, end: 3446 } })
  accessor name!: string

  // - its "damage relations" is a damage relation
  @prop({ type: "DamageRelation", declaredAt: { path: "/PokeSpell.api.spell", start: 3450, end: 3493 } })
  accessor damageRelations!: DamageRelation

  // - its "past damage relations" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3497, end: 3542 } })
  accessor pastDamageRelations!: List<string>

  // - its "game indices" is a list of game indices
  @prop({ itemType: "GameIndex", init: () => new List<GameIndex>({ instanceType: "GameIndex" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3546, end: 3590 } })
  accessor gameIndices!: List<GameIndex>

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3594, end: 3626 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  /** an address */
  // - its "move damage class" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3630, end: 3661 } })
  accessor moveDamageClass!: string

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3680, end: 3710 } })
  accessor names!: List<Name>

  // - its "pokemon" is a list of type pokemon
  @prop({ itemType: "TypePokemon", init: () => new List<TypePokemon>({ instanceType: "TypePokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3714, end: 3753 } })
  accessor pokemon!: List<TypePokemon>

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 3757, end: 3787 } }) }
  get moves(): List<Move> { return core.linked(this, "moves", Move) as List<Move> }
  set moves(value: List<Move>) { this.setProp("moves", value) }

  static savedIn = { place: "poke_api", collection: "types", select: ["name"] }
}

export class Ability extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 3841, end: 3881 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 3885, end: 3903 } })
  accessor name!: string

  // - its "main series" is yes or no, stored as "is_main_series"
  @prop({ type: "choice", storedAs: "is_main_series", declaredAt: { path: "/PokeSpell.api.spell", start: 3907, end: 3965 } })
  accessor mainSeries!: boolean

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 3969, end: 4001 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4005, end: 4035 } })
  accessor names!: List<Name>

  // - its "effect entries" is a list of effect entries
  @prop({ itemType: "EffectEntry", init: () => new List<EffectEntry>({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4039, end: 4087 } })
  accessor effectEntries!: List<EffectEntry>

  // - its "effect changes" is a list of effect changes
  @prop({ itemType: "EffectChange", init: () => new List<EffectChange>({ instanceType: "EffectChange" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4091, end: 4139 } })
  accessor effectChanges!: List<EffectChange>

  // - its "flavor text entries" is a list of flavor text entries
  @prop({ itemType: "FlavorTextEntry", init: () => new List<FlavorTextEntry>({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4143, end: 4201 } })
  accessor flavorTextEntries!: List<FlavorTextEntry>

  // - its "pokemon" is a list of ability pokemon
  @prop({ itemType: "AbilityPokemon", init: () => new List<AbilityPokemon>({ instanceType: "AbilityPokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4205, end: 4247 } })
  accessor pokemon!: List<AbilityPokemon>

  static savedIn = { place: "poke_api", collection: "abilities", select: ["name"] }
}

export class Move extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 4297, end: 4337 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4341, end: 4359 } })
  accessor name!: string

  // - its "accuracy" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4363, end: 4389 } })
  accessor accuracy!: number

  // - its "pp" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4393, end: 4413 } })
  accessor pp!: number

  // - its "priority" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4417, end: 4443 } })
  accessor priority!: number

  // - its "power" is a number
  @prop({ type: "number", declaredAt: { path: "/PokeSpell.api.spell", start: 4447, end: 4470 } })
  accessor power!: number

  // - its "contest combos" is a contest combo
  @prop({ type: "ContestCombo", declaredAt: { path: "/PokeSpell.api.spell", start: 4474, end: 4513 } })
  accessor contestCombos!: ContestCombo

  /** an address */
  // - its "contest type" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4517, end: 4543 } })
  accessor contestType!: string

  /** an address */
  // - its "contest effect" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4562, end: 4590 } })
  accessor contestEffect!: string

  /** an address */
  // - its "damage class" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4609, end: 4635 } })
  accessor damageClass!: string

  // - its "effect entries" is a list of effect entries
  @prop({ itemType: "EffectEntry", init: () => new List<EffectEntry>({ instanceType: "EffectEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4654, end: 4702 } })
  accessor effectEntries!: List<EffectEntry>

  // - its "effect changes" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4706, end: 4744 } })
  accessor effectChanges!: List<string>

  // - its "generation" is a generation
  static { this.declareProp("generation", { type: "Generation", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 4748, end: 4780 } }) }
  get generation(): Generation { return core.linked(this, "generation", Generation) as Generation }
  set generation(value: Generation) { this.setProp("generation", value) }

  // - its "meta" is a meta
  @prop({ type: "Meta", declaredAt: { path: "/PokeSpell.api.spell", start: 4784, end: 4804 } })
  accessor meta!: Meta

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4808, end: 4838 } })
  accessor names!: List<Name>

  // - its "past values" is a list of past values
  @prop({ itemType: "PastValue", init: () => new List<PastValue>({ instanceType: "PastValue" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4842, end: 4884 } })
  accessor pastValues!: List<PastValue>

  // - its "stat changes" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 4888, end: 4924 } })
  accessor statChanges!: List<string>

  /** an address */
  // - its "super contest effect" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4928, end: 4962 } })
  accessor superContestEffect!: string

  /** an address */
  // - its "target" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 4981, end: 5001 } })
  accessor target!: string

  // - its "kind" is a type, stored as "type"
  static { this.declareProp("kind", { type: "Type", storedAs: "type", link: true, declaredAt: { path: "/PokeSpell.api.spell", start: 5020, end: 5058 } }) }
  get kind(): Type { return core.linked(this, "kind", Type) as Type }
  set kind(value: Type) { this.setProp("kind", value) }

  // - its "machines" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5062, end: 5094 } })
  accessor machines!: List<string>

  // - its "flavor text entries" is a list of flavor text entries
  @prop({ itemType: "FlavorTextEntry", init: () => new List<FlavorTextEntry>({ instanceType: "FlavorTextEntry" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5098, end: 5156 } })
  accessor flavorTextEntries!: List<FlavorTextEntry>

  // - its "learned by pokemon" is a list of pokemon
  static { this.declareProp("learnedByPokemon", { itemType: "Pokemon", init: () => new List<Pokemon>({ instanceType: "Pokemon" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5160, end: 5205 } }) }
  get learnedByPokemon(): List<Pokemon> { return core.linked(this, "learnedByPokemon", Pokemon) as List<Pokemon> }
  set learnedByPokemon(value: List<Pokemon>) { this.setProp("learnedByPokemon", value) }

  static savedIn = { place: "poke_api", collection: "moves", select: ["name"] }
}

export class EvolutionChain extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5267, end: 5307 } })
  accessor number!: number

  // - its "chain" is a chain
  @prop({ type: "Chain", declaredAt: { path: "/PokeSpell.api.spell", start: 5311, end: 5333 } })
  accessor chain!: Chain

  static savedIn = { place: "poke_api", collection: "evolution_chains", select: [] }
}

export class Generation extends Thing {
  // - its "number" is a number, stored as "id"
  @prop({ type: "number", storedAs: "id", declaredAt: { path: "/PokeSpell.api.spell", start: 5389, end: 5429 } })
  accessor number!: number

  // - its "name" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 5433, end: 5451 } })
  accessor name!: string

  // - its "abilities" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5455, end: 5488 } })
  accessor abilities!: List<string>

  /** an address */
  // - its "main region" is text
  @prop({ type: "text", declaredAt: { path: "/PokeSpell.api.spell", start: 5492, end: 5517 } })
  accessor mainRegion!: string

  // - its "moves" is a list of moves
  static { this.declareProp("moves", { itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5536, end: 5566 } }) }
  get moves(): List<Move> { return core.linked(this, "moves", Move) as List<Move> }
  set moves(value: List<Move>) { this.setProp("moves", value) }

  // - its "names" is a list of names
  @prop({ itemType: "Name", init: () => new List<Name>({ instanceType: "Name" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5570, end: 5600 } })
  accessor names!: List<Name>

  // - its "pokemon species" is a list of pokemon species
  @prop({ itemType: "PokemonSpecies", init: () => new List<PokemonSpecies>({ instanceType: "PokemonSpecies" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5604, end: 5654 } })
  accessor pokemonSpecies!: List<PokemonSpecies>

  // - its "types" is a list of types
  static { this.declareProp("types", { itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5658, end: 5688 } }) }
  get types(): List<Type> { return core.linked(this, "types", Type) as List<Type> }
  set types(value: List<Type>) { this.setProp("types", value) }

  /** each an address */
  // - its "version groups" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/PokeSpell.api.spell", start: 5692, end: 5730 } })
  accessor versionGroups!: List<string>

  static savedIn = { place: "poke_api", collection: "generations", select: ["name"] }
}

export class PokemonAbility extends Thing {
  // - its "hidden" is yes or no, stored as "is_hidden"
  @prop({ type: "choice", storedAs: "is_hidden" })
  accessor hidden!: boolean

  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "ability" is an ability
  @prop({ type: "Ability" })
  accessor ability!: Ability
}

export class PastAbility extends Thing {
  // - its "generation" is a generation
  @prop({ type: "Generation" })
  accessor generation!: Generation

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

  // - its "version" is text
  @prop({ type: "text" })
  accessor version!: string
}

export class PokemonMove extends Thing {
  // - its "move" is a move
  @prop({ type: "Move" })
  accessor move!: Move

  // - its "version group details" is a list of version group details
  @prop({ itemType: "VersionGroupDetail", init: () => new List<VersionGroupDetail>({ instanceType: "VersionGroupDetail" }) })
  accessor versionGroupDetails!: List<VersionGroupDetail>
}

export class VersionGroupDetail extends Thing {
  // - its "level learned at" is a number
  @prop({ type: "number" })
  accessor levelLearnedAt!: number

  // - its "version group" is text
  @prop({ type: "text" })
  accessor versionGroup!: string

  // - its "move learn method" is text
  @prop({ type: "text" })
  accessor moveLearnMethod!: string

  // - its "order" is a number
  @prop({ type: "number" })
  accessor order!: number
}

export class Sprite extends Thing {
  // - its "other" is an other
  @prop({ type: "Other" })
  accessor other!: Other

  // - its "back shiny" is text
  @prop({ type: "text" })
  accessor backShiny!: string

  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  // - its "back default" is text
  @prop({ type: "text" })
  accessor backDefault!: string

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
  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class Showdown extends Thing {
  // - its "back shiny" is text
  @prop({ type: "text" })
  accessor backShiny!: string

  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  // - its "back default" is text
  @prop({ type: "text" })
  accessor backDefault!: string

  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class DreamWorld extends Thing {
  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class OfficialArtwork extends Thing {
  // - its "front shiny" is text
  @prop({ type: "text" })
  accessor frontShiny!: string

  // - its "front default" is text
  @prop({ type: "text" })
  accessor frontDefault!: string
}

export class Cry extends Thing {
  // - its "latest" is text
  @prop({ type: "text" })
  accessor latest!: string

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

  // - its "stat" is text
  @prop({ type: "text" })
  accessor stat!: string
}

export class PastStat extends Thing {
  // - its "generation" is a generation
  @prop({ type: "Generation" })
  accessor generation!: Generation

  // - its "stats" is a list of stats
  @prop({ itemType: "Stat", init: () => new List<Stat>({ instanceType: "Stat" }) })
  accessor stats!: List<Stat>
}

export class PokemonType extends Thing {
  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "kind" is a type, stored as "type"
  @prop({ type: "Type", storedAs: "type" })
  accessor kind!: Type
}

export class PokedexNumber extends Thing {
  // - its "entry number" is a number
  @prop({ type: "number" })
  accessor entryNumber!: number

  // - its "pokedex" is text
  @prop({ type: "text" })
  accessor pokedex!: string
}

export class Name extends Thing {
  // - its "name" is text
  @prop({ type: "text" })
  accessor name!: string

  // - its "language" is text
  @prop({ type: "text" })
  accessor language!: string
}

export class PalParkEncounter extends Thing {
  // - its "base score" is a number
  @prop({ type: "number" })
  accessor baseScore!: number

  // - its "rate" is a number
  @prop({ type: "number" })
  accessor rate!: number

  // - its "area" is text
  @prop({ type: "text" })
  accessor area!: string
}

export class FlavorTextEntry extends Thing {
  // - its "flavor text" is text
  @prop({ type: "text" })
  accessor flavorText!: string

  // - its "language" is text
  @prop({ type: "text" })
  accessor language!: string

  // - its "version" is text
  @prop({ type: "text" })
  accessor version!: string
}

export class Genus extends Thing {
  // - its "genus" is text
  @prop({ type: "text" })
  accessor genus!: string

  // - its "language" is text
  @prop({ type: "text" })
  accessor language!: string
}

export class Variety extends Thing {
  // - its "default" is yes or no, stored as "is_default"
  @prop({ type: "choice", storedAs: "is_default" })
  accessor default!: boolean

  // - its "pokemon" is a pokemon
  @prop({ type: "Pokemon" })
  accessor pokemon!: Pokemon
}

export class DamageRelation extends Thing {
  // - its "no damage to" is a list of types
  @prop({ itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) })
  accessor noDamageTo!: List<Type>

  // - its "half damage to" is a list of types
  @prop({ itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) })
  accessor halfDamageTo!: List<Type>

  // - its "double damage to" is a list of types
  @prop({ itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) })
  accessor doubleDamageTo!: List<Type>

  // - its "no damage from" is a list of types
  @prop({ itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) })
  accessor noDamageFrom!: List<Type>

  // - its "half damage from" is a list of types
  @prop({ itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) })
  accessor halfDamageFrom!: List<Type>

  // - its "double damage from" is a list of types
  @prop({ itemType: "Type", init: () => new List<Type>({ instanceType: "Type" }) })
  accessor doubleDamageFrom!: List<Type>
}

export class TypePokemon extends Thing {
  // - its "slot" is a number
  @prop({ type: "number" })
  accessor slot!: number

  // - its "pokemon" is a pokemon
  @prop({ type: "Pokemon" })
  accessor pokemon!: Pokemon
}

export class EffectEntry extends Thing {
  // - its "effect" is text
  @prop({ type: "text" })
  accessor effect!: string

  // - its "short effect" is text
  @prop({ type: "text" })
  accessor shortEffect!: string

  // - its "language" is text
  @prop({ type: "text" })
  accessor language!: string
}

export class EffectChange extends Thing {
  // - its "version group" is text
  @prop({ type: "text" })
  accessor versionGroup!: string

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
  @prop({ type: "Pokemon" })
  accessor pokemon!: Pokemon
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
  @prop({ itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }) })
  accessor useBefore!: List<Move>

  // - its "use after" is a list of moves
  @prop({ itemType: "Move", init: () => new List<Move>({ instanceType: "Move" }) })
  accessor useAfter!: List<Move>
}

export class Super extends Thing {}

export class Meta extends Thing {
  // - its "ailment" is text
  @prop({ type: "text" })
  accessor ailment!: string

  // - its "category" is text
  @prop({ type: "text" })
  accessor category!: string

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
  @prop({ type: "Type", storedAs: "type" })
  accessor kind!: Type

  // - its "version group" is text
  @prop({ type: "text" })
  accessor versionGroup!: string
}

export class Chain extends Thing {
  // - its "baby" is yes or no, stored as "is_baby"
  @prop({ type: "choice", storedAs: "is_baby" })
  accessor baby!: boolean

  // - its "species" is a pokemon species
  @prop({ type: "PokemonSpecies" })
  accessor species!: PokemonSpecies

  // - its "evolution details" is a list of text
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }) })
  accessor evolutionDetails!: List<string>

  // - its "evolves to" is a list of chains
  @prop({ itemType: "Chain", init: () => new List<Chain>({ instanceType: "Chain" }) })
  accessor evolvesTo!: List<Chain>
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
  namesLike: "base_experience",
  collections: {
    pokemon: { at: "/pokemon" },
    pokemonSpecies: { at: "/pokemon-species" },
    types: { at: "/type" },
    abilities: { at: "/ability" },
    moves: { at: "/move" },
    evolutionChains: { at: "/evolution-chain" },
    generations: { at: "/generation" }
  }
})

