// Copyright (C) 2021 Kevin J. Sung
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// The computer-AI engine: Monte Carlo tree search (UCT) augmented with RAVE
// and the savebridge rollout heuristic, following MoHex 2.0's reported
// cheapest, highest-value ingredients (see 2013-CG-Mohex2.0.pdf secs. 3-4).
// Runs entirely on the plain HexBoard model in hexBoard.ts, with no
// React/Redux dependency, so it works inside a Web Worker and is
// unit-testable on its own.
//
// RAVE here is a simplified, "global AMAF" variant: rather than restricting
// each node's all-moves-as-first statistics to moves played strictly after
// that node (the textbook definition), every node along the path is updated
// using every move of its color played anywhere in the iteration (tree part
// and rollout combined). This is cheaper to compute and a common
// simplification; it still captures most of RAVE's benefit of sharing
// information across siblings before they accumulate many direct visits.

import { findBridgeSave } from './bridges';
import {
  HexBoard,
  Player,
  cloneHexBoard,
  createHexBoard,
  legalMoves,
  opponent,
  placeStone,
  randomEmptyCell,
  toIndex,
  toRowCol,
} from './hexBoard';
import { HexagonState } from '../types';

// Exploration constant in the UCT term. MoHex 2.0 reports that with RAVE
// present, the best setting for their analogous constant is 0 (relying on
// RAVE alone for exploration); we keep a small positive value as a simple
// safety net rather than re-deriving their tuning.
const EXPLORATION_CONSTANT = 0.3;

// RAVE/MC equivalence parameter (Gelly & Silver): controls how many direct
// visits a node needs before its RAVE estimate is mostly phased out in favor
// of its own statistics. Larger values trust RAVE for longer.
const RAVE_EQUIVALENCE = 300;

export interface Node {
  // The cell played to reach this node from its parent; -1 for the root.
  move: number;
  parent: Node | null;
  // The player whose turn it is to move *from* this node, i.e. the color of
  // any of this node's children's `move`.
  colorToMove: Player;
  children: Map<number, Node>;
  untriedMoves: Array<number>;
  visits: number;
  // Wins for the color that played `move` to reach this node (the parent's
  // colorToMove), out of `visits` simulations passing through this node.
  wins: number;
  // RAVE (all-moves-as-first) statistics, keyed by candidate move, for the
  // moves this node's colorToMove could make. Stored on the parent (this
  // node) rather than the children so it can be consulted before a sibling
  // has been expanded at all.
  raveVisits: Map<number, number>;
  raveWins: Map<number, number>;
}

type MoveLists = Record<Player, Array<number>>;

export interface SearchOptions {
  budgetMs: number;
  // Safety cap on iterations, mainly useful in tests so they terminate
  // quickly regardless of wall-clock time.
  maxIterations?: number;
  // One-shot extension budget (ms) added when the position is "unstable"
  // (most-visited child ≠ highest-win-rate child) at the main deadline.
  // Defaults to half of budgetMs; pass 0 to disable.
  extensionMs?: number;
}

export interface SearchOutcome {
  move: number;
  // Estimated win probability for the color that made `move`.
  value: number;
  // The search root, exposed for tree reuse on the next turn.
  root: Node;
}

function shuffled(items: Array<number>): Array<number> {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function createNode(
  move: number,
  parent: Node | null,
  colorToMove: Player,
  board: HexBoard,
): Node {
  return {
    move,
    parent,
    colorToMove,
    children: new Map(),
    untriedMoves: shuffled(legalMoves(board)),
    visits: 0,
    wins: 0,
    raveVisits: new Map(),
    raveWins: new Map(),
  };
}

// Picks the child maximizing a UCT score blended with its RAVE estimate.
// Assumes every child already has at least one visit (true here because
// runIteration immediately simulates through any newly expanded node).
function selectChild(node: Node): Node {
  let best: Node | null = null;
  let bestScore = -Infinity;
  const logParentVisits = Math.log(node.visits + 1);

  node.children.forEach((child) => {
    const q = child.wins / child.visits;
    const raveVisits = node.raveVisits.get(child.move) ?? 0;
    const raveWins = node.raveWins.get(child.move) ?? 0;
    const beta =
      raveVisits > 0
        ? Math.sqrt(RAVE_EQUIVALENCE / (3 * child.visits + RAVE_EQUIVALENCE))
        : 0;
    const r = raveVisits > 0 ? raveWins / raveVisits : 0;
    const exploration =
      EXPLORATION_CONSTANT * Math.sqrt(logParentVisits / child.visits);
    const score = (1 - beta) * (q + exploration) + beta * r;
    if (score > bestScore) {
      bestScore = score;
      best = child;
    }
  });

  if (best === null) {
    throw new Error('selectChild() called on a node with no children');
  }
  return best;
}

// Plays out a position to completion with uniformly random moves, except
// that a player whose bridge is threatened by the immediately preceding move
// always saves it (the savebridge heuristic). Mutates `board` in place and
// records every move played, by color, into `moveLists`.
function rollout(
  board: HexBoard,
  colorToMove: Player,
  lastMove: number | null,
  moveLists: MoveLists,
): Player {
  let mover = colorToMove;
  let previousMove = lastMove;

  while (board.winner === HexagonState.EMPTY) {
    const bridgeSave =
      previousMove !== null ? findBridgeSave(board, previousMove, mover) : null;
    const move = bridgeSave ?? randomEmptyCell(board);
    placeStone(board, move, mover);
    moveLists[mover].push(move);
    previousMove = move;
    mover = opponent(mover);
  }

  return board.winner as Player;
}

function runIteration(
  rootBoard: HexBoard,
  root: Node,
  priorMove: number | null,
) {
  const board = cloneHexBoard(rootBoard);
  const path: Array<Node> = [root];
  let node = root;
  let lastMove = priorMove;

  // Selection: descend the existing tree while every move at the current
  // node has already been expanded at least once.
  while (
    node.untriedMoves.length === 0 &&
    node.children.size > 0 &&
    board.winner === HexagonState.EMPTY
  ) {
    const moverColor = node.colorToMove;
    node = selectChild(node);
    placeStone(board, node.move, moverColor);
    lastMove = node.move;
    path.push(node);
  }

  // Expansion: add one new child for an untried move, if the game isn't
  // already over.
  if (board.winner === HexagonState.EMPTY && node.untriedMoves.length > 0) {
    const moverColor = node.colorToMove;
    const moveIndex = node.untriedMoves.pop() as number;
    placeStone(board, moveIndex, moverColor);
    lastMove = moveIndex;
    const child = createNode(moveIndex, node, opponent(moverColor), board);
    node.children.set(moveIndex, child);
    node = child;
    path.push(node);
  }

  const moveLists: MoveLists = {
    [HexagonState.BLACK]: [],
    [HexagonState.WHITE]: [],
  };
  for (let i = 1; i < path.length; i += 1) {
    const moverColor = path[i - 1].colorToMove;
    moveLists[moverColor].push(path[i].move);
  }

  const winner =
    board.winner !== HexagonState.EMPTY
      ? (board.winner as Player)
      : rollout(board, node.colorToMove, lastMove, moveLists);

  for (let i = 1; i < path.length; i += 1) {
    const child = path[i];
    const moverColor = path[i - 1].colorToMove;
    child.visits += 1;
    if (winner === moverColor) {
      child.wins += 1;
    }
  }
  root.visits += 1;

  path.forEach((p) => {
    const movesOfItsColor = moveLists[p.colorToMove];
    movesOfItsColor.forEach((m) => {
      p.raveVisits.set(m, (p.raveVisits.get(m) ?? 0) + 1);
      if (winner === p.colorToMove) {
        p.raveWins.set(m, (p.raveWins.get(m) ?? 0) + 1);
      }
    });
  });
}

// Runs MCTS from `rootBoard` (not mutated) with `colorToMove` to play, for
// up to `options.budgetMs` milliseconds, and returns the most-visited move
// along with its estimated win probability for colorToMove. `priorMove`, if
// given, is the most recent real move played before this search (used so
// that a savebridge reply is considered on the very first simulated ply).
// `existingRoot`, if provided, is a previously-built subtree to resume from
// (tree reuse: the worker passes the cached child for the opponent's reply).
export function search(
  rootBoard: HexBoard,
  colorToMove: Player,
  options: SearchOptions,
  priorMove: number | null = null,
  existingRoot?: Node,
): SearchOutcome {
  const deadline = Date.now() + options.budgetMs;
  const maxIterations = options.maxIterations ?? Infinity;
  const root = existingRoot ?? createNode(-1, null, colorToMove, rootBoard);

  if (root.untriedMoves.length === 0 && root.children.size === 0) {
    throw new Error('search() called on a position with no legal moves');
  }

  let iterations = 0;
  do {
    runIteration(rootBoard, root, priorMove);
    iterations += 1;
  } while (iterations < maxIterations && Date.now() < deadline);

  // Extend-on-unstable (MoHex 2.0 §3.2, +35 Elo): if the most-visited child
  // is not also the highest-win-rate child the position hasn't converged yet.
  // Run one extension of half the original budget to let it settle.
  if (root.children.size > 0 && iterations < maxIterations) {
    const extensionBudget = options.extensionMs ?? options.budgetMs / 2;
    if (
      extensionBudget > 0 &&
      mostVisitedChild(root) !== highestWinRateChild(root)
    ) {
      const extDeadline = Date.now() + extensionBudget;
      do {
        runIteration(rootBoard, root, priorMove);
        iterations += 1;
      } while (iterations < maxIterations && Date.now() < extDeadline);
    }
  }

  const bestChild = mostVisitedChild(root);
  return {
    move: bestChild.move,
    value: bestChild.wins / bestChild.visits,
    root,
  };
}

function mostVisitedChild(node: Node): Node {
  let best: Node | null = null;
  node.children.forEach((child) => {
    if (best === null || child.visits > best.visits) {
      best = child;
    }
  });
  if (best === null) {
    throw new Error('mostVisitedChild() called on a node with no children');
  }
  return best;
}

function highestWinRateChild(node: Node): Node {
  let best: Node | null = null;
  let bestRate = -Infinity;
  node.children.forEach((child) => {
    const rate = child.visits > 0 ? child.wins / child.visits : -Infinity;
    if (rate > bestRate) {
      bestRate = rate;
      best = child;
    }
  });
  if (best === null) {
    throw new Error('highestWinRateChild() called on a node with no children');
  }
  return best;
}

function findSoleStone(board: HexBoard): number {
  for (let i = 0; i < board.cells.length; i += 1) {
    if (board.cells[i] !== HexagonState.EMPTY) {
      return i;
    }
  }
  throw new Error('expected exactly one stone on the board');
}

// Builds the position that results from accepting the swap: the lone
// opening stone (currently `opponent(mover)`'s color) is mirrored across the
// board's diagonal and recolored to `mover`, exactly as swapChosen(true)
// does to moveHistory in gameSlice.ts.
function mirroredSwapBoard(board: HexBoard, mover: Player): HexBoard {
  const index = findSoleStone(board);
  const [row, col] = toRowCol(index, board.size);
  const mirroredIndex = toIndex(col, row, board.size);
  const fresh = createHexBoard(board.size);
  placeStone(fresh, mirroredIndex, mover);
  return fresh;
}

export interface SwapDecision {
  swap: boolean;
  // mover's best reply if declining, computed either way: useCommitMove
  // already folds "decline" into making this move (see HexGame.tsx's
  // useCommitMove), so the caller needs it in hand for that case without a
  // second search.
  declineMove: number;
}

// Decides whether `mover` (the player facing the swap decision, with exactly
// one stone on the board) should swap, by comparing mover's estimated win
// probability if they decline and play their best reply, against their win
// probability if they accept the swap.
export function decideSwap(
  boardAfterOpening: HexBoard,
  mover: Player,
  options: SearchOptions,
): SwapDecision {
  const decline = search(boardAfterOpening, mover, options);

  const swappedBoard = mirroredSwapBoard(boardAfterOpening, mover);
  const opponentReply = search(swappedBoard, opponent(mover), options);
  const acceptValue = 1 - opponentReply.value;

  return { swap: acceptValue > decline.value, declineMove: decline.move };
}

// A small set of near-fair opening cells for when the AI plays first under
// the swap rule. The board center is the strongest opening and would make
// declining to swap an easy call for the human; cells adjacent to the acute
// corners are known to be much closer to fair, so offering one of them
// makes the swap decision genuinely interesting.
export function chooseBalancedOpening(size: number): number {
  const candidates: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [size - 1, size - 2],
    [size - 2, size - 1],
  ];
  const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
  return toIndex(row, col, size);
}
