import baseConfig from './eslint.config.mjs';

// import/no-cycle and friends do recursive cross-file module resolution and
// dominate lint time even on this small repo (measured via TIMING=1 npx
// eslint .: ~75% of rule time before this overlay). They share an internal
// resolver cache, so disabling no-cycle alone barely helps — the other
// resolution-dependent import/* rules just absorb the cost. Full checking
// still runs in CI via `npm run lint` (eslint.config.mjs); this overlay only
// relaxes the local pre-commit hook for speed.
export default [
  ...baseConfig,
  {
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: {
      'import/no-cycle': 'off',
      'import/namespace': 'off',
      'import/default': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },
];
