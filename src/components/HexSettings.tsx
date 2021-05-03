import React, { useState } from 'react';
import { randomBytes } from 'crypto';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { gameStarted } from '../slices/gameSlice';
import { startNetplay } from '../netplayClient';
import { colorChosen, selectNetplayActive } from '../slices/netplaySlice';
import { GameSettings } from '../types';
import '../App.global.css';

interface BoardSizeSelectorProps {
  size: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SwapRuleToggleProps {
  enabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface ColorSelectorProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MIN_BOARD_SIZE = 7;
const MAX_BOARD_SIZE = 19;
const DEFAULT_BOARD_SIZE = 13;

function randomBoolean() {
  return randomBytes(1).readUInt8() < 128;
}

function BoardSizeSelector(props: BoardSizeSelectorProps) {
  const { size, onChange } = props;
  return (
    <div>
      <div>
        <label htmlFor="boardSize">
          Board size: {size}
          <input
            type="range"
            min={MIN_BOARD_SIZE}
            max={MAX_BOARD_SIZE}
            value={size}
            onChange={onChange}
            id="boardSize"
          />
        </label>
      </div>
    </div>
  );
}

function SwapRuleToggle(props: SwapRuleToggleProps) {
  const { enabled, onChange } = props;
  return (
    <div>
      <label htmlFor="swapRule">
        Use swap rule
        <input
          type="checkbox"
          checked={enabled}
          onChange={onChange}
          id="swapRule"
        />
      </label>
    </div>
  );
}

function ColorSelector(props: ColorSelectorProps) {
  // TODO don't show this component for local game
  const { value, onChange } = props;
  return (
    <div>
      Color:
      <label htmlFor="random">
        Random
        <input
          type="radio"
          name="color"
          checked={value === 'random'}
          onChange={onChange}
          value="random"
          id="random"
        />
      </label>
      <label htmlFor="black">
        Black
        <input
          type="radio"
          name="color"
          checked={value === 'black'}
          onChange={onChange}
          value="black"
          id="black"
        />
      </label>
      <label htmlFor="white">
        White
        <input
          type="radio"
          name="color"
          checked={value === 'white'}
          onChange={onChange}
          value="white"
          id="white"
        />
      </label>
    </div>
  );
}

export default function HexSettings() {
  const dispatch = useDispatch();
  const history = useHistory();
  const netplayActive = useSelector(selectNetplayActive);

  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [useSwapRule, setUseSwapRule] = useState(true);
  const [color, setColor] = useState('random');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const settings: GameSettings = { boardSize, useSwapRule };
    dispatch(gameStarted(settings));
    if (netplayActive) {
      let isBlack;
      switch (color) {
        case 'black':
          isBlack = true;
          break;
        case 'white':
          isBlack = false;
          break;
        default:
          // TODO use Boolean(randomInt(2)) when it becomes available
          isBlack = randomBoolean();
      }
      dispatch(colorChosen(isBlack));
      startNetplay();
    }
    history.push(netplayActive ? '/hostNetplay' : '/game');
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <BoardSizeSelector
          size={boardSize}
          onChange={(e) => setBoardSize(Number(e.target.value))}
        />
        <SwapRuleToggle
          enabled={useSwapRule}
          onChange={(e) => setUseSwapRule(e.target.checked)}
        />
        <ColorSelector
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <div className="Hello">
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
}
