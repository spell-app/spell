import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

import {
  PASSWORD_ADDRESS_TRIES,
  PASSWORD_LEAST,
  PASSWORD_MOST,
  PASSWORD_PROOF_MINUTES,
  PASSWORD_TRIES,
  PASSWORD_WAIT_MINUTES,
  Passwords,
  SESSION_DAYS,
  SignIns,
  type SignInError
} from "spell/server/signIn"

const PERSON = "ana@spell"
const EMAIL = "ana@example.com"
const ADDRESS = "203.0.113.7"
const FROM = { browser: "Chrome" }
const RIGHT = "a long enough one"
const OTHER = "another long enough one"
const ANA = { person: PERSON, typed: EMAIL }
const STRANGER = { typed: "nobody@example.com" }

const folder = mkdtempSync(join(tmpdir(), "spell-passwords-"))
afterAll(() => rmSync(folder, { recursive: true, force: true }))

/** A clock the test moves. */
function clock() {
  const at = { now: 1_000_000 }
  return { at, now: () => at.now, minutes: (count: number) => (at.now += count * 60_000) }
}

/** What `running` was refused with:  its kind and words. */
async function refusalOf(running: Promise<unknown>): Promise<{ kind?: string; message?: string }> {
  try {
    await running
  } catch (error) {
    return { kind: (error as SignInError).kind, message: (error as SignInError).message }
  }
  return {}
}

/** A device signed in to Ana by a code she was mailed. */
function byEmail(signIns: SignIns) {
  const request = signIns.ask({ email: EMAIL, person: PERSON, kind: "sign-in", from: FROM })
  return signIns.byCode(EMAIL, request.code)
}

/** A `SignIns` where Ana has `RIGHT` as her password. */
async function withPassword(time = clock()) {
  const signIns = new SignIns({ now: time.now })
  await signIns.passwords.set(PERSON, RIGHT)
  return { signIns, time }
}

/** A try at a password, from `ADDRESS`. */
const tried = (signIns: SignIns, password: string, who: { person?: string; typed: string } = ANA) =>
  signIns.checkPassword({ person: who.person, typed: who.typed, address: ADDRESS, password })

describe("Passwords", () => {
  test("kept only as a hash, in a file only this machine's person reads, beside the signed-in devices;  a restart keeps them", async () => {
    const file = join(folder, "keep", "passwords.json")
    const passwords = new Passwords({ file })
    await passwords.set(PERSON, RIGHT)
    const text = readFileSync(file, "utf8")
    expect(text).toContain(PERSON)
    expect(text).not.toContain(RIGHT)
    expect(JSON.parse(text)[PERSON]).toMatchObject({ N: 32_768, r: 8, p: 3 })
    expect(statSync(file).mode & 0o777).toBe(0o600)

    const restarted = new Passwords({ file })
    expect(await restarted.matches(PERSON, RIGHT)).toBe(true)
    expect(await restarted.matches(PERSON, OTHER)).toBe(false)
  })

  test("the same password salts differently for two people", async () => {
    const file = join(folder, "salts", "passwords.json")
    const passwords = new Passwords({ file })
    await passwords.set(PERSON, RIGHT)
    await passwords.set("bo@spell", RIGHT)
    const kept = JSON.parse(readFileSync(file, "utf8"))
    expect(kept[PERSON].salt).not.toBe(kept["bo@spell"].salt)
    expect(kept[PERSON].hash).not.toBe(kept["bo@spell"].hash)
  })

  test("as typed:  spaces count;  the same letter spelled two ways is the same", async () => {
    const passwords = new Passwords()
    await passwords.set(PERSON, " café with spaces ")
    expect(await passwords.matches(PERSON, "café with spaces")).toBe(false)
    expect(await passwords.matches(PERSON, " café with spaces ")).toBe(true)
  })

  test("at least 8 characters, at most 256, and nothing else asked of one", async () => {
    const passwords = new Passwords()
    expect((await refusalOf(passwords.set(PERSON, "x".repeat(PASSWORD_LEAST - 1)))).kind).toBe("bad password")
    expect((await refusalOf(passwords.set(PERSON, "x".repeat(PASSWORD_MOST + 1)))).kind).toBe("bad password")
    await passwords.set(PERSON, "aaaaaaaa")
    await passwords.set(PERSON, "x".repeat(PASSWORD_MOST))
    expect(await passwords.matches(PERSON, "x".repeat(PASSWORD_MOST + 1))).toBe(false)
    expect(await passwords.matches(PERSON, "x".repeat(PASSWORD_MOST))).toBe(true)
  })

  test("nobody, and no password yet, take about as long as a wrong one", async () => {
    const passwords = new Passwords()
    await passwords.set(PERSON, RIGHT)
    const timeOf = async (account: string | undefined) => {
      const started = performance.now()
      await passwords.matches(account, OTHER)
      return performance.now() - started
    }
    const someone = await timeOf(PERSON)
    expect(await timeOf(undefined)).toBeGreaterThan(someone * 0.3)
    expect(await timeOf("bo@spell")).toBeGreaterThan(someone * 0.3)
  })
})

describe("SignIns, by password", () => {
  test("the right one:  a device signed in for the same days as a code", async () => {
    const { signIns, time } = await withPassword()
    expect(await tried(signIns, RIGHT)).toBe(PERSON)
    const { token, person } = signIns.signInByPassword({ person: PERSON, email: EMAIL })
    expect(person).toBe(PERSON)
    expect(signIns.personOf(token)?.way).toBe("password")
    time.minutes(SESSION_DAYS * 24 * 60 - 1)
    expect(signIns.personOf(token)?.person).toBe(PERSON)
    time.minutes(2)
    expect(signIns.personOf(token)).toBeUndefined()
  })

  test("a wrong password, an account with none and a stranger are all refused alike", async () => {
    const { signIns } = await withPassword()
    const wrong = await refusalOf(tried(signIns, OTHER))
    const none = await refusalOf(tried(signIns, RIGHT, { person: "bo@spell", typed: "bo@example.com" }))
    const stranger = await refusalOf(tried(signIns, RIGHT, STRANGER))
    expect(wrong.kind).toBe("wrong password")
    expect(none).toEqual(wrong)
    expect(stranger).toEqual(wrong)
    expect(wrong.message).not.toContain(OTHER)
  })

  test("too many wrong:  a wait the page can say, the right one refused too;  and over after it", async () => {
    const { signIns, time } = await withPassword()
    for (let index = 0; index < PASSWORD_TRIES; index++) await refusalOf(tried(signIns, OTHER))
    const locked = await refusalOf(tried(signIns, RIGHT))
    expect(locked.kind).toBe("too many tries")
    expect(locked.message).toContain(`${PASSWORD_WAIT_MINUTES} minutes`)
    time.minutes(PASSWORD_WAIT_MINUTES + 1)
    expect(await tried(signIns, RIGHT)).toBe(PERSON)
  })

  test("a stranger locks just the same, so a lock says nothing;  the right one forgives the count", async () => {
    const { signIns } = await withPassword()
    for (let index = 0; index < PASSWORD_TRIES; index++) {
      await refusalOf(tried(signIns, OTHER, { typed: "NOBODY@example.com" }))
    }
    expect((await refusalOf(tried(signIns, RIGHT, STRANGER))).kind).toBe("too many tries")

    for (let index = 0; index < PASSWORD_TRIES - 1; index++) await refusalOf(tried(signIns, OTHER))
    await tried(signIns, RIGHT)
    expect((await refusalOf(tried(signIns, OTHER))).kind).toBe("wrong password")
  })

  test("one address, trying many accounts, is limited too;  another address isn't", async () => {
    const signIns = new SignIns()
    await signIns.passwords.set(PERSON, RIGHT)
    const from = (address: string, typed: string, password = OTHER) =>
      signIns.checkPassword({ person: undefined, typed, address, password })
    for (let index = 0; index < PASSWORD_ADDRESS_TRIES; index++) {
      await refusalOf(from(ADDRESS, `person-${index}@example.com`))
    }
    expect((await refusalOf(from(ADDRESS, "one-more@example.com"))).kind).toBe("too many tries")
    expect(
      await signIns.checkPassword({ person: PERSON, typed: EMAIL, address: "198.51.100.1", password: RIGHT })
    ).toBe(PERSON)
  })

  test("tries at the same moment are all counted", async () => {
    const { signIns } = await withPassword()
    const all = await Promise.all(Array.from({ length: PASSWORD_TRIES + 3 }, () => refusalOf(tried(signIns, OTHER))))
    expect(all.filter(({ kind }) => kind === "too many tries").length).toBe(3)
  })
})

describe("SignIns, changing a password", () => {
  const signedInWith = (signIns: SignIns) => signIns.signInByPassword({ person: PERSON, email: EMAIL }).token

  test("a first one takes only being signed in, and ends nothing", async () => {
    const signIns = new SignIns()
    const { token } = signIns.signInLinked(PERSON)
    const other = byEmail(signIns).token
    await signIns.changePassword({ token, password: RIGHT, address: ADDRESS })
    expect(signIns.passwords.has(PERSON)).toBe(true)
    expect(signIns.personOf(other)?.person).toBe(PERSON)
  })

  test("nobody signed in:  refused", async () => {
    const signIns = new SignIns()
    expect((await refusalOf(signIns.changePassword({ token: "x", password: RIGHT, address: ADDRESS }))).kind).toBe(
      "needs proof"
    )
    expect(signIns.passwords.has(PERSON)).toBe(false)
  })

  test("changing one needs the current one, right;  and ends the person's other devices, not this one", async () => {
    const { signIns } = await withPassword()
    const token = signedInWith(signIns)
    const other = signedInWith(signIns)
    const bos = signIns.signInLinked("bo@spell").token

    const noProof = await refusalOf(signIns.changePassword({ token, password: OTHER, address: ADDRESS }))
    expect(noProof.kind).toBe("needs proof")
    expect(noProof.message).toContain("emailed link")

    const wrong = await refusalOf(
      signIns.changePassword({ token, password: OTHER, current: "not the password", address: ADDRESS })
    )
    expect(wrong).toEqual({ kind: "wrong password", message: "That isn't your current password." })
    expect(await tried(signIns, RIGHT)).toBe(PERSON)

    await signIns.changePassword({ token, password: OTHER, current: RIGHT, address: ADDRESS })
    expect(signIns.personOf(token)?.person).toBe(PERSON)
    expect(signIns.personOf(other)).toBeUndefined()
    expect(signIns.personOf(bos)?.person).toBe("bo@spell")
    expect(await tried(signIns, OTHER)).toBe(PERSON)
    expect((await refusalOf(tried(signIns, RIGHT))).kind).toBe("wrong password")
  })

  test("forgot it:  an emailed link's sign-in sets a new one with no current, for 20 minutes", async () => {
    const { signIns, time } = await withPassword()
    const { token } = byEmail(signIns)
    expect(signIns.hasFreshProof(signIns.personOf(token)!)).toBe(true)
    await signIns.changePassword({ token, password: OTHER, address: ADDRESS })
    expect(await tried(signIns, OTHER)).toBe(PERSON)

    const later = byEmail(signIns).token
    time.minutes(PASSWORD_PROOF_MINUTES + 1)
    expect(signIns.hasFreshProof(signIns.personOf(later)!)).toBe(false)
    expect((await refusalOf(signIns.changePassword({ token: later, password: RIGHT, address: ADDRESS }))).kind).toBe(
      "needs proof"
    )
  })

  test("a password or Bluesky sign-in just now is no proof", async () => {
    const { signIns } = await withPassword()
    expect(signIns.hasFreshProof(signIns.personOf(signedInWith(signIns))!)).toBe(false)
    expect(signIns.hasFreshProof(signIns.personOf(signIns.signInLinked(PERSON).token)!)).toBe(false)
  })

  test("the current one's guesses count as wrong tries", async () => {
    const { signIns } = await withPassword()
    const token = signedInWith(signIns)
    for (let index = 0; index < PASSWORD_TRIES; index++) {
      await refusalOf(signIns.changePassword({ token, password: OTHER, current: "not it at all", address: ADDRESS }))
    }
    expect(
      (await refusalOf(signIns.changePassword({ token, password: OTHER, current: RIGHT, address: ADDRESS }))).kind
    ).toBe("too many tries")
  })

  test("from this machine:  anyone's;  replacing one signs them out everywhere", async () => {
    const signIns = new SignIns()
    const first = byEmail(signIns).token
    await signIns.setPasswordFor(PERSON, RIGHT)
    expect(signIns.personOf(first)?.person).toBe(PERSON)
    await signIns.setPasswordFor(PERSON, OTHER)
    expect(signIns.personOf(first)).toBeUndefined()
    expect(await tried(signIns, OTHER)).toBe(PERSON)
  })

  test("the passwords' file is beside the signed-in devices;  neither has a password", async () => {
    const file = join(folder, "beside", "sessions.json")
    const signIns = new SignIns({ file })
    await signIns.passwords.set(PERSON, RIGHT)
    byEmail(signIns)
    const passwords = join(folder, "beside", "passwords.json")
    expect(readFileSync(passwords, "utf8")).not.toContain(RIGHT)
    expect(readFileSync(file, "utf8")).not.toContain(RIGHT)
    expect(statSync(passwords).mode & 0o777).toBe(0o600)
    expect(await new SignIns({ file }).passwords.matches(PERSON, RIGHT)).toBe(true)
  })
})
