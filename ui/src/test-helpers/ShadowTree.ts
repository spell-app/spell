import { ElementFixture } from "spell/test-helpers/ElementFixture"

/**
 * An element's shadow tree, all the way down, for tests:  wait until every element in it has drawn.
 * - `ElementFixture.settle()` waits for the elements in the light DOM;  a family that draws other elements in its
 *   shadow root (`<ui-site-tabs>`' toolbar, its items) needs theirs too, a few rounds deep.
 */
export class ShadowTree {
  /** Wait for every element in `host`'s shadow tree, all the way down, then flush. */
  static async settle(host: Element) {
    for (let round = 0; round < ROUNDS; round++) {
      const hosts: Element[] = []
      const walk = (root: ShadowRoot | null) => {
        for (const element of root?.querySelectorAll("*") ?? []) {
          hosts.push(element)
          walk(element.shadowRoot)
        }
      }
      walk(host.shadowRoot)
      await Promise.all(hosts.flatMap((each) => (each as Element & { ready?: Promise<unknown> }).ready ?? []))
      await ElementFixture.settle()
    }
  }
}

/** How many rounds:  an element drawn in a round may draw more elements in the next. */
const ROUNDS = 4
