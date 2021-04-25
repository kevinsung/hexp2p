import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  hexGameStateUpdated,
  selectHexGameState,
} from '../slices/hexGameSlice';
import { HexagonState } from '../types';

const BORDER_STROKE_WIDTH = 0.1;

interface HexagonProps {
  translateX: number;
  translateY: number;
  row: number;
  col: number;
}

interface HexBoardProps {
  size: number;
}

function Hexagon(props: HexagonProps) {
  const { row, col, translateX, translateY } = props;
  const dispatch = useDispatch();
  const { boardState, isBlackTurn, selectedHexagon } = useSelector(
    selectHexGameState
  );
  const [selectedRow, selectedCol] = selectedHexagon;
  const transform = `translate(${translateX} ${translateY})`;
  const d = 0.5 * Math.sqrt(3);
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
        circleFill = isBlackTurn ? '#000000' : '#ffffff';
        circleOpacity = 0.5;
      }
      break;
    // no default
  }

  const onMouseEnter = () => {
    dispatch(hexGameStateUpdated({ selectedHexagon: [row, col] }));
  };

  const onClick = () => {
    if (!boardState[row][col]) {
      const boardStateCopy = boardState.map((a) => a.slice());
      boardStateCopy[row][col] = isBlackTurn
        ? HexagonState.BLACK
        : HexagonState.WHITE;
      dispatch(
        hexGameStateUpdated({
          boardState: boardStateCopy,
          isBlackTurn: !isBlackTurn,
        })
      );
    }
  };

  return (
    <g onMouseEnter={onMouseEnter} onClick={onClick}>
      <polygon
        points={points}
        transform={transform}
        fill="#808080"
        stroke="#404040"
        strokeWidth="0.05"
      />
      <circle
        r="0.64"
        transform={transform}
        fill={circleFill}
        opacity={circleOpacity}
      />
    </g>
  );
}

function HexBoard(props: HexBoardProps) {
  const { size } = props;
  const dispatch = useDispatch();
  const sqrt3 = Math.sqrt(3);
  // TODO add margin for borders
  // TODO add coordinate labels
  const width = (3 * size - 1) * 0.5 * sqrt3;
  const height = 1.5 * size + 0.5;
  const viewBox = `0 0 ${width} ${height}`;
  const yStart = 1;
  let xStart = 0.5 * sqrt3;
  const hexagons = [];
  for (let row = 0; row < size; row += 1) {
    const translateY = yStart + 1.5 * row;
    for (let col = 0; col < size; col += 1) {
      const translateX = xStart + sqrt3 * col;
      const key = `hexagon ${row} ${col}`;
      hexagons.push(
        <Hexagon
          key={key}
          row={row}
          col={col}
          translateX={translateX}
          translateY={translateY}
        />
      );
    }
    xStart += 0.5 * sqrt3;
  }
  const topBorderPoints = [];
  const bottomBorderPoints = [];
  const leftBorderPoints = [];
  const rightBorderPoints = [];
  // TODO make this more readable
  bottomBorderPoints.push(
    `${(size * 0.5 - 0.25) * sqrt3},${1.5 * size + 0.25}`
  );
  rightBorderPoints.push(`${(size - 0.25) * sqrt3},0.25`);
  for (let i = 0; i < size; i += 1) {
    topBorderPoints.push(`${i * sqrt3},0.5 ${(i + 0.5) * sqrt3},0`);
    bottomBorderPoints.push(
      `${(i + size * 0.5) * sqrt3},${1.5 * size + 0.5} ${
        (i + 0.5 + size * 0.5) * sqrt3
      },${1.5 * size}`
    );
    leftBorderPoints.push(
      `${i * 0.5 * sqrt3},${1.5 * i + 0.5} ${i * 0.5 * sqrt3},${1.5 * i + 1.5}`
    );
    rightBorderPoints.push(
      `${(i * 0.5 + size) * sqrt3},${1.5 * i + 0.5} ${
        (i * 0.5 + size) * sqrt3
      },${1.5 * i + 1.5}`
    );
  }
  topBorderPoints.push(`${(size - 0.25) * sqrt3},0.25`);
  leftBorderPoints.push(
    `${(size * 0.5 - 0.25) * sqrt3},${1.5 * (size - 1) + 1.75}`
  );

  const onMouseLeave = () => {
    dispatch(hexGameStateUpdated({ selectedHexagon: [NaN, NaN] }));
  };

  return (
    <div>
      <svg className="HexBoard" viewBox={viewBox}>
        <g onMouseLeave={onMouseLeave}>{hexagons}</g>
        <polyline
          points={topBorderPoints.join(' ')}
          fill="none"
          stroke="#000000"
          strokeWidth={BORDER_STROKE_WIDTH}
        />
        <polyline
          points={bottomBorderPoints.join(' ')}
          fill="none"
          stroke="#000000"
          strokeWidth={BORDER_STROKE_WIDTH}
        />
        <polyline
          points={leftBorderPoints.join(' ')}
          fill="none"
          stroke="#ffffff"
          strokeWidth={BORDER_STROKE_WIDTH}
        />
        <polyline
          points={rightBorderPoints.join(' ')}
          fill="none"
          stroke="#ffffff"
          strokeWidth={BORDER_STROKE_WIDTH}
        />
      </svg>
    </div>
  );
}

export default function HexGame() {
  const { settings } = useSelector(selectHexGameState);
  const { boardSize } = settings;
  return (
    <div>
      <HexBoard size={boardSize} />
    </div>
  );
}
