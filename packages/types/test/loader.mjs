import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Simple ESM resolver hook that auto-resolves extensionless local TypeScript files (.ts, /index.ts)
register(
  pathToFileURL(new URL('./ts-resolver.mjs', import.meta.url).pathname)
);
