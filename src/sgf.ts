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

import { GameState, HexagonState } from './types';

// SGF game type for Hex.
const HEX_GAME_TYPE = 11;

const SGF_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

// Serializes a game to an SGF string using the Hex FF[4] point format
// (e.g. ';B[c3]', ';W[a1]'), where a cell is a column letter from a straight
// 'a'-'z' alphabet ('a' = 0) followed by a 1-indexed row number.
// Colors are resolved with the same rule as `selectBoardState`, so the swap
// case (transposed opening move plus flipped parity) comes out correct. The
// full move history is emitted, regardless of the current navigation position.
//
// An accepted swap is emitted as the standard reflection token: the opening is
// written as Black at its original (un-transposed) cell, immediately followed
// by ';W[swap-pieces]'. `swapChosen` clears the opening and stores it
// transposed as the White stone, and the swap-pieces token itself carries the
// reflection, so a viewer re-derives the same board (original cell cleared,
// White on the mirrored cell) while keeping a legal Black-first move order.
export default function gameStateToSgf(state: GameState): string {
  const { settings, moveHistory, swapped, resignationState } = state;
  const { boardSize } = settings;

  let sgf = `(;FF[4]GM[${HEX_GAME_TYPE}]SZ[${boardSize}]AP[hexp2p]`;

  if (resignationState === HexagonState.BLACK) {
    sgf += 'RE[W+Resign]';
  } else if (resignationState === HexagonState.WHITE) {
    sgf += 'RE[B+Resign]';
  }

  for (let i = 0; i < moveHistory.length; i += 1) {
    if (i === 0 && swapped) {
      // The opening is stored transposed as [origCol, origRow]; emit it as
      // Black at its original cell (reversing the transposition), then the
      // swap-pieces token that reflects it to the stored White position.
      const [origCol, origRow] = moveHistory[0];
      sgf += `;B[${SGF_LETTERS[origCol]}${origRow + 1}]`;
      sgf += ';W[swap-pieces]';
      continue;
    }
    const [row, col] = moveHistory[i];
    const color = Boolean(i % 2) === swapped ? 'B' : 'W';
    const coordinate = `${SGF_LETTERS[col]}${row + 1}`;
    sgf += `;${color}[${coordinate}]`;
  }

  sgf += ')';
  return sgf;
}
