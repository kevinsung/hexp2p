import React, { useState } from 'react';
import { randomBytes } from 'crypto';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import { gameStarted } from '../slices/gameSlice';
import { startNetplay } from '../netplayClient';
import { colorChosen, selectNetplayState } from '../slices/netplaySlice';
import { GameSettings } from '../types';
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

const MIN_BOARD_SIZE = 7;
const MAX_BOARD_SIZE = 19;
const DEFAULT_BOARD_SIZE = 13;

function randomBoolean() {
  return randomBytes(1).readUInt8() < 128;
}

function BoardSizeSelector(props: BoardSizeSelectorProps) {
  const { size, setBoardSize } = props;
  return (
    <div>
      <h3>Board size</h3>
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
            className="SwapRuleCheckBox"
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

  if (!netplayActive) {
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

export default function HexSettings() {
  const dispatch = useDispatch();
  const history = useHistory();
  const { active: netplayActive } = useSelector(selectNetplayState);

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
    <div className="HexSettings">
      <div className="HomeButtonTopPanel">
        <Link className="HomeButton" to="/">
          <button type="button">Home</button>
        </Link>
        <h1>Settings</h1>
        <div />
      </div>
      <div>
        <form onSubmit={handleSubmit}>
          <BoardSizeSelector size={boardSize} setBoardSize={setBoardSize} />
          <SwapRuleToggle
            enabled={useSwapRule}
            setUseSwapRule={setUseSwapRule}
          />
          <ColorSelector value={color} setColor={setColor} />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
}
