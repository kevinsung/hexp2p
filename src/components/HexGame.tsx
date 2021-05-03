import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  hexagonSelected,
  moveMade,
  selectBoardState,
  selectGameState,
  swapPhaseCompleted,
} from '../slices/gameSlice';
import { sendMove, sendSwap } from '../netplayClient';
import { selectNetplayState, swapChosen } from '../slices/netplaySlice';
import getWinningConnectedComponent from '../slices/getWinningConnectedComponent';
import { HexagonState } from '../types';
import '../App.global.css';

interface HexagonProps {
  boardState: Array<Array<number>>;
  row: number;
  col: number;
  disabled: boolean;
}

interface HexagonsProps {
  boardState: Array<Array<number>>;
  disabled: boolean;
}

interface HexBoardProps {
  boardState: Array<Array<number>>;
  winningComponent: Array<Array<number>>;
  disabled: boolean;
}

interface ComponentMarkerProps {
  component: Array<Array<number>>;
}

const COORDINATE_LETTERS = 'ABCDEFGHJKLMNOPQRST';

function SwapDialog() {
  const dispatch = useDispatch();
  const { active: netplayActive, connected, isBlack } = useSelector(
    selectNetplayState
  );
  const { moveNumber, settings, swapPhaseComplete } = useSelector(
    selectGameState
  );
  const { useSwapRule } = settings;

  if (!useSwapRule || swapPhaseComplete || moveNumber !== 1) {
    return <div />;
  }

  if (netplayActive && isBlack) {
    return <div>SWAP PHASE: Waiting for opponent to choose color...</div>;
  }

  const handleSwap = (swap: boolean) => {
    dispatch(swapPhaseCompleted());
    if (netplayActive && connected) {
      dispatch(swapChosen(swap));
      sendSwap(swap);
    }
  };

  return (
    <div>
      SWAP PHASE: Choose your color
      <button type="button" onClick={() => handleSwap(true)}>
        Black
      </button>
      <button type="button" onClick={() => handleSwap(false)}>
        White
      </button>
    </div>
  );
}

function Hexagon(props: HexagonProps) {
  const { boardState, row, col, disabled } = props;
  const dispatch = useDispatch();
  const { active: netplayActive, connected } = useSelector(selectNetplayState);
  const { moveHistory, moveNumber, selectedHexagon } = useSelector(
    selectGameState
  );
  const [selectedRow, selectedCol] = selectedHexagon;

  const d = 0.5 * Math.sqrt(3);
  const translateX = (row + 1 + 2 * col) * d;
  const translateY = 1 + 1.5 * row;
  const transform = `translate(${translateX} ${translateY})`;
  const points = `0,1 ${d},0.5 ${d},-0.5 0,-1 ${-d},-0.5 ${-d},0.5`;

  let circleFill = '#000000';
  let circleOpacity = 0.0;
  switch (boardState[row][col]) {
    case HexagonState.BLACK:
      circleFill = '#000000';
      circleOpacity = 1.0;
      break;
    case HexagonState.WHITE:
      circleFill = '#ffffff';
      circleOpacity = 1.0;
      break;
    case HexagonState.EMPTY:
      if (row === selectedRow && col === selectedCol) {
        circleFill = moveNumber % 2 === 0 ? '#000000' : '#ffffff';
        circleOpacity = 0.5;
      }
      break;
    // no default
  }

  const lastMove = moveNumber > 0 ? moveHistory[moveNumber - 1] : [NaN, NaN];
  const [lrow, lcol] = lastMove;
  const markerOpacity = lrow === row && lcol === col ? 1.0 : 0.0;

  const onMouseEnter = () => {
    if (!disabled) {
      dispatch(hexagonSelected([row, col]));
    }
  };

  const onClick = () => {
    if (!disabled && !boardState[row][col]) {
      const move = [row, col];
      dispatch(moveMade(move));
      if (netplayActive && connected) {
        sendMove(move);
      }
    }
  };

  return (
    <g onMouseEnter={onMouseEnter} onClick={onClick}>
      <polygon className="Hexagon" points={points} transform={transform} />
      <circle
        r="0.6"
        transform={transform}
        fill={circleFill}
        opacity={circleOpacity}
      />
      <circle
        className="LastMoveMarker"
        r="0.3"
        transform={transform}
        opacity={markerOpacity}
      />
    </g>
  );
}

function Hexagons(props: HexagonsProps) {
  const { boardState, disabled } = props;
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const dispatch = useDispatch();

  const hexagons = [];
  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const key = `hexagon ${row} ${col}`;
      hexagons.push(
        <Hexagon
          key={key}
          boardState={boardState}
          row={row}
          col={col}
          disabled={disabled}
        />
      );
    }
  }

  const onMouseLeave = () => {
    dispatch(hexagonSelected([NaN, NaN]));
  };

  return <g onMouseLeave={onMouseLeave}>{hexagons}</g>;
}

function Borders() {
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const d = 0.5 * Math.sqrt(3);

  // TODO fix borders overlapping in top left and bottom right corners
  const topBorderPoints = [];
  const bottomBorderPoints = [];
  const leftBorderPoints = [];
  const rightBorderPoints = [];
  bottomBorderPoints.push(`${(boardSize - 0.5) * d},${1.5 * boardSize + 0.25}`);
  rightBorderPoints.push(`${(2 * boardSize - 0.5) * d},0.25`);
  for (let i = 0; i < boardSize; i += 1) {
    topBorderPoints.push(`${2 * i * d},0.5 ${(2 * i + 1) * d},0`);
    bottomBorderPoints.push(
      `${(2 * i + boardSize) * d},${1.5 * boardSize + 0.5} ${
        (2 * i + boardSize + 1) * d
      },${1.5 * boardSize}`
    );
    leftBorderPoints.push(
      `${i * d},${1.5 * i + 0.5} ${i * d},${1.5 * i + 1.5}`
    );
    rightBorderPoints.push(
      `${(i + 2 * boardSize) * d},${1.5 * i + 0.5} ${(i + 2 * boardSize) * d},${
        1.5 * i + 1.5
      }`
    );
  }
  topBorderPoints.push(`${(2 * boardSize - 0.5) * d},0.25`);
  leftBorderPoints.push(
    `${(boardSize - 0.5) * d},${1.5 * (boardSize - 1) + 1.75}`
  );

  return (
    <g className="Border">
      <polyline points={topBorderPoints.join(' ')} stroke="#000000" />
      <polyline points={leftBorderPoints.join(' ')} stroke="#ffffff" />
      <polyline points={rightBorderPoints.join(' ')} stroke="#ffffff" />
      <polyline points={bottomBorderPoints.join(' ')} stroke="#000000" />
    </g>
  );
}

function CoordinateLabels() {
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const d = 0.5 * Math.sqrt(3);

  const coordinateLabels = [];
  for (let i = 0; i < boardSize; i += 1) {
    const topLabelKey = `coordinateLabel ${COORDINATE_LETTERS[i]}`;
    const leftLabelKey = `coordinateLabel ${i}`;
    const leftLabelOffset = i + 1 < 10 ? 0.7 : 0.95;
    coordinateLabels.push(
      <text key={topLabelKey} x={2 * i * d} y={-0.05}>
        {COORDINATE_LETTERS[i]}
      </text>
    );
    coordinateLabels.push(
      <text key={leftLabelKey} x={i * d - leftLabelOffset} y={1.5 * i + 1.2}>
        {i + 1}
      </text>
    );
  }

  return <g className="CoordinateLabel">{coordinateLabels}</g>;
}

function ComponentMarker(props: ComponentMarkerProps) {
  const { component } = props;
  const d = 0.5 * Math.sqrt(3);
  const markers = [];
  for (let i = 0; i < component.length; i += 1) {
    const [row, col] = component[i];
    const translateX = (row + 1 + 2 * col) * d;
    const translateY = 1 + 1.5 * row;
    const transform = `translate(${translateX} ${translateY})`;
    const key = `pieceMarker ${row} ${col}`;
    markers.push(<circle key={key} r="0.2" transform={transform} />);
  }
  return <g className="PieceMarker">{markers}</g>;
}

function HexBoard(props: HexBoardProps) {
  const { boardState, winningComponent, disabled } = props;
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;

  const d = 0.5 * Math.sqrt(3);
  const margin = 1;
  const width = (3 * boardSize - 1) * d + 2 * margin;
  const height = 1.5 * boardSize + 0.5 + 2 * margin;
  const viewBox = `${-margin} ${-margin} ${width} ${height}`;

  return (
    <div>
      <svg className="HexBoard" viewBox={viewBox}>
        <Hexagons
          boardState={boardState}
          disabled={winningComponent.length > 0 || disabled}
        />
        <Borders />
        <CoordinateLabels />
        <ComponentMarker component={winningComponent} />
      </svg>
    </div>
  );
}

export default function HexGame() {
  const { active: netplayActive, connected, isBlack } = useSelector(
    selectNetplayState
  );
  const boardState = useSelector(selectBoardState);
  const { moveNumber, settings, swapPhaseComplete } = useSelector(
    selectGameState
  );
  const { useSwapRule } = settings;

  const winningComponent = getWinningConnectedComponent(boardState);

  let disabled = useSwapRule && !swapPhaseComplete && moveNumber === 1;
  // TODO make a better indicator
  let connectionIndicator = '';
  if (netplayActive) {
    if (
      (moveNumber % 2 === 0 && !isBlack) ||
      (moveNumber % 2 === 1 && isBlack)
    ) {
      disabled = true;
    }
    if (connected) {
      connectionIndicator = 'CONNECTED';
    } else {
      connectionIndicator = 'DISCONNECTED';
    }
  }

  return (
    <div>
      <Link to="/">Home</Link>
      <div>{connectionIndicator}</div>
      <SwapDialog />
      <HexBoard
        boardState={boardState}
        winningComponent={winningComponent}
        disabled={disabled}
      />
    </div>
  );
}
