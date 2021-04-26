import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  hexGameStateUpdated,
  selectHexGameState,
} from '../slices/hexGameSlice';
import getWinningConnectedComponent from '../slices/getWinningConnectedComponent';
import { HexagonState } from '../types';
import '../App.global.css';

const COORDINATE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface WinningComponentMarkerProps {
  row: number;
  col: number;
}

interface HexagonProps {
  row: number;
  col: number;
}

interface HexBoardProps {
  size: number;
  winningComponent: Array<Array<number>>;
}

function WinningComponentMarker(props: WinningComponentMarkerProps) {
  const { row, col } = props;
  const d = 0.5 * Math.sqrt(3);
  const translateX = (row + 1 + 2 * col) * d;
  const translateY = 1 + 1.5 * row;
  const transform = `translate(${translateX} ${translateY})`;
  return <circle r="0.2" transform={transform} />;
}

function Hexagon(props: HexagonProps) {
  // TODO just use row and col, no need for translateX and translateY
  const { row, col } = props;
  const dispatch = useDispatch();
  const { boardState, isBlackTurn, selectedHexagon } = useSelector(
    selectHexGameState
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
      <polygon className="Hexagon" points={points} transform={transform} />
      <circle
        r="0.6"
        transform={transform}
        fill={circleFill}
        opacity={circleOpacity}
      />
    </g>
  );
}

function HexBoard(props: HexBoardProps) {
  const { size, winningComponent } = props;
  const dispatch = useDispatch();
  const d = 0.5 * Math.sqrt(3);

  const margin = 1;
  const width = (3 * size - 1) * d + 2 * margin;
  const height = 1.5 * size + 0.5 + 2 * margin;
  const viewBox = `${-margin} ${-margin} ${width} ${height}`;

  const hexagons = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const key = `hexagon ${row} ${col}`;
      hexagons.push(<Hexagon key={key} row={row} col={col} />);
    }
  }

  // TODO fix borders overlapping in top left and bottom right corners
  const topBorderPoints = [];
  const bottomBorderPoints = [];
  const leftBorderPoints = [];
  const rightBorderPoints = [];
  const coordinateLabels = [];
  bottomBorderPoints.push(`${(size - 0.5) * d},${1.5 * size + 0.25}`);
  rightBorderPoints.push(`${(2 * size - 0.5) * d},0.25`);
  for (let i = 0; i < size; i += 1) {
    topBorderPoints.push(`${2 * i * d},0.5 ${(2 * i + 1) * d},0`);
    bottomBorderPoints.push(
      `${(2 * i + size) * d},${1.5 * size + 0.5} ${(2 * i + size + 1) * d},${
        1.5 * size
      }`
    );
    leftBorderPoints.push(
      `${i * d},${1.5 * i + 0.5} ${i * d},${1.5 * i + 1.5}`
    );
    rightBorderPoints.push(
      `${(i + 2 * size) * d},${1.5 * i + 0.5} ${(i + 2 * size) * d},${
        1.5 * i + 1.5
      }`
    );

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
  topBorderPoints.push(`${(2 * size - 0.5) * d},0.25`);
  leftBorderPoints.push(`${(size - 0.5) * d},${1.5 * (size - 1) + 1.75}`);

  const winningComponentMarkers = [];
  for (let i = 0; i < winningComponent.length; i += 1) {
    const [row, col] = winningComponent[i];
    winningComponentMarkers.push(
      <WinningComponentMarker row={row} col={col} />
    );
  }

  const onMouseLeave = () => {
    dispatch(hexGameStateUpdated({ selectedHexagon: [NaN, NaN] }));
  };

  return (
    <div>
      <svg className="HexBoard" viewBox={viewBox}>
        <g onMouseLeave={onMouseLeave}>{hexagons}</g>
        <g className="Border">
          <polyline points={topBorderPoints.join(' ')} stroke="#000000" />
          <polyline points={leftBorderPoints.join(' ')} stroke="#ffffff" />
          <polyline points={rightBorderPoints.join(' ')} stroke="#ffffff" />
          <polyline points={bottomBorderPoints.join(' ')} stroke="#000000" />
        </g>
        <g className="CoordinateLabel">{coordinateLabels}</g>
        <g className="WinningComponentMarker">{winningComponentMarkers}</g>
      </svg>
    </div>
  );
}

export default function HexGame() {
  const { settings, boardState } = useSelector(selectHexGameState);
  const { boardSize } = settings;
  const winningComponent = getWinningConnectedComponent(boardState);
  return (
    <div>
      <Link to="/">Home</Link>
      <HexBoard size={boardSize} winningComponent={winningComponent} />
    </div>
  );
}
