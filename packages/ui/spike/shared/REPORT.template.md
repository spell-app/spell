# <Library> spike report

<!--
  ONE template for every spike's REPORT.md (`spike/<name>/REPORT.md`), so the reports compare line by line:
  - keep the `##` headings EXACTLY, in this order;  keep the `###` sub-headings listed here (add more below them
    when a spike needs them)
  - every numeric table sits between `generated:<name>` markers and is written by `yarn report`
    (`spike/shared/ReportTables.ts`);  never edit inside the markers by hand
  - units everywhere:  min = esbuild minify, gzip level 9, kB = 1000 bytes;  times in ms
  - prose:  facts and measurements only;  the comparison and the recommendation live in
    `docs/spike-lit-vs-solid.md`
-->

One paragraph:  what the spike builds, on which library and versions, measured when, on what machine.

## Setup & versions

<!-- generated:versions -->
<!-- /generated:versions -->

### Toolchain notes

<!-- plugins, decorator pre-pass, aliases, package setup;  anything that needed a workaround -->

### Commands

<!-- every script in `spike/<name>/package.json`, one line each -->

### Final state

<!-- tsc / tests (count) / build / ssr / vendor / measure / smoke / report / lint / format:  pass or not -->

## Bundle

### Method

<!-- shared-runtime packaging:  peer dependency, externals, `core` entry, what each tier holds -->

### Tiers

<!-- generated:bundle-tiers -->
<!-- /generated:bundle-tiers -->

### Own cost per family

<!-- generated:bundle-families -->
<!-- /generated:bundle-families -->

### Scenarios

<!-- generated:bundle-scenarios -->
<!-- /generated:bundle-scenarios -->

### Checks

<!-- generated:bundle-checks -->
<!-- /generated:bundle-checks -->

### Notes

<!-- where the bytes go, what changed in measurement, comparisons with earlier numbers -->

## LOC

<!-- generated:loc -->
<!-- /generated:loc -->

### Per file

<!-- generated:loc-files -->
<!-- /generated:loc-files -->

## Ergonomics

### Declaring attributes and properties

### Templating

### Owner context and content parts

### Per component

### What fought the library

### What fought the conventions

## Performance

### Method

<!-- PerfRun:  1000 options, `"united sta"`, update / + layout / + frame, the adapter used -->

### Results

<!-- generated:perf -->
<!-- /generated:perf -->

### Notes

## Framework hosts

### Method

<!-- SmokeRunner:  `dist/` + vendored peers through one import map, shared host pages, checks -->

### Results

<!-- generated:smoke -->
<!-- /generated:smoke -->

### Solid 2 host

### Compatibility checks

### Notes

## Forms & accessibility

### Forms

### Keyboard and focus

### Accessibility

## SSR / Declarative Shadow DOM

### Result

### Limits

## Error handling & native fallback

## Translation

## Testing

## Risks

## Foundation bugs

### Open

### Fixed since the last report

## Appendix: history
