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

// Hex-grid adjacency helpers shared between win detection (getWinningConnectedComponent)
// and the computer-AI engine (src/ai). A cell's 6 neighbors in this row/col scheme are the
// two cells in the same row, the two in the same column, and the two diagonal cells that
// complete the hexagonal tiling.

export function hasCoordinates(coordinates: Array<number>, boardSize: number) {
  const [row, col] = coordinates;
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

export function neighbors(coordinates: Array<number>) {
  const [row, col] = coordinates;
  return [
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
    [row + 1, col - 1],
    [row + 1, col],
  ];
}
