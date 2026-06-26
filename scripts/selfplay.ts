// Self-play strength harness for the Hex AI engine.
//
// Runs CANDIDATE (mcts.ts) vs BASELINE (mcts.baseline.ts) head-to-head at a
// fixed maxIterations budget per move — deterministic, machine-independent.
// Alternates which engine moves first across games, and uses the swap rule
// so that both sides get to exercise opening and swap decisions.
//
// Usage:
//   node --require @babel/register scripts/selfplay.ts
//
// Environment overrides (all optional):
//   SELFPLAY_SIZE      board size(s), comma-separated (default: "11,13")
//   SELFPLAY_GAMES     games per board size (default: "100")
//   SELFPLAY_ITERS     MCTS iterations per move (default: "200")
//
// The script prints per-game results and a final summary: win rate ± 95% CI
// and the corresponding Elo difference.
//
// Run `npm run selfplay` to invoke with the default settings.

import {
  search as candidateSearch,
  decideSwap as candidateDecideSwap,
  chooseBalancedOpening,
  SearchOptions,
} from '../src/ai/mcts';
import {
  search as baselineSearch,
  decideSwap as baselineDecideSwap,
} from '../src/ai/mcts.baseline';
import {
  HexBoard,
  Player,
  createHexBoard,
  placeStone,
  opponent,
} from '../src/ai/hexBoard';
import { HexagonState } from '../src/types';

// ---------------------------------------------------------------------------
// Engine interface
// ---------------------------------------------------------------------------

type SearchFn = (
  board: HexBoard,
  color: Player,
  opts: SearchOptions,
  priorMove?: number | null,
) => { move: number; value: number };

type DecideSwapFn = (
  board: HexBoard,
  mover: Player,
  opts: SearchOptions,
) => { swap: boolean; declineMove: number };

interface Engine {
  name: string;
  search: SearchFn;
  decideSwap: DecideSwapFn;
}

const CANDIDATE: Engine = {
  name: 'candidate',
  search: candidateSearch,
  decideSwap: candidateDecideSwap,
};

const BASELINE: Engine = {
  name: 'baseline',
  search: baselineSearch,
  decideSwap: baselineDecideSwap,
};

// ---------------------------------------------------------------------------
// Single-game simulation
// ---------------------------------------------------------------------------

// Plays one game using the swap rule. `firstMover` makes the opening (as
// BLACK) and then plays as BLACK throughout; `secondMover` faces the swap
// decision and plays as WHITE throughout (regardless of whether they swap —
// the board position changes but color assignments stay fixed).
// Returns the winner's color.
function playGame(
  size: number,
  firstMover: Engine,
  secondMover: Engine,
  opts: SearchOptions,
): Player {
  let board = createHexBoard(size);
  let priorMove: number | null = null;

  // Opening: first mover picks a (near-fair) balanced opening.
  const openingMove = chooseBalancedOpening(size);
  placeStone(board, openingMove, HexagonState.BLACK);
  priorMove = openingMove;

  // Swap decision: second mover (WHITE) decides whether to accept.
  const { swap, declineMove } = secondMover.decideSwap(
    board,
    HexagonState.WHITE,
    opts,
  );

  if (swap) {
    // Build the mirrored board: reflection of the opening stone across the
    // diagonal, recolored WHITE. Black (first mover) plays next.
    const openingRow = Math.floor(openingMove / size);
    const openingCol = openingMove % size;
    const mirroredIndex = openingCol * size + openingRow;
    board = createHexBoard(size);
    placeStone(board, mirroredIndex, HexagonState.WHITE);
    priorMove = mirroredIndex;
  } else {
    // No swap: second mover's first response (already computed by decideSwap).
    placeStone(board, declineMove, HexagonState.WHITE);
    priorMove = declineMove;
  }

  // Continue: alternate first mover (BLACK) and second mover (WHITE).
  let colorToMove: Player = HexagonState.BLACK;
  while (board.winner === HexagonState.EMPTY) {
    const mover = colorToMove === HexagonState.BLACK ? firstMover : secondMover;
    const { move } = mover.search(board, colorToMove, opts, priorMove);
    placeStone(board, move, colorToMove);
    priorMove = move;
    colorToMove = opponent(colorToMove);
  }

  return board.winner as Player;
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

// Wilson score 95% confidence interval for a proportion w/n.
function wilsonCI(
  w: number,
  n: number,
): { low: number; high: number; center: number } {
  if (n === 0) return { low: 0.5, high: 0.5, center: 0.5 };
  const z = 1.96;
  const p = w / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const margin =
    (z / denom) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
    center,
  };
}

// Elo difference from win probability p (positive = candidate is stronger).
// Returns null when p is exactly 0 or 1 (infinite Elo).
function eloFromWinRate(p: number): number | null {
  if (p <= 0 || p >= 1) return null;
  return 400 * Math.log10(p / (1 - p));
}

function formatElo(p: number): string {
  const e = eloFromWinRate(p);
  return e === null
    ? p >= 1
      ? '+∞'
      : '-∞'
    : (e >= 0 ? '+' : '') + e.toFixed(1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseSizes(raw: string): number[] {
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

const sizes = parseSizes(process.env.SELFPLAY_SIZE ?? '11,13');
const gamesPerSize = parseInt(process.env.SELFPLAY_GAMES ?? '100', 10);
const maxIterations = parseInt(process.env.SELFPLAY_ITERS ?? '200', 10);

const opts: SearchOptions = { budgetMs: Infinity, maxIterations };

console.log('='.repeat(60));
console.log('Self-play harness  —  candidate vs baseline');
console.log(`Board sizes: ${sizes.join(', ')}`);
console.log(
  `Games per size: ${gamesPerSize}  |  Iters per move: ${maxIterations}`,
);
console.log('='.repeat(60));

let grandWins = 0;
let grandGames = 0;

for (const size of sizes) {
  let wins = 0; // wins for CANDIDATE across all color assignments

  console.log(`\n--- Board ${size}×${size} (${gamesPerSize} games) ---`);

  for (let g = 0; g < gamesPerSize; g += 1) {
    // Alternate which engine moves first: even games → candidate first,
    // odd games → baseline first.
    const candidateIsFirst = g % 2 === 0;
    const firstMover = candidateIsFirst ? CANDIDATE : BASELINE;
    const secondMover = candidateIsFirst ? BASELINE : CANDIDATE;

    const winnerColor = playGame(size, firstMover, secondMover, opts);

    // Candidate wins if: it was first mover and BLACK won, or it was second
    // mover and WHITE won.
    const candidateWon =
      (candidateIsFirst && winnerColor === HexagonState.BLACK) ||
      (!candidateIsFirst && winnerColor === HexagonState.WHITE);

    if (candidateWon) wins += 1;

    const label = candidateIsFirst ? 'candidate=BLACK' : 'candidate=WHITE';
    const result = candidateWon ? 'candidate wins' : 'baseline wins';
    const runningRate = wins / (g + 1);
    process.stdout.write(
      `  game ${String(g + 1).padStart(3)}/${gamesPerSize}  [${label}]  ` +
        `${result}  cumulative: ${wins}/${g + 1} (${(runningRate * 100).toFixed(1)}%)\n`,
    );
  }

  const ci = wilsonCI(wins, gamesPerSize);
  const eloCtr = formatElo(wins / gamesPerSize);
  const eloLow = formatElo(ci.low);
  const eloHigh = formatElo(ci.high);

  console.log(`\n  Size ${size}×${size} result:`);
  console.log(
    `    Win rate: ${wins}/${gamesPerSize} = ${((wins / gamesPerSize) * 100).toFixed(1)}%` +
      `  (95% CI: ${(ci.low * 100).toFixed(1)}%–${(ci.high * 100).toFixed(1)}%)`,
  );
  console.log(`    Elo diff: ${eloCtr}  (95% CI: ${eloLow}–${eloHigh})`);

  grandWins += wins;
  grandGames += gamesPerSize;
}

if (sizes.length > 1) {
  const ci = wilsonCI(grandWins, grandGames);
  console.log('\n' + '='.repeat(60));
  console.log('  Combined result (all sizes):');
  console.log(
    `    Win rate: ${grandWins}/${grandGames} = ${((grandWins / grandGames) * 100).toFixed(1)}%` +
      `  (95% CI: ${(ci.low * 100).toFixed(1)}%–${(ci.high * 100).toFixed(1)}%)`,
  );
  console.log(
    `    Elo diff: ${formatElo(grandWins / grandGames)}  (95% CI: ${formatElo(ci.low)}–${formatElo(ci.high)})`,
  );
  console.log('='.repeat(60));
}
