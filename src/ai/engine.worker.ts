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

// Web Worker entry point for the computer-AI engine: receives EngineRequest
// messages from useAiOpponent.ts and runs MCTS off the main thread so the UI
// stays responsive while the AI "thinks". Stateless across requests -- each
// one rebuilds the HexBoard from the move history it's given, exactly like
// netplayClient.ts's incoming messages are stateless dispatches.

import { buildHexBoard, colorToMoveAfter, toIndex, toRowCol } from './hexBoard';
import { chooseBalancedOpening, decideSwap, search } from './mcts';
import {
  EngineRequest,
  EngineResponse,
  MoveRequest,
  OpeningRequest,
  SwapRequest,
} from './protocol';

// Cast to the DOM `Worker` interface purely for its postMessage/onmessage
// shape, which is identical from inside a worker to a main-thread Worker
// instance's. This avoids pulling in the separate "webworker" lib, which
// would conflict with the "dom" lib the rest of the app's single tsconfig
// already relies on.
const ctx = self as unknown as Worker;

function handleMove(request: MoveRequest): EngineResponse {
  const { requestId, boardSize, moveHistory, swapped, budgetMs } = request;
  const board = buildHexBoard(
    boardSize,
    moveHistory,
    moveHistory.length,
    swapped,
  );
  const colorToMove = colorToMoveAfter(moveHistory.length, swapped);
  const lastMove = moveHistory[moveHistory.length - 1];
  const priorMove = lastMove
    ? toIndex(lastMove[0], lastMove[1], boardSize)
    : null;

  const { move } = search(board, colorToMove, { budgetMs }, priorMove);
  return { type: 'move', requestId, move: toRowCol(move, boardSize) };
}

function handleSwap(request: SwapRequest): EngineResponse {
  const { requestId, boardSize, moveHistory, budgetMs } = request;
  // Swap is decided immediately after the (unswapped) opening move, so the
  // mover is always determined the same way selectIsBlackTurn would compute
  // it for moveNumber 1 with swapped still false.
  const board = buildHexBoard(boardSize, moveHistory, 1, false);
  const mover = colorToMoveAfter(1, false);

  const { swap, declineMove } = decideSwap(board, mover, { budgetMs });
  return {
    type: 'swap',
    requestId,
    swap,
    declineMove: toRowCol(declineMove, boardSize),
  };
}

function handleOpening(request: OpeningRequest): EngineResponse {
  const { requestId, boardSize } = request;
  const move = chooseBalancedOpening(boardSize);
  return { type: 'opening', requestId, move: toRowCol(move, boardSize) };
}

ctx.onmessage = (event: MessageEvent<EngineRequest>) => {
  const { data } = event;
  let response: EngineResponse;
  switch (data.type) {
    case 'move':
      response = handleMove(data);
      break;
    case 'swap':
      response = handleSwap(data);
      break;
    case 'opening':
      response = handleOpening(data);
      break;
    default:
      throw new Error(
        `unknown AI engine request type: ${JSON.stringify(data)}`,
      );
  }
  ctx.postMessage(response);
};
