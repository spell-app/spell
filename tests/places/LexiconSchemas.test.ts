/**
 * `LexiconSchemas` against `FakeAtmosphere`:  a Lexicon published as a schema record in the account that holds
 * Spell's schemas, and the DNS record that points its name there (epic `atmosphere` P10).
 * - The real network, an account and DNS records:  manual test M of P10.
 */
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { AtProtoPasswordSignIn, LEXICON_SCHEMA, LexiconSchemas } from "spell/places"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"

const SCHEMAS = "did:plc:schemas"
const PASSWORD = "abcd-efgh-ijkl-mnop"
const RECIPE = {
  lexicon: 1,
  id: "space.spell.owen.recipes.recipe",
  defs: {
    main: {
      type: "record",
      key: "any",
      record: { type: "object", properties: { title: { type: "string", description: "title" } } }
    }
  }
}

describe("LexiconSchemas", () => {
  let network: FakeAtmosphere
  let signIn: AtProtoPasswordSignIn

  beforeEach(async () => {
    network = await new FakeAtmosphere().start(["one"])
    network.addAccount(SCHEMAS, { handle: "schemas.test", host: "one", password: PASSWORD })
    signIn = new AtProtoPasswordSignIn({ password: PASSWORD, network: network.network })
    await signIn.signIn("schemas.test")
  })

  afterEach(() => network.close())

  test("publishes a Lexicon as a schema record keyed by its name, and says the DNS record to make", async () => {
    const published = await new LexiconSchemas({ signIn }).publish(RECIPE)
    expect(published).toMatchObject({
      uri: `at://${SCHEMAS}/${LEXICON_SCHEMA}/space.spell.owen.recipes.recipe`,
      isNew: true,
      dns: { name: "_lexicon.recipes.owen.spell.space", type: "TXT", value: `did=${SCHEMAS}` }
    })
    expect(network.recordsOf(SCHEMAS, LEXICON_SCHEMA).get(RECIPE.id)?.value).toEqual({
      $type: LEXICON_SCHEMA,
      ...RECIPE
    })
  })

  test("publishing again replaces the one record", async () => {
    const schemas = new LexiconSchemas({ signIn })
    await schemas.publish(RECIPE)
    const again = await new LexiconSchemas({ signIn }).publish({ ...RECIPE, description: "v2" })
    expect(again.isNew).toBe(false)
    expect(network.recordsOf(SCHEMAS, LEXICON_SCHEMA).size).toBe(1)
    expect(network.recordsOf(SCHEMAS, LEXICON_SCHEMA).get(RECIPE.id)?.value.description).toBe("v2")
  })

  test("nobody signed in:  sign in first", () => {
    expect(() => new LexiconSchemas({ signIn: new AtProtoPasswordSignIn({ password: PASSWORD }) })).toThrow(TypeError)
  })
})
