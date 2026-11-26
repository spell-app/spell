/**
 * Which way a sort goes, in each language's words:  `newest first`, `de más reciente a más antiguo`.
 * - Two named groups, `descending` and `ascending`, each a list of ways to say it.
 * - Said after a sort's key (`sort_key_order`, `every message, sorted by its sent, newest first`) and after a sort a
 *   page holds (`outline_specifier_sort`, `its "order" is a sort:  completion, newest first`):  the same words both
 *   places.
 * - No imports:  the `lists` and `classes` rules read it alike, whichever loads first.
 */
export const SORT_ORDER_WORDS = {
  en: "((descending:(newest|latest|highest|largest|biggest|most) first|reversed|in reverse|z-a)|(ascending:(oldest|earliest|lowest|smallest|fewest|least) first|a-z))",
  es: "((descending:al revés|al reves|de mayor a menor|de más reciente a más antiguo|de mas reciente a mas antiguo|en orden inverso|z-a)|(ascending:a-z|de menor a mayor|de más antiguo a más reciente|de mas antiguo a mas reciente))"
} as const
