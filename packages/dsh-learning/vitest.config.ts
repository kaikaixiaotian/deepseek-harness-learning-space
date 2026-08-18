import { defineConfig } from 'vitest/config'

// The service-level tests import the BUILT lib/index.js, not src: Node's V8
// cannot parse the standard @Remote decorators, and only tsc's emitter (the
// package's build, via `pnpm test`) lowers them to __esDecorate helpers.
// The es2022 transform target below covers decorator-free TS sources.
export default defineConfig({
  esbuild: { target: 'es2022' },
  test: {
    include: ['tests/**/*.spec.ts'],
  },
})
