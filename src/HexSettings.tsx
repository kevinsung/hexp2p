import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import './App.global.css';

interface BoardSizeSelectorProps {
  size: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

interface SwapRuleToggleProps {
  on: boolean;
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
  const { on, onChange } = props;
  return (
    <div>
      Use swap rule
      <input type="checkbox" checked={on} onChange={onChange} id="swapRule" />
    </div>
  );
}

export default function HexSettings() {
  const history = useHistory();
  const [boardSize, setBoardSize] = useState(14);
  const [swapRule, setSwapRule] = useState(true);

  const handleSubmit = () => {
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
          on={swapRule}
          onChange={(e) => setSwapRule(e.target.checked)}
        />
        <div className="Hello">
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
}
