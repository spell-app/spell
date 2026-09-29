import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"

import { shared } from "./vite.shared.ts"

/** Absolute path of this spike's `src/`. */
const SPIKE = fileURLToPath(new URL("./src", import.meta.url))

/**
 * Dev server (`yarn dev`, pages under `demo/`) and the library build measured in `REPORT.md`.
 * - One `lib` entry per component, so rolldown splits what they share (Solid, the element core) into chunks;
 *   the `UI` runtime and icon data are dynamic imports, so they get chunks of their own.
 * - Nothing is external:  the measurement is what a CDN / no-bundler consumer downloads, Solid included.
 */
export default defineConfig({
  ...shared,
  build: {
    outDir: "dist",
    sourcemap: false,
    lib: {
      entry: {
        button: `${SPIKE}/components/button/index.ts`,
        dropdown: `${SPIKE}/components/dropdown/index.ts`,
        icon: `${SPIKE}/components/icon/index.ts`,
        label: `${SPIKE}/components/label/index.ts`,
        parts: `${SPIKE}/components/parts/index.ts`,
        divider: `${SPIKE}/components/divider/index.ts`,
        segment: `${SPIKE}/components/segment/index.ts`,
        container: `${SPIKE}/components/container/index.ts`
      },
      formats: ["es"]
    },
    rolldownOptions: {
      output: {
        // MUST stay on:  see the repo's `vite.config.ts`.
        keepNames: true,
        // named groups, so REPORT.md can say what each piece costs:  Solid (+ component-register), and the
        // icon alias maps `Icons` imports statically
        codeSplitting: {
          groups: [
            { name: "solid-runtime", test: /node_modules[\\/](solid-js|@solidjs|component-register)[\\/]/ },
            {
              name: "icon-aliases",
              test: /src[\\/]icons[\\/]data[\\/](aliases|fomantic-aliases|fomantic-clashes)\.json/
            }
          ]
        }
      }
    }
  }
})
