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

// Board model for the computer-AI engine. Deliberately has no React/Redux
// dependencies so it can run inside a Web Worker and be unit-tested in
// isolation. A cell's color is tracked exactly like selectBoardState in
// gameSlice.ts; win detection uses a union-find (disjoint-set) structure with
// two virtual border nodes per player so that placing a stone can check for
// a win in ~O(1) instead of a full flood-fill, which matters because the
// MCTS engine places many thousands of stones per move while searching.

import { neighbors } from '../hexAdjacency';
import { HexagonState } from '../types';

export type Player = HexagonState.BLACK | HexagonState.WHITE;

export interface HexBoard {
  size: number;
  // HexagonState per cell, row-major: cells[row * size + col].
  cells: Int8Array;
  // Union-find over cells plus two virtual nodes (TOP, BOTTOM) appended at
  // indices size*size and size*size+1, used to detect a Black (top-bottom)
  // win. Only Black-colored cells (and the virtual nodes) are ever merged
  // into this structure.
  blackParent: Int32Array;
  blackSetSize: Int32Array;
  // Union-find over cells plus two virtual nodes (LEFT, RIGHT), used to
  // detect a White (left-right) win.
  whiteParent: Int32Array;
  whiteSetSize: Int32Array;
  winner: HexagonState;
  // Indices of empty cells, kept in sync by placeStone so that MCTS rollouts
  // (which play uniformly random empty cells many times per move) don't have
  // to rescan the full `cells` array on every ply. emptyPos[i] is the index
  // of cell i within emptyCells, or -1 if cell i is occupied; this allows
  // O(1) removal-by-swap when a stone is placed.
  emptyCells: Array<number>;
  emptyPos: Int32Array;
}

export function toIndex(row: number, col: number, size: number): number {
  return row * size + col;
}

export function toRowCol(index: number, size: number): [number, number] {
  return [Math.floor(index / size), index % size];
}

export function opponent(player: Player): Player {
  return player === HexagonState.BLACK
    ? HexagonState.WHITE
    : HexagonState.BLACK;
}

function find(parent: Int32Array, node: number): number {
  let root = node;
  while (parent[root] !== root) {
    root = parent[root];
  }
  // path compression
  let current = node;
  while (parent[current] !== root) {
    const next = parent[current];
    parent[current] = root;
    current = next;
  }
  return root;
}

function union(parent: Int32Array, setSize: Int32Array, a: number, b: number) {
  const rootA = find(parent, a);
  const rootB = find(parent, b);
  if (rootA === rootB) {
    return;
  }
  // union by size, attaching the smaller set under the larger one's root
  if (setSize[rootA] < setSize[rootB]) {
    parent[rootA] = rootB;
    setSize[rootB] += setSize[rootA];
  } else {
    parent[rootB] = rootA;
    setSize[rootA] += setSize[rootB];
  }
}

function makeUnionFind(virtualNodeCount: number, cellCount: number) {
  const total = cellCount + virtualNodeCount;
  const parent = new Int32Array(total);
  const setSize = new Int32Array(total).fill(1);
  for (let i = 0; i < total; i += 1) {
    parent[i] = i;
  }
  return { parent, setSize };
}

export function createHexBoard(size: number): HexBoard {
  const cellCount = size * size;
  const black = makeUnionFind(2, cellCount);
  const white = makeUnionFind(2, cellCount);
  const emptyCells = new Array<number>(cellCount);
  const emptyPos = new Int32Array(cellCount);
  for (let i = 0; i < cellCount; i += 1) {
    emptyCells[i] = i;
    emptyPos[i] = i;
  }
  return {
    size,
    cells: new Int8Array(cellCount),
    blackParent: black.parent,
    blackSetSize: black.setSize,
    whiteParent: white.parent,
    whiteSetSize: white.setSize,
    winner: HexagonState.EMPTY,
    emptyCells,
    emptyPos,
  };
}

export function cloneHexBoard(board: HexBoard): HexBoard {
  return {
    size: board.size,
    cells: board.cells.slice(),
    blackParent: board.blackParent.slice(),
    blackSetSize: board.blackSetSize.slice(),
    whiteParent: board.whiteParent.slice(),
    whiteSetSize: board.whiteSetSize.slice(),
    winner: board.winner,
    emptyCells: board.emptyCells.slice(),
    emptyPos: board.emptyPos.slice(),
  };
}

// Returns a fresh copy of the board's empty cell indices. Cheap relative to
// the size of the search tree (called only when a node is first created),
// but callers on a hot path (rollouts) should use randomEmptyCell instead.
export function legalMoves(board: HexBoard): Array<number> {
  return board.emptyCells.slice();
}

// Picks a uniformly random empty cell in O(1), for use in MCTS rollouts.
// Assumes the board is not full (winner === EMPTY implies at least one empty
// cell remains, since Hex can't end in a draw).
export function randomEmptyCell(board: HexBoard): number {
  const i = Math.floor(Math.random() * board.emptyCells.length);
  return board.emptyCells[i];
}

function removeEmptyCell(board: HexBoard, index: number) {
  const { emptyCells, emptyPos } = board;
  const pos = emptyPos[index];
  const lastPos = emptyCells.length - 1;
  const lastCell = emptyCells[lastPos];
  emptyCells[pos] = lastCell;
  emptyPos[lastCell] = pos;
  emptyCells.pop();
  emptyPos[index] = -1;
}

// Places a stone of the given player's color at the given cell index,
// updating the relevant union-find structure and `board.winner` if the move
// completes a connection. Assumes the cell is empty and the game is not
// already over; callers (the MCTS engine) are responsible for only
// generating legal moves in non-terminal positions.
export function placeStone(board: HexBoard, index: number, player: Player) {
  const { size } = board;
  board.cells[index] = player;
  removeEmptyCell(board, index);
  const [row, col] = toRowCol(index, size);
  const cellCount = size * size;

  if (player === HexagonState.BLACK) {
    const { blackParent: parent, blackSetSize: setSize } = board;
    const TOP = cellCount;
    const BOTTOM = cellCount + 1;
    if (row === 0) {
      union(parent, setSize, index, TOP);
    }
    if (row === size - 1) {
      union(parent, setSize, index, BOTTOM);
    }
    neighbors([row, col]).forEach(([nrow, ncol]) => {
      if (nrow >= 0 && nrow < size && ncol >= 0 && ncol < size) {
        const nIndex = toIndex(nrow, ncol, size);
        if (board.cells[nIndex] === HexagonState.BLACK) {
          union(parent, setSize, index, nIndex);
        }
      }
    });
    if (find(parent, TOP) === find(parent, BOTTOM)) {
      board.winner = HexagonState.BLACK;
    }
  } else {
    const { whiteParent: parent, whiteSetSize: setSize } = board;
    const LEFT = cellCount;
    const RIGHT = cellCount + 1;
    if (col === 0) {
      union(parent, setSize, index, LEFT);
    }
    if (col === size - 1) {
      union(parent, setSize, index, RIGHT);
    }
    neighbors([row, col]).forEach(([nrow, ncol]) => {
      if (nrow >= 0 && nrow < size && ncol >= 0 && ncol < size) {
        const nIndex = toIndex(nrow, ncol, size);
        if (board.cells[nIndex] === HexagonState.WHITE) {
          union(parent, setSize, index, nIndex);
        }
      }
    });
    if (find(parent, LEFT) === find(parent, RIGHT)) {
      board.winner = HexagonState.WHITE;
    }
  }
}

// Builds a HexBoard from the move history exactly as selectBoardState does
// in gameSlice.ts: even move index belongs to the first player to move, and
// `swapped` flips which color that is.
export function buildHexBoard(
  size: number,
  moveHistory: Array<Array<number>>,
  moveCount: number,
  swapped: boolean,
): HexBoard {
  const board = createHexBoard(size);
  for (let i = 0; i < moveCount; i += 1) {
    const [row, col] = moveHistory[i];
    const player: Player =
      Boolean(i % 2) === swapped ? HexagonState.BLACK : HexagonState.WHITE;
    placeStone(board, toIndex(row, col, size), player);
  }
  return board;
}

export function colorToMoveAfter(moveCount: number, swapped: boolean): Player {
  return Boolean(moveCount % 2) === swapped
    ? HexagonState.BLACK
    : HexagonState.WHITE;
}
