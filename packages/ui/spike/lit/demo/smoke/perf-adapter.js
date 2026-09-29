/**
 * The Lit spike's `PerfAdapter` for the shared perf page (`spike/shared/frameworks/perf.html`):  the DOM is up to
 * date once the element's `updateComplete` resolves.  Mapped as `@spell/ui-spike/perf-adapter` by `SmokeRunner`.
 */
export const adapter = { settle: (element) => element.updateComplete }
