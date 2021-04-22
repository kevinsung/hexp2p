import React from 'react';

interface HexagonProps {
  translateX: number;
  translateY: number;
  scale: number;
}

function Hexagon(props: HexagonProps) {
  const { translateX, translateY, scale } = props;
  const transform = `translate(${translateX} ${translateY}) scale(${scale})`;
  return (
    <polygon
      points="0,1 0.8660254,0.5 0.8660254,-0.5 0,-1 -0.8660254,-0.5 -0.8660254,0.5"
      transform={transform}
    />
  );
}

export default function HexGame() {
  return (
    <div>
      <svg viewBox="0 0 100 100" width={100} height={100}>
        <Hexagon translateX={20} translateY={20} scale={20} />
      </svg>
    </div>
  );
}
