import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { hexGameStateUpdated } from '../slices/hexGameSlice';
import '../App.global.css';

interface BoardSizeSelectorProps {
  size: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SwapRuleToggleProps {
  enabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function BoardSizeSelector(props: BoardSizeSelectorProps) {
  const { size, onChange } = props;
  return (
    <div>
      <div>Board size: {size}</div>
      <div>
        <input
          type="range"
          min="9"
          max="19"
          value={size}
          onChange={onChange}
          id="boardSize"
        />
      </div>
    </div>
  );
}

function SwapRuleToggle(props: SwapRuleToggleProps) {
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

  const [boardSize, setBoardSize] = useState(14);
  const [useSwapRule, setUseSwapRule] = useState(true);

  const handleSubmit = () => {
    const state = { settings: { boardSize, useSwapRule } };
    dispatch(hexGameStateUpdated(state));
    history.push('/hexGame');
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
