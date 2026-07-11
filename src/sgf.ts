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

// Serializes a game to an SGF string using standard two-letter move notation
// (e.g. ';B[cc]', ';W[aa]'), where the first letter is the column and the
// second is the row, both drawn from a straight 'a'-'z' alphabet ('a' = 0).
// Colors are resolved with the same rule as `selectBoardState`, so the swap
// case (transposed opening move plus flipped parity) comes out correct. The
// full move history is emitted, regardless of the current navigation position.
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
    const [row, col] = moveHistory[i];
    const color = Boolean(i % 2) === swapped ? 'B' : 'W';
    const coordinate = `${SGF_LETTERS[col]}${SGF_LETTERS[row]}`;
    sgf += `;${color}[${coordinate}]`;
  }

  sgf += ')';
  return sgf;
}
