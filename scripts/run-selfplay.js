// CommonJS entry point for the selfplay harness.
// @babel/register intercepts the TypeScript imports before Node's ESM loader
// sees them, transforming everything to CommonJS at require() time.
require('@babel/register')({ extensions: ['.ts'] });
require('./selfplay.ts');
