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

// Bridges and the "savebridge" rollout heuristic (MoHex 2.0, sec. 3): a
// bridge is a pair of same-colored cells with exactly two common empty
// "carrier" neighbors, so that if the opponent occupies one carrier, the
// owner can always occupy the other to keep the two cells connected. During
// random MCTS playouts, deterministically saving a threatened bridge (rather
// than playing a uniformly random empty cell) is a single cheap pattern that
// MoHex 2.0 reports as worth about +100 Elo on its own.
//
// In this row/col adjacency scheme (see hexAdjacency.ts), a cell A's bridge
// partners are at relative offsets formed by summing each pair of A's
// mutually-adjacent neighbors; the pair itself is the two-cell carrier. There
// are exactly 6 such pairs (one per hex direction).

import { hasCoordinates } from '../hexAdjacency';
import { HexBoard, Player, toIndex, toRowCol } from './hexBoard';
import { HexagonState } from '../types';

interface BasePattern {
  bridgeOffset: [number, number];
  carrierOffsets: [[number, number], [number, number]];
}

const BASE_BRIDGES: Array<BasePattern> = [
  {
    bridgeOffset: [-2, 1],
    carrierOffsets: [
      [-1, 0],
      [-1, 1],
    ],
  },
  {
    bridgeOffset: [-1, -1],
    carrierOffsets: [
      [-1, 0],
      [0, -1],
    ],
  },
  {
    bridgeOffset: [-1, 2],
    carrierOffsets: [
      [-1, 1],
      [0, 1],
    ],
  },
  {
    bridgeOffset: [1, -2],
    carrierOffsets: [
      [0, -1],
      [1, -1],
    ],
  },
  {
    bridgeOffset: [1, 1],
    carrierOffsets: [
      [0, 1],
      [1, 0],
    ],
  },
  {
    bridgeOffset: [2, -1],
    carrierOffsets: [
      [1, -1],
      [1, 0],
    ],
  },
];

interface SaveTemplate {
  // Offsets relative to the carrier cell that was just played.
  toOwnStone: [number, number];
  toOtherStone: [number, number];
  toOtherCarrier: [number, number];
}

// For each base bridge pattern, a cell can be "the carrier just played" in
// either of its two carrier roles; this flattens both roles for all 6
// patterns into 12 templates describing, relative to that played cell, where
// to find the two bridged stones and the other (still-empty) carrier to play
// to save the connection.
const SAVE_TEMPLATES: Array<SaveTemplate> = BASE_BRIDGES.flatMap(
  ({ bridgeOffset, carrierOffsets }) =>
    carrierOffsets.map((carrierOffset, i) => {
      const otherCarrierOffset = carrierOffsets[1 - i];
      return {
        toOwnStone: [-carrierOffset[0], -carrierOffset[1]],
        toOtherStone: [
          bridgeOffset[0] - carrierOffset[0],
          bridgeOffset[1] - carrierOffset[1],
        ],
        toOtherCarrier: [
          otherCarrierOffset[0] - carrierOffset[0],
          otherCarrierOffset[1] - carrierOffset[1],
        ],
      } as SaveTemplate;
    }),
);

function randomChoice<T>(items: Array<T>): T {
  return items[Math.floor(Math.random() * items.length)];
}

// If the move just played at `lastMoveIndex` (by the opponent of
// `playerToSave`) occupies one carrier of a bridge between two of
// `playerToSave`'s own stones, returns the index of the other carrier (the
// move that saves the bridge). If several bridges are threatened at once,
// one is chosen at random, matching MoHex's described behavior. Returns null
// if no bridge is threatened.
export function findBridgeSave(
  board: HexBoard,
  lastMoveIndex: number,
  playerToSave: Player,
): number | null {
  const { size } = board;
  const [row, col] = toRowCol(lastMoveIndex, size);
  const saves: Array<number> = [];

  SAVE_TEMPLATES.forEach(({ toOwnStone, toOtherStone, toOtherCarrier }) => {
    const ownStone = [row + toOwnStone[0], col + toOwnStone[1]];
    const otherStone = [row + toOtherStone[0], col + toOtherStone[1]];
    const otherCarrier = [row + toOtherCarrier[0], col + toOtherCarrier[1]];
    if (
      !hasCoordinates(ownStone, size) ||
      !hasCoordinates(otherStone, size) ||
      !hasCoordinates(otherCarrier, size)
    ) {
      return;
    }
    const ownStoneIndex = toIndex(ownStone[0], ownStone[1], size);
    const otherStoneIndex = toIndex(otherStone[0], otherStone[1], size);
    const otherCarrierIndex = toIndex(otherCarrier[0], otherCarrier[1], size);
    if (
      board.cells[ownStoneIndex] === playerToSave &&
      board.cells[otherStoneIndex] === playerToSave &&
      board.cells[otherCarrierIndex] === HexagonState.EMPTY
    ) {
      saves.push(otherCarrierIndex);
    }
  });

  return saves.length > 0 ? randomChoice(saves) : null;
}
