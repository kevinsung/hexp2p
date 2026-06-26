// Jest mock for ./useAiOpponent, used so tests that render HexGame.tsx (e.g.
// App.test.tsx) don't load the real hook, which constructs a Web Worker via
// `new Worker(new URL('./engine.worker.ts', import.meta.url))`. Babel can
// parse `import.meta` (via @babel/plugin-syntax-import-meta) but, under
// Jest's CommonJS module transform, can't execute it -- the same class of
// problem as ../../__mocks__/firebase.ts, which exists for the same reason.
// The AI engine's actual logic (mcts.ts, hexBoard.ts, bridges.ts) is
// unit-tested directly in src/ai/__tests__ without going through this hook
// or a real worker.

// Deliberately takes no parameters: an implementation is allowed to ignore
// arguments the caller (HexGame.tsx) passes, and TS's structural typing
// permits this in place of the real hook's `(gameOver: boolean) => void`.
export default function useAiOpponent(): void {
  // no-op
}
