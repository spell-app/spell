import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { CODE_TRIES, SESSION_DAYS, SIGN_IN_MINUTES, SignIns, type SignInError } from "spell/server/signIn"

/** A clock the test moves. */
function clock() {
  const at = { now: 1_000_000 }
  return { at, now: () => at.now, minutes: (count: number) => (at.now += count * 60_000) }
}

/** What `run()` was refused with:  its kind. */
function refusalOf(run: () => unknown): string | undefined {
  try {
    run()
  } catch (error) {
    return (error as SignInError).kind
  }
  return undefined
}

const EMAIL = "ana@example.com"
const FROM = { browser: "Chrome", system: "a Mac", near: "on this machine" }
const folder = mkdtempSync(join(tmpdir(), "spell-sign-ins-"))
afterAll(() => rmSync(folder, { recursive: true, force: true }))

/** A request for Ana, on a fresh `SignIns`. */
function asked(props: ConstructorParameters<typeof SignIns>[0] = {}) {
  const signIns = new SignIns(props)
  const request = signIns.ask({ email: EMAIL, person: "ana@spell", kind: "sign-in", from: FROM })
  return { signIns, request }
}

test("the code typed on the asking device signs it in, once", () => {
  const { signIns, request } = asked()
  expect(request.code).toMatch(/^\d{6}$/)
  const made = signIns.byCode(EMAIL, request.code)
  expect(made).toMatchObject({ person: "ana@spell", email: EMAIL })
  expect(signIns.personOf(made.token)).toMatchObject({ person: "ana@spell" })
  // used twice
  expect(refusalOf(() => signIns.byCode(EMAIL, request.code))).toBe("used")
  // and its link is done too
  expect(refusalOf(() => signIns.confirm(request.linkKey))).toBe("used")
})

test("a wrong code says how many tries are left, and the last one ends it", () => {
  const { signIns, request } = asked()
  const wrong = request.code === "000000" ? "111111" : "000000"
  for (let tries = 1; tries < CODE_TRIES; tries++) {
    expect(() => signIns.byCode(EMAIL, wrong)).toThrow(
      `${CODE_TRIES - tries} ${CODE_TRIES - tries === 1 ? "try" : "tries"} left`
    )
  }
  expect(refusalOf(() => signIns.byCode(EMAIL, wrong))).toBe("too many tries")
  expect(refusalOf(() => signIns.byCode(EMAIL, request.code))).toBe("too many tries")
})

test("expired:  a code or a link after its minutes is refused", () => {
  const time = clock()
  const { signIns, request } = asked({ now: time.now })
  time.minutes(SIGN_IN_MINUTES + 1)
  expect(refusalOf(() => signIns.byCode(EMAIL, request.code))).toBe("expired")
  expect(refusalOf(() => signIns.confirm(request.linkKey))).toBe("expired")
  expect(refusalOf(() => signIns.link(request.linkKey))).toBe("expired")
  expect(refusalOf(() => signIns.waiting(request.id))).toBe("expired")
})

test("the link confirmed on a second device signs both in:  that one now, the asking one at its next ask, once", () => {
  const { signIns, request } = asked()
  expect(signIns.waiting(request.id)).toBeUndefined()
  // the link's page shows where it was asked from
  expect(signIns.link(request.linkKey)).toEqual({ email: EMAIL, kind: "sign-in", from: FROM })
  const phone = signIns.confirm(request.linkKey)
  const laptop = signIns.waiting(request.id)!
  expect(phone.person).toBe("ana@spell")
  expect(laptop.person).toBe("ana@spell")
  expect(laptop.token).not.toBe(phone.token)
  expect(signIns.personOf(phone.token)?.person).toBe("ana@spell")
  expect(signIns.personOf(laptop.token)?.person).toBe("ana@spell")
  // the asking page's sign-in is handed out once
  expect(refusalOf(() => signIns.waiting(request.id))).toBe("used")
  // confirmed twice
  expect(refusalOf(() => signIns.confirm(request.linkKey))).toBe("used")
})

test("an invite's link signs in whoever opens it, and nothing waits on it", () => {
  const signIns = new SignIns()
  const invite = signIns.ask({ email: EMAIL, person: "ana@spell", kind: "invite", from: {} })
  expect(signIns.confirm(invite.linkKey).person).toBe("ana@spell")
  expect(refusalOf(() => signIns.waiting(invite.id))).toBe("used")
})

test("nothing waiting, or a link it never sent", () => {
  const signIns = new SignIns()
  expect(refusalOf(() => signIns.byCode(EMAIL, "123456"))).toBe("no such request")
  expect(refusalOf(() => signIns.confirm("made-up"))).toBe("no such request")
  expect(refusalOf(() => signIns.waiting("made-up"))).toBe("no such request")
})

test("a device stays signed in for its days, across a restart, and only the token's hash is kept;  signing out ends it", () => {
  const time = clock()
  const file = join(folder, "sessions.json")
  const { signIns, request } = asked({ file, now: time.now })
  const { token } = signIns.byCode(EMAIL, request.code)
  expect(readFileSync(file, "utf8")).not.toContain(token)
  const restarted = new SignIns({ file, now: time.now })
  expect(restarted.personOf(token)?.person).toBe("ana@spell")
  time.minutes(SESSION_DAYS * 24 * 60 + 1)
  expect(restarted.personOf(token)).toBeUndefined()
  const again = asked({ file, now: time.now })
  const next = again.signIns.byCode(EMAIL, again.request.code)
  again.signIns.end(next.token)
  expect(new SignIns({ file, now: time.now }).personOf(next.token)).toBeUndefined()
})
