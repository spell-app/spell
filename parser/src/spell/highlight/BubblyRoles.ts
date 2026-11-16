import isEqual from "lodash/isEqual"

import type { P } from "spell/parser/parser"
import type { BubblyRole, BubblyRuleRoles as Roles } from "./highlight.types"

/****************
 * ### `BubblyRoles`
 * Each rule's ROLES (`SP.BubblyRuleRoles`):  what its match, and each part of it, is to a reader (epic `language` P60).
 * - Said beside a rule's syntax where it's registered, `addRule(CreateHook, { syntax, roles })`:
 *   `SP.SpellParser.addRule()` hands them here, ONE per rule class, on the class, so every language's rule reads them.
 * - A rule built while parsing says them on its class instead:  `@proto static roles = { match: "question" }`.
 * - Read by `SP.BubblyLayout`, which draws each role one way.
 * - STATIC, and imported by `SpellParser` directly:  no `SP` barrel, so rule modules can register while it loads.
 ****************/
export class BubblyRoles {
  /** `rule`'s roles:  its class's, else none (`{}`). */
  static of(rule: P.Rule): Roles {
    return (rule as { roles?: Roles }).roles ?? NO_ROLES
  }

  /**
   * Keep `roles` on `ruleClass`, for every language's rule of it.
   * - Once is enough:  another language that says them must say the same.
   * - throws if `ruleClass` already has other roles of its own
   */
  static record(ruleClass: Function, roles: Roles) {
    const prototype = ruleClass.prototype as { roles?: Roles }
    if (Object.hasOwn(prototype, "roles")) {
      if (isEqual(prototype.roles, roles)) return
      throw new TypeError(
        `BubblyRoles.record():  ${ruleClass.name} has other roles already;  one per rule class, the same in every language`
      )
    }
    Object.defineProperty(prototype, "roles", { value: roles, writable: true, configurable: true })
  }

  /** The names of `roles`' groups with role `role`, in the order it says them. */
  static groupsWith(roles: Roles, role: BubblyRole): string[] {
    return Object.keys(roles).filter((key) => !ROLE_KEYS.has(key) && roles[key] === role)
  }

  /** The role `roles` gives `word`, one of its syntax's own words:  `name` for `droppable`. */
  static ofLiteral(roles: Roles, word: string): BubblyRole | undefined {
    return roles.literal?.[word.toLowerCase()]
  }
}

/** A rule with no roles. */
const NO_ROLES: Roles = Object.freeze({})

/** The keys of `SP.BubblyRoles` that aren't a group's name. */
const ROLE_KEYS = new Set(["band", "match", "literal"])
