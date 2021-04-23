import React from 'react';
import { useSelector } from 'react-redux';
import { selectHexGameState } from '../slices/hexGameSlice';

interface HexagonProps {
  translateX: number;
  translateY: number;
}

interface HexBoardProps {
  size: number;
}

function Hexagon(props: HexagonProps) {
  const { translateX, translateY } = props;
  const transform = `translate(${translateX} ${translateY})`;
  const d = 0.5 * Math.sqrt(3);
  const points = `0,1 ${d},0.5 ${d},-0.5 0,-1 ${-d},-0.5 ${-d},0.5`;
  return (
    <polygon
      points={points}
      transform={transform}
      fill="#808080"
      stroke="#404040"
      strokeWidth="0.05"
    />
  );
}

function HexBoard(props: HexBoardProps) {
  const { size } = props;

  const sqrt3 = Math.sqrt(3);
  // TODO add margin for borders
  // TODO add colored borders
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
      hexagons.push(
        <Hexagon translateX={translateX} translateY={translateY} />
      );
    }
    xStart += 0.5 * sqrt3;
  }
  return (
    <div>
      <svg className="HexBoard" viewBox={viewBox}>
        <g>{hexagons}</g>
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
