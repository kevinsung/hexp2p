// Self-play strength harness for the Hex AI engine.
//
// Runs CANDIDATE (mcts.ts) vs BASELINE (mcts.baseline.ts) head-to-head at a
// fixed maxIterations budget per move — deterministic, machine-independent.
// Alternates which engine moves first across games, and uses the swap rule
// so that both sides get to exercise opening and swap decisions.
//
// Usage:
//   node --require @babel/register scripts/selfplay.ts [CORES]
//   npm run selfplay -- [CORES]
//
// CORES defaults to 1 (sequential).  Pass a higher number to fan games out
// across worker threads, e.g.:
//   npm run selfplay -- 8
//
// Environment overrides (all optional):
//   SELFPLAY_SIZE      board size(s), comma-separated (default: "11,13")
//   SELFPLAY_GAMES     games per board size (default: "100")
//   SELFPLAY_ITERS     MCTS iterations per move (default: "200")
//
// The script prints per-game results and a final summary: win rate ± 95% CI
// and the corresponding Elo difference.

import * as path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
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
// Reporting helpers
// ---------------------------------------------------------------------------

function reportSize(size: number, wins: number, total: number): void {
  const ci = wilsonCI(wins, total);
  const eloCtr = formatElo(wins / total);
  const eloLow = formatElo(ci.low);
  const eloHigh = formatElo(ci.high);

  console.log(`\n  Size ${size}×${size} result:`);
  console.log(
    `    Win rate: ${wins}/${total} = ${((wins / total) * 100).toFixed(1)}%` +
      `  (95% CI: ${(ci.low * 100).toFixed(1)}%–${(ci.high * 100).toFixed(1)}%)`,
  );
  console.log(`    Elo diff: ${eloCtr}  (95% CI: ${eloLow}–${eloHigh})`);
}

function reportCombined(
  sizes: number[],
  winsBySize: Map<number, number>,
  gamesPerSize: number,
): void {
  const grandWins = sizes.reduce((s, sz) => s + (winsBySize.get(sz) ?? 0), 0);
  const grandGames = sizes.length * gamesPerSize;
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

// ---------------------------------------------------------------------------
// Worker thread types and entry
// ---------------------------------------------------------------------------

interface WorkerTask {
  size: number;
  gameIndex: number;
}

interface WorkerData {
  tasks: WorkerTask[];
  maxIterations: number;
}

interface GameResult {
  size: number;
  gameIndex: number;
  candidateWon: boolean;
}

if (!isMainThread) {
  // Worker: run the assigned games and post one result message per game.
  const { tasks, maxIterations: iters } = workerData as WorkerData;
  const opts: SearchOptions = { budgetMs: Infinity, maxIterations: iters };

  for (const { size, gameIndex } of tasks) {
    const candidateIsFirst = gameIndex % 2 === 0;
    const firstMover = candidateIsFirst ? CANDIDATE : BASELINE;
    const secondMover = candidateIsFirst ? BASELINE : CANDIDATE;

    const winnerColor = playGame(size, firstMover, secondMover, opts);
    const candidateWon =
      (candidateIsFirst && winnerColor === HexagonState.BLACK) ||
      (!candidateIsFirst && winnerColor === HexagonState.WHITE);

    const result: GameResult = { size, gameIndex, candidateWon };
    parentPort!.postMessage(result);
  }
} else {
  // ---------------------------------------------------------------------------
  // Main thread
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
  const cores = Math.max(1, parseInt(process.argv[2] ?? '1', 10));

  const opts: SearchOptions = { budgetMs: Infinity, maxIterations };

  console.log('='.repeat(60));
  console.log('Self-play harness  —  candidate vs baseline');
  console.log(`Board sizes: ${sizes.join(', ')}`);
  console.log(
    `Games per size: ${gamesPerSize}  |  Iters per move: ${maxIterations}`,
  );
  console.log('='.repeat(60));

  if (cores === 1) {
    // Sequential path — behavior identical to the original single-core harness.
    const winsBySize = new Map<number, number>(sizes.map((s) => [s, 0]));

    for (const size of sizes) {
      let wins = 0;

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

      winsBySize.set(size, wins);
      reportSize(size, wins, gamesPerSize);
    }

    if (sizes.length > 1) {
      reportCombined(sizes, winsBySize, gamesPerSize);
    }
  } else {
    // Parallel path — fan independent games out across worker threads.

    // Build flat task list in game-index order across all sizes.
    const allTasks: WorkerTask[] = [];
    for (const size of sizes) {
      for (let g = 0; g < gamesPerSize; g += 1) {
        allTasks.push({ size, gameIndex: g });
      }
    }

    const totalGames = allTasks.length;
    const actualCores = Math.min(cores, Math.max(1, totalGames));

    // Round-robin distribute tasks across workers so each gets a balanced
    // mix of sizes and color assignments.
    const workerTaskLists: WorkerTask[][] = Array.from(
      { length: actualCores },
      () => [],
    );
    for (let i = 0; i < allTasks.length; i += 1) {
      workerTaskLists[i % actualCores].push(allTasks[i]);
    }

    // The worker entry is the CommonJS shim that installs @babel/register.
    const workerEntry = path.join(__dirname, 'run-selfplay.js');

    // Per-size accumulators.
    const winsBySize = new Map<number, number>(sizes.map((s) => [s, 0]));
    const completedBySize = new Map<number, number>(sizes.map((s) => [s, 0]));
    let totalDone = 0;

    console.log(
      `\nUsing ${actualCores} worker thread${actualCores === 1 ? '' : 's'}.\n`,
    );

    for (const tasks of workerTaskLists) {
      const data: WorkerData = { tasks, maxIterations };
      const w = new Worker(workerEntry, { workerData: data });

      w.on('message', (result: GameResult) => {
        const { size, gameIndex, candidateWon } = result;

        if (candidateWon) {
          winsBySize.set(size, (winsBySize.get(size) ?? 0) + 1);
        }
        completedBySize.set(size, (completedBySize.get(size) ?? 0) + 1);
        totalDone += 1;

        const wins = winsBySize.get(size) ?? 0;
        const completed = completedBySize.get(size) ?? 0;
        const candidateIsFirst = gameIndex % 2 === 0;
        const label = candidateIsFirst ? 'candidate=BLACK' : 'candidate=WHITE';
        const resultStr = candidateWon ? 'candidate wins' : 'baseline wins ';
        process.stdout.write(
          `  [${size}×${size}]  [${label}]  ${resultStr}  ` +
            `${size}×${size}: ${wins}/${completed} (${((wins / completed) * 100).toFixed(1)}%)\n`,
        );

        if (totalDone === totalGames) {
          // All games done — print per-size and combined summaries.
          for (const s of sizes) {
            reportSize(s, winsBySize.get(s) ?? 0, gamesPerSize);
          }
          if (sizes.length > 1) {
            reportCombined(sizes, winsBySize, gamesPerSize);
          }
        }
      });

      w.on('error', (err: Error) => {
        console.error('Worker error:', err);
        process.exit(1);
      });

      w.on('exit', (code: number) => {
        if (code !== 0) {
          console.error(`Worker exited with code ${code}`);
          process.exit(code);
        }
      });
    }
  }
}
