import React from 'react';
import { useSelector } from 'react-redux';
import { selectHexGameState } from '../slices/hexGameSlice';

interface HexagonProps {
  translateX: number;
  translateY: number;
}

interface HexBoardProps {
  size: number;
  scale: number;
}

function Hexagon(props: HexagonProps) {
  const { translateX, translateY } = props;
  const transform = `translate(${translateX} ${translateY})`;
  const d = Math.sqrt(3) / 2;
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
  const { size, scale } = props;
  const transform = `scale(${scale})`;
  const hexagons = [];
  const xDelta = Math.sqrt(3);
  let xStart = 0;
  for (let row = 0; row < size; row += 1) {
    const translateY = 1.5 * row;
    for (let col = 0; col < size; col += 1) {
      const translateX = xStart + xDelta * col;
      hexagons.push(
        <Hexagon translateX={translateX} translateY={translateY} />
      );
    }
    xStart += xDelta / 2;
  }
  return (
    <div>
      {size}
      <svg viewBox="0 0 800 800" width={800} height={800}>
        <g transform={transform}>{hexagons}</g>
      </svg>
    </div>
  );
}

export default function HexGame() {
  const { settings } = useSelector(selectHexGameState);
  const { boardSize } = settings;
  return <HexBoard size={boardSize} scale={20} />;
}
