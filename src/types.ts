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

export enum HexagonState {
  WHITE = -1,
  EMPTY = 0,
  BLACK = 1,
}

export interface GameSettings {
  boardSize: number;
  useSwapRule: boolean;
}

export interface GameState {
  settings: GameSettings;
  moveHistory: Array<Array<number>>;
  moveNumber: number;
  swapped: boolean;
  swapPhaseComplete: boolean;
  selectedHexagon: Array<number>;
  resignationState: HexagonState;
}

export interface NetplayState {
  active: boolean;
  connected: boolean;
  hosting: boolean;
  hostCode: string;
  hostCodeSubmitted: boolean;
  isBlack: boolean;
  undoRequestSent: boolean;
  undoRequestReceived: boolean;
}
