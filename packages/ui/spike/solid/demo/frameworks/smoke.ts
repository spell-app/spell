/**
 * Loads the spike's components into a framework smoke page (served by the spike's Vite dev server) and
 * records console warnings / errors for `demo/smoke.ts`.
 * - NOTE: Svelte is skipped:  it needs a compiler, which a CDN page can't run.
 */

const messages: string[] = []
for (const level of ["warn", "error"] as const) {
  const original = console[level].bind(console)
  console[level] = (...args: unknown[]) => {
    messages.push(`${level}: ${args.map(String).join(" ")}`)
    original(...args)
  }
}
window.addEventListener("error", (event) => messages.push(`uncaught: ${event.message}`))
;(window as unknown as { smokeMessages: string[] }).smokeMessages = messages

await import("$spike/index")
export {}
