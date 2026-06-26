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

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface NetplayState {
  active: boolean;
  connectionStatus: ConnectionStatus;
  statusMessage: string;
  hosting: boolean;
  hostCode: string;
  isBlack: boolean;
  // false when no request is pending; otherwise the moveHistory.length the
  // request/acceptance applies to, so stale messages can be detected.
  undoRequestSent: number | false;
  undoRequestReceived: number | false;
}

export interface AiState {
  active: boolean;
  aiPlaysBlack: boolean;
  // Whether a request to the AI worker is currently outstanding, so the UI
  // can show a "thinking" indicator and keep the board locked.
  thinking: boolean;
}
