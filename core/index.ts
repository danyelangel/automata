/**
 * Automata core – backend only (no Vue). Use from Node/Cloud Functions.
 * Explicit /index.ts paths so Node ESM resolver finds the file (package ships .ts).
 */
export * from './types/index.ts'
export * from './tools/index.ts'
export * from './engine/index.ts'
export * from './automations/index.ts'
