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

// Drives the computer AI: owns the engine Web Worker's lifecycle and, when
// it's the AI's turn, sends it a request and commits whatever move/swap it
// replies with through the same useCommitMove/useCommitSwap hooks a human's
// click would use -- mirroring how netplayClient.ts's handleMessage injects
// a remote opponent's move via a plain moveMade dispatch.

import { useEffect, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { selectAiState, aiThinkingChanged } from '../slices/aiSlice';
import type { RootState } from '../store';
import { selectGameState, selectIsBlackTurn } from '../slices/gameSlice';
import { useCommitMove, useCommitSwap } from '../hooks/useGameCommit';
import { EngineRequest, EngineResponse, Move } from './protocol';

// Single fixed strength for v1 (see the AI design plan): a per-move time
// budget rather than a user-facing difficulty setting.
const MOVE_BUDGET_MS = 1500;

// Monotonically increasing across the whole page lifetime (not per hook
// instance), so a reply can always be matched to the request that caused it
// even across worker recreation.
let nextRequestId = 0;

// Call unconditionally from HexGame.tsx; it's a no-op whenever AI mode isn't
// active. `gameOver` is passed in rather than recomputed here so there's a
// single source of truth (HexGame.tsx already computes it from
// getWinningConnectedComponent for rendering).
export default function useAiOpponent(gameOver: boolean): void {
  const dispatch = useDispatch();
  const store = useStore<RootState>();
  const { active, aiPlaysBlack, thinking, generation } =
    useSelector(selectAiState);
  const { moveHistory, moveNumber, settings, swapPhaseComplete, swapped } =
    useSelector(selectGameState);
  const { useSwapRule, boardSize } = settings;
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const commitMove = useCommitMove();
  const commitSwap = useCommitSwap();

  const workerRef = useRef<Worker | null>(null);
  const pendingRequestId = useRef<number | null>(null);
  const swapDelayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always hold the latest commit callbacks so the worker's message handler
  // (attached once per worker, below) never closes over a stale version.
  const commitMoveRef = useRef(commitMove);
  const commitSwapRef = useRef(commitSwap);
  commitMoveRef.current = commitMove;
  commitSwapRef.current = commitSwap;

  // Worker lifecycle: create one while AI mode is active, terminate it
  // otherwise (covers both leaving AI mode and unmounting HexGame).
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const worker = new Worker(new URL('./engine.worker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<EngineResponse>) => {
      if (event.data.requestId !== pendingRequestId.current) {
        // A stale reply, e.g. the game was reset while this request was in
        // flight; ignore it.
        return;
      }
      // Guard against the window between an undo's aiThinkingCancelled dispatch
      // (synchronous, so `thinking` is already false) and the effect-driven
      // worker.terminate() (asynchronous). If thinking was cancelled, drop
      // the reply without committing the move onto the post-undo board.
      if (!store.getState().ai.thinking) {
        pendingRequestId.current = null;
        return;
      }
      // Brief delay before committing a swap so it doesn't appear instant.
      // thinking stays true during the delay so no second request fires.
      if (event.data.type === 'swap' && event.data.swap) {
        const { requestId } = event.data;
        swapDelayTimeout.current = setTimeout(() => {
          swapDelayTimeout.current = null;
          if (requestId !== pendingRequestId.current) return;
          unstable_batchedUpdates(() => {
            pendingRequestId.current = null;
            dispatch(aiThinkingChanged(false));
            commitSwapRef.current();
          });
        }, 500);
        return;
      }
      // Batch all dispatches into a single render + effect flush. Without this,
      // React 17 in legacy mode processes each dispatch separately (worker
      // callbacks are outside React synthetic event handlers and therefore not
      // auto-batched). That would let the "AI's turn" effect re-fire between
      // the aiThinkingChanged(false) dispatch and the move commit, causing the
      // AI to send a second request and play for both sides.
      unstable_batchedUpdates(() => {
        pendingRequestId.current = null;
        dispatch(aiThinkingChanged(false));
        if (event.data.type === 'swap') {
          commitMoveRef.current(event.data.declineMove);
        } else {
          commitMoveRef.current(event.data.move);
        }
      });
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      pendingRequestId.current = null;
      if (swapDelayTimeout.current !== null) {
        clearTimeout(swapDelayTimeout.current);
        swapDelayTimeout.current = null;
      }
    };
    // `generation` is included so that aiThinkingCancelled (which bumps it)
    // triggers a worker teardown + fresh-worker setup, discarding the
    // in-flight computation and making the worker idle for the next move.
    // `store` is stable (useStore returns a singleton ref), but included to
    // satisfy react-hooks/exhaustive-deps.
  }, [active, generation, dispatch, store]);

  // Whenever it becomes the AI's turn, send exactly one request.
  useEffect(() => {
    if (!active || gameOver || thinking) {
      return;
    }
    // Board not at the latest position (history navigation): don't act. An
    // accepted swap adds one navigable slot, so latest is length + (swapped ? 1
    // : 0) — this must move in lockstep with selectIsBlackTurn or the AI-black
    // opener would think it's not its turn right after a swap.
    if (moveNumber !== moveHistory.length + (swapped ? 1 : 0)) {
      return;
    }
    if (aiPlaysBlack !== isBlackTurn) {
      return;
    }
    const worker = workerRef.current;
    if (!worker) {
      return;
    }

    const requestId = nextRequestId;
    nextRequestId += 1;
    pendingRequestId.current = requestId;

    const swapPhaseActive =
      useSwapRule && !swapPhaseComplete && moveNumber === 1;

    let request: EngineRequest;
    if (swapPhaseActive) {
      request = {
        type: 'swap',
        requestId,
        boardSize,
        moveHistory: moveHistory as [Move],
        budgetMs: MOVE_BUDGET_MS,
      };
    } else if (moveHistory.length === 0 && useSwapRule) {
      // AI plays first under the swap rule: offer a near-fair opening
      // rather than the strongest move, so the opponent's swap decision is
      // genuinely interesting (see mcts.ts's chooseBalancedOpening).
      request = { type: 'opening', requestId, boardSize };
    } else {
      request = {
        type: 'move',
        requestId,
        boardSize,
        moveHistory: moveHistory as Array<Move>,
        swapped,
        budgetMs: MOVE_BUDGET_MS,
      };
    }

    dispatch(aiThinkingChanged(true));
    worker.postMessage(request);
  }, [
    active,
    gameOver,
    thinking,
    moveNumber,
    moveHistory,
    aiPlaysBlack,
    isBlackTurn,
    useSwapRule,
    swapPhaseComplete,
    swapped,
    boardSize,
    dispatch,
  ]);
}
