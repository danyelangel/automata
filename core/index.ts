/**
 * Automata core – backend only (no Vue). Use from Node/Cloud Functions.
 * Use explicit /index paths so Node ESM resolver does not treat these as directory imports.
 */
export * from './types/index'
export * from './tools/index'
export * from './engine/index'
export * from './automations/index'
