import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { gameStarted } from '../slices/gameSlice';
import { GameSettings } from '../types';
import '../App.global.css';

const MIN_BOARD_SIZE = 5;
const MAX_BOARD_SIZE = 19;
const DEFAULT_BOARD_SIZE = 13;

interface BoardSizeSelectorProps {
  size: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SwapRuleToggleProps {
  enabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function BoardSizeSelector(props: BoardSizeSelectorProps) {
  // TODO use "label" html element
  const { size, onChange } = props;
  return (
    <div>
      <div>Board size: {size}</div>
      <div>
        <input
          type="range"
          min={MIN_BOARD_SIZE}
          max={MAX_BOARD_SIZE}
          value={size}
          onChange={onChange}
          id="boardSize"
        />
      </div>
    </div>
  );
}

function SwapRuleToggle(props: SwapRuleToggleProps) {
  // TODO use "label" html element
  const { enabled, onChange } = props;
  return (
    <div>
      Use swap rule
      <input
        type="checkbox"
        checked={enabled}
        onChange={onChange}
        id="swapRule"
      />
    </div>
  );
}

export default function HexSettings() {
  const dispatch = useDispatch();
  const history = useHistory();

  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [useSwapRule, setUseSwapRule] = useState(true);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const settings: GameSettings = { boardSize, useSwapRule };
    dispatch(gameStarted(settings));
    history.push('/game');
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
        <div className="Hello">
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
}
