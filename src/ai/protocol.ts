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

// Message protocol between the main thread (useAiOpponent.ts) and the AI
// engine's Web Worker (engine.worker.ts). Moves cross this boundary as plain
// [row, col] pairs (consistent with gameSlice.ts's Move type) rather than
// hexBoard.ts's internal cell-index encoding, since the worker is the only
// place that needs to know about that internal representation.

export type Move = [number, number];

interface BaseRequest {
  requestId: number;
  boardSize: number;
}

// Asks for a normal move: `moveHistory` reflects the real game position
// (including the opening move, win/swap already resolved), and the engine
// infers whose turn it is and the most recent move from it.
export interface MoveRequest extends BaseRequest {
  type: 'move';
  moveHistory: Array<Move>;
  swapped: boolean;
  budgetMs: number;
}

// Asks for the swap/no-swap decision after the opening move (moveHistory
// has exactly one entry, swapped is always false at this point in a real
// game -- see gameSlice.ts's swapPhaseActive condition).
export interface SwapRequest extends BaseRequest {
  type: 'swap';
  moveHistory: [Move];
  budgetMs: number;
}

// Asks for a deliberately near-fair opening move, used only when the AI
// plays first under the swap rule (see mcts.ts's chooseBalancedOpening).
export interface OpeningRequest extends BaseRequest {
  type: 'opening';
}

export type EngineRequest = MoveRequest | SwapRequest | OpeningRequest;

export interface MoveResponse {
  type: 'move';
  requestId: number;
  move: Move;
}

export interface SwapResponse {
  type: 'swap';
  requestId: number;
  swap: boolean;
  // mover's best reply if declining; see mcts.ts's SwapDecision.
  declineMove: Move;
}

export interface OpeningResponse {
  type: 'opening';
  requestId: number;
  move: Move;
}

export type EngineResponse = MoveResponse | SwapResponse | OpeningResponse;
