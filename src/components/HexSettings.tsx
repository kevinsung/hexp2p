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

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { gameStarted } from '../slices/gameSlice';
import { sendSettings, startNetplay } from '../netplayClient';
import {
  colorChosen,
  selectIsConnected,
  selectNetplayState,
} from '../slices/netplaySlice';
import { aiColorChosen, selectAiState } from '../slices/aiSlice';
import { GameSettings } from '../types';
import {
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE,
  getLastSettings,
  setLastSettings,
} from '../lastGameSettings';
import '../App.global.scss';

interface BoardSizeSelectorProps {
  size: number;
  setBoardSize: (size: number) => void;
}

interface SwapRuleToggleProps {
  enabled: boolean;
  setUseSwapRule: (useSwapRule: boolean) => void;
}

interface ColorSelectorProps {
  value: string;
  setColor: (color: string) => void;
}

function randomBoolean() {
  return crypto.getRandomValues(new Uint8Array(1))[0] < 128;
}

// Resolves the 'random' | 'black' | 'white' radio selection shared by
// netplay's and the AI's color pickers into a concrete isBlack boolean.
function resolveIsBlack(color: string): boolean {
  switch (color) {
    case 'black':
      return true;
    case 'white':
      return false;
    default:
      // TODO use Boolean(randomInt(2)) when it becomes available
      return randomBoolean();
  }
}

export function BoardSizeSelector(props: BoardSizeSelectorProps) {
  const { size, setBoardSize } = props;
  return (
    <div>
      <h3 style={{ textAlign: 'center' }}>Board size</h3>
      <label className="BoardSizeSelector" htmlFor="boardSize">
        <div className="BoardSize">{size}</div>
        <div>
          <button
            type="button"
            onClick={() => setBoardSize(Math.max(MIN_BOARD_SIZE, size - 1))}
          >
            −
          </button>
          <input
            type="range"
            min={MIN_BOARD_SIZE}
            max={MAX_BOARD_SIZE}
            value={size}
            onChange={(e) => setBoardSize(Number(e.target.value))}
            id="boardSize"
          />
          <button
            type="button"
            onClick={() => setBoardSize(Math.min(MAX_BOARD_SIZE, size + 1))}
          >
            +
          </button>
        </div>
      </label>
    </div>
  );
}

function SwapRuleToggle(props: SwapRuleToggleProps) {
  const { enabled, setUseSwapRule } = props;
  return (
    <div>
      <h3>Swap rule</h3>
      <label htmlFor="swapRule">
        <div>
          Use swap rule
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setUseSwapRule(e.target.checked)}
            id="swapRule"
          />
        </div>
      </label>
    </div>
  );
}

function ColorSelector(props: ColorSelectorProps) {
  const { active: netplayActive } = useSelector(selectNetplayState);
  const { active: aiActive } = useSelector(selectAiState);

  if (!netplayActive && !aiActive) {
    return null;
  }

  const { value, setColor } = props;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };

  return (
    <div>
      <h3>Color</h3>
      <div>
        <div className="ColorChoice">
          <label htmlFor="random">
            <input
              type="radio"
              name="color"
              checked={value === 'random'}
              onChange={onChange}
              value="random"
              id="random"
            />
            Random
          </label>
        </div>
        <div className="ColorChoice">
          <label htmlFor="black">
            <input
              type="radio"
              name="color"
              checked={value === 'black'}
              onChange={onChange}
              value="black"
              id="black"
            />
            Black
          </label>
        </div>
        <div className="ColorChoice">
          <label htmlFor="white">
            <input
              type="radio"
              name="color"
              checked={value === 'white'}
              onChange={onChange}
              value="white"
              id="white"
            />
            White
          </label>
        </div>
      </div>
    </div>
  );
}

interface HexSettingsProps {
  onStartHosting: () => void;
  onSubmitted?: () => void;
}

export default function HexSettings(props: HexSettingsProps) {
  const { onStartHosting, onSubmitted } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const { active: netplayActive } = useSelector(selectNetplayState);
  const { active: aiActive } = useSelector(selectAiState);
  const connected = useSelector(selectIsConnected);

  const initial = getLastSettings();
  const [boardSize, setBoardSize] = useState(initial.boardSize);
  const [useSwapRule, setUseSwapRule] = useState(initial.useSwapRule);
  const [color, setColor] = useState(initial.color);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLastSettings({ boardSize, useSwapRule, color });
    const settings: GameSettings = { boardSize, useSwapRule };
    dispatch(gameStarted(settings));
    if (netplayActive) {
      const isBlack = resolveIsBlack(color);
      dispatch(colorChosen(isBlack));
      if (connected) {
        sendSettings();
      } else {
        startNetplay();
      }
    } else if (aiActive) {
      // The picker reads as "your color", same as in netplay, so the
      // computer takes whichever color the human didn't choose.
      const isBlack = resolveIsBlack(color);
      dispatch(aiColorChosen(!isBlack));
    }
    if (netplayActive && !connected) {
      onStartHosting();
    } else {
      history.push('/game');
    }
    onSubmitted?.();
  };

  return (
    <form className="HexSettings" onSubmit={handleSubmit}>
      <BoardSizeSelector size={boardSize} setBoardSize={setBoardSize} />
      <SwapRuleToggle enabled={useSwapRule} setUseSwapRule={setUseSwapRule} />
      <ColorSelector value={color} setColor={setColor} />
      <button type="submit">Submit</button>
    </form>
  );
}
