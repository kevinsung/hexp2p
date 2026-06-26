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

// Move/swap commit hooks, shared between HexGame.tsx (human clicks) and
// useAiOpponent.ts (AI worker replies), so both paths apply the same
// swap-phase bookkeeping and netplay messaging. Pulled out of HexGame.tsx to
// avoid a HexGame.tsx <-> useAiOpponent.ts import cycle.

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { moveMade, selectGameState, swapChosen } from '../slices/gameSlice';
import { sendMove, sendSwap } from '../netplayClient';
import {
  selectNetplayState,
  undoRequestFulfilled,
} from '../slices/netplaySlice';

export type Move = [number, number];

// Commits a move: handles the swap-phase bookkeeping and netplay messaging
// that apply regardless of whether the move was made directly, via the
// confirm-move dialog, or by the computer AI.
export function useCommitMove(): (move: Move) => void {
  const dispatch = useDispatch();
  const { active: netplayActive } = useSelector(selectNetplayState);
  const { moveNumber, settings, swapPhaseComplete } =
    useSelector(selectGameState);
  const { useSwapRule } = settings;
  const swapPhaseActive = useSwapRule && !swapPhaseComplete && moveNumber === 1;

  return useCallback(
    (move: Move) => {
      if (swapPhaseActive) {
        dispatch(swapChosen(false));
        if (netplayActive) {
          sendSwap(false);
        }
      }
      dispatch(moveMade(move));
      if (netplayActive) {
        sendMove(move);
        dispatch(undoRequestFulfilled());
      }
    },
    [dispatch, netplayActive, swapPhaseActive],
  );
}

// Commits a swap: handles the netplay messaging that applies regardless of
// whether the swap was made directly, via the confirm-move dialog, or by the
// computer AI.
export function useCommitSwap(): () => void {
  const dispatch = useDispatch();
  const { active: netplayActive } = useSelector(selectNetplayState);

  return useCallback(() => {
    dispatch(swapChosen(true));
    if (netplayActive) {
      sendSwap(true);
      dispatch(undoRequestFulfilled());
    }
  }, [dispatch, netplayActive]);
}
