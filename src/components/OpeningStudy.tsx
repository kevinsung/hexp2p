import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import openingStudyData from '../data/opening-study.json';
import { BoardSizeSelector } from './HexSettings';
import OpeningStudyInfoButton from './OpeningStudyInfoButton';
import '../App.global.scss';

const COORDINATE_LETTERS = 'ABCDEFGHJKLMNOPQRST';
const D = 0.5 * Math.sqrt(3);
const BORDER_OFFSET = 0.125;
const INVERSE_GOLDEN_RATIO = 0.618033988749895;

interface CellData {
  x: number;
  y: number;
  winrate: number;
  raw_st_wr_error: number;
  policy: number | null;
}

function useIsPortraitViewport(): boolean {
  const [isPortrait, setIsPortrait] = useState(
    () => window.innerHeight > window.innerWidth,
  );
  useEffect(() => {
    const onResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isPortrait;
}

function winrateToFill(winrate: number): string {
  const v = Math.round(winrate * 255);
  return `rgb(${v},${v},${v})`;
}

type Point = [number, number];

function clipHalfPlane(
  poly: Point[],
  P: Point,
  n: Point,
  sign: number,
): Point[] {
  const side = (p: Point) =>
    sign * ((p[0] - P[0]) * n[0] + (p[1] - P[1]) * n[1]);
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const dCur = side(cur);
    const dPrev = side(prev);
    if (dPrev >= 0 !== dCur >= 0) {
      const t = dPrev / (dPrev - dCur);
      out.push([
        prev[0] + t * (cur[0] - prev[0]),
        prev[1] + t * (cur[1] - prev[1]),
      ]);
    }
    if (dCur >= 0) {
      out.push(cur);
    }
  }
  return out;
}

function pointsToString(points: Point[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function outwardNormal(p1: Point, p2: Point, center: Point): Point {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const length = Math.hypot(dx, dy);
  const candidate: Point = [-dy / length, dx / length];
  const midpoint: Point = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
  const towardCenter: Point = [
    center[0] - midpoint[0],
    center[1] - midpoint[1],
  ];
  const candidatePointsTowardCenter =
    candidate[0] * towardCenter[0] + candidate[1] * towardCenter[1] > 0;
  return candidatePointsTowardCenter
    ? [-candidate[0], -candidate[1]]
    : candidate;
}

function lineIntersection(p1: Point, d1: Point, p2: Point, d2: Point): Point {
  const denom = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / denom;
  return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
}

function offsetPolyline(
  points: Point[],
  distance: number,
  center: Point,
): Point[] {
  const edgeCount = points.length - 1;
  const normals: Point[] = [];
  for (let i = 0; i < edgeCount; i += 1) {
    normals.push(outwardNormal(points[i], points[i + 1], center));
  }
  const shift = (point: Point, normal: Point): Point => [
    point[0] + normal[0] * distance,
    point[1] + normal[1] * distance,
  ];

  const result: Point[] = [];
  for (let i = 0; i < points.length; i += 1) {
    if (i === 0) {
      result.push(shift(points[0], normals[0]));
    } else if (i === edgeCount) {
      result.push(shift(points[i], normals[i - 1]));
    } else {
      const dPrev: Point = [
        points[i][0] - points[i - 1][0],
        points[i][1] - points[i - 1][1],
      ];
      const dNext: Point = [
        points[i + 1][0] - points[i][0],
        points[i + 1][1] - points[i][1],
      ];
      const cross = dPrev[0] * dNext[1] - dPrev[1] * dNext[0];
      if (Math.abs(cross) < 1e-9) {
        result.push(shift(points[i], normals[i - 1]));
      } else {
        result.push(
          lineIntersection(
            shift(points[i - 1], normals[i - 1]),
            dPrev,
            shift(points[i], normals[i]),
            dNext,
          ),
        );
      }
    }
  }
  return result;
}

function pointsClose(p1: Point, p2: Point): boolean {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) < 1e-9;
}

function cornerIntersection(
  edgeA: [Point, Point],
  edgeB: [Point, Point],
  distance: number,
  center: Point,
): Point {
  const nA = outwardNormal(edgeA[0], edgeA[1], center);
  const nB = outwardNormal(edgeB[0], edgeB[1], center);
  const dA: Point = [edgeA[1][0] - edgeA[0][0], edgeA[1][1] - edgeA[0][1]];
  const dB: Point = [edgeB[1][0] - edgeB[0][0], edgeB[1][1] - edgeB[0][1]];
  const cross = dA[0] * dB[1] - dA[1] * dB[0];
  if (Math.abs(cross) < 1e-9) {
    const shared =
      pointsClose(edgeA[0], edgeB[0]) || pointsClose(edgeA[0], edgeB[1])
        ? edgeA[0]
        : edgeA[1];
    return [shared[0] + nA[0] * distance, shared[1] + nA[1] * distance];
  }
  const pA: Point = [
    edgeA[0][0] + nA[0] * distance,
    edgeA[0][1] + nA[1] * distance,
  ];
  const pB: Point = [
    edgeB[0][0] + nB[0] * distance,
    edgeB[0][1] + nB[1] * distance,
  ];
  return lineIntersection(pA, dA, pB, dB);
}

interface StudyBoardProps {
  boardSize: number;
  cells: CellData[];
  hoveredCell: CellData | null;
  onCellEnter: (cell: CellData, x: number, y: number) => void;
  onBoardLeave: () => void;
}

function StudyBoard({
  boardSize,
  cells,
  hoveredCell,
  onCellEnter,
  onBoardLeave,
}: StudyBoardProps) {
  const rotated = useIsPortraitViewport();

  const cellMap = new Map<string, CellData>();
  for (const cell of cells) {
    cellMap.set(`${cell.y},${cell.x}`, cell);
  }

  const margin = 1;
  const contentWidth = (3 * boardSize - 1) * D;
  const contentHeight = 1.5 * boardSize + 0.5;
  const width = (rotated ? contentHeight : contentWidth) + 2 * margin;
  const height = (rotated ? contentWidth : contentHeight) + 2 * margin;
  const viewBox = `${-margin} ${-margin} ${width} ${height}`;
  const gridTransform = rotated
    ? `matrix(0,-1,1,0,0,${contentWidth})`
    : undefined;

  const s = INVERSE_GOLDEN_RATIO;
  const s2 = INVERSE_GOLDEN_RATIO ** 2;
  const s3 = INVERSE_GOLDEN_RATIO ** 3;
  const hexPoints = `0,1 ${D},0.5 ${D},-0.5 0,-1 ${-D},-0.5 ${-D},0.5`;
  const markerPoints = `0,${s} ${D * s},${0.5 * s} ${D * s},${-0.5 * s} 0,${-s} ${-D * s},${-0.5 * s} ${-D * s},${0.5 * s}`;
  const outerMarkerPoints = `0,${s3} ${D * s3},${0.5 * s3} ${D * s3},${-0.5 * s3} 0,${-s3} ${-D * s3},${-0.5 * s3} ${-D * s3},${0.5 * s3}`;
  const innerMarkerPoints = `0,${s2} ${D * s2},${0.5 * s2} ${D * s2},${-0.5 * s2} 0,${-s2} ${-D * s2},${-0.5 * s2} ${-D * s2},${0.5 * s2}`;

  const hexagons = [];
  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const cell = cellMap.get(`${row},${col}`);
      if (!cell) continue;
      const tx = (row + 1 + 2 * col) * D;
      const ty = 1 + 1.5 * row;
      const transform = `translate(${tx} ${ty})`;
      const fill = winrateToFill(cell.winrate);
      const isHovered =
        hoveredCell !== null &&
        hoveredCell.x === cell.x &&
        hoveredCell.y === cell.y;
      hexagons.push(
        <g
          key={`${row},${col}`}
          onMouseEnter={(e) => onCellEnter(cell, e.clientX, e.clientY)}
        >
          <polygon
            points={hexPoints}
            transform={transform}
            fill={fill}
            stroke="#404040"
            strokeWidth={0.05}
          />
          {cell.winrate >= 0.3 && cell.winrate <= 0.7 && (
            <polygon
              points={outerMarkerPoints}
              transform={transform}
              fill="#99ddff"
              stroke="none"
            />
          )}
          {cell.winrate >= 0.4 && cell.winrate <= 0.6 && (
            <polygon
              points={innerMarkerPoints}
              transform={transform}
              fill="#99ddff"
              stroke="none"
            />
          )}
          {isHovered && (
            <polygon
              points={markerPoints}
              transform={transform}
              fill="none"
              stroke="#99ddff"
              strokeWidth={0.08}
            />
          )}
        </g>,
      );
    }
  }

  // Border geometry (matches HexGame.tsx Borders component)
  const topBorderPoints: Point[] = [];
  const bottomBorderPoints: Point[] = [];
  const leftBorderPoints: Point[] = [];
  const rightBorderPoints: Point[] = [];
  bottomBorderPoints.push([(boardSize - 0.5) * D, 1.5 * boardSize + 0.25]);
  rightBorderPoints.push([(2 * boardSize - 0.5) * D, 0.25]);
  for (let i = 0; i < boardSize; i += 1) {
    topBorderPoints.push([2 * i * D, 0.5], [(2 * i + 1) * D, 0]);
    bottomBorderPoints.push(
      [(2 * i + boardSize) * D, 1.5 * boardSize + 0.5],
      [(2 * i + boardSize + 1) * D, 1.5 * boardSize],
    );
    leftBorderPoints.push([i * D, 1.5 * i + 0.5], [i * D, 1.5 * i + 1.5]);
    rightBorderPoints.push(
      [(i + 2 * boardSize) * D, 1.5 * i + 0.5],
      [(i + 2 * boardSize) * D, 1.5 * i + 1.5],
    );
  }
  topBorderPoints.push([(2 * boardSize - 0.5) * D, 0.25]);
  leftBorderPoints.push([(boardSize - 0.5) * D, 1.5 * (boardSize - 1) + 1.75]);

  const boardCenter: Point = [
    ((3 * boardSize - 1) * D) / 2,
    (1.5 * boardSize + 0.5) / 2,
  ];

  const topLeft = cornerIntersection(
    [topBorderPoints[0], topBorderPoints[1]],
    [leftBorderPoints[0], leftBorderPoints[1]],
    BORDER_OFFSET,
    boardCenter,
  );
  const topRight = cornerIntersection(
    [
      topBorderPoints[topBorderPoints.length - 2],
      topBorderPoints[topBorderPoints.length - 1],
    ],
    [rightBorderPoints[0], rightBorderPoints[1]],
    BORDER_OFFSET,
    boardCenter,
  );
  const bottomLeft = cornerIntersection(
    [
      leftBorderPoints[leftBorderPoints.length - 2],
      leftBorderPoints[leftBorderPoints.length - 1],
    ],
    [bottomBorderPoints[0], bottomBorderPoints[1]],
    BORDER_OFFSET,
    boardCenter,
  );
  const bottomRight = cornerIntersection(
    [
      rightBorderPoints[rightBorderPoints.length - 2],
      rightBorderPoints[rightBorderPoints.length - 1],
    ],
    [
      bottomBorderPoints[bottomBorderPoints.length - 2],
      bottomBorderPoints[bottomBorderPoints.length - 1],
    ],
    BORDER_OFFSET,
    boardCenter,
  );
  const nTopLeft: Point = [0.5, -D];
  const nTopRight: Point = [-D, -0.5];
  const nBottomLeft: Point = [D, 0.5];
  const nBottomRight: Point = [-0.5, D];

  const offsetTopBorderPoints = offsetPolyline(
    topBorderPoints,
    BORDER_OFFSET,
    boardCenter,
  );
  offsetTopBorderPoints[0] = topLeft;
  offsetTopBorderPoints[offsetTopBorderPoints.length - 1] = topRight;

  const offsetBottomBorderPoints = offsetPolyline(
    bottomBorderPoints,
    BORDER_OFFSET,
    boardCenter,
  );
  offsetBottomBorderPoints[0] = bottomLeft;
  offsetBottomBorderPoints[offsetBottomBorderPoints.length - 1] = bottomRight;

  const offsetLeftBorderPoints = offsetPolyline(
    leftBorderPoints,
    BORDER_OFFSET,
    boardCenter,
  );
  offsetLeftBorderPoints[0] = topLeft;
  offsetLeftBorderPoints[offsetLeftBorderPoints.length - 1] = bottomLeft;

  const offsetRightBorderPoints = offsetPolyline(
    rightBorderPoints,
    BORDER_OFFSET,
    boardCenter,
  );
  offsetRightBorderPoints[0] = topRight;
  offsetRightBorderPoints[offsetRightBorderPoints.length - 1] = bottomRight;

  const bboxMargin = 10;
  const boundingBox: Point[] = [
    [-bboxMargin, -bboxMargin],
    [(3 * boardSize - 1) * D + bboxMargin, -bboxMargin],
    [(3 * boardSize - 1) * D + bboxMargin, 1.5 * boardSize + 0.5 + bboxMargin],
    [-bboxMargin, 1.5 * boardSize + 0.5 + bboxMargin],
  ];

  const clipBorder = (
    corner1: Point,
    n1: Point,
    corner2: Point,
    n2: Point,
    sign: number,
  ) =>
    pointsToString(
      clipHalfPlane(
        clipHalfPlane(boundingBox, corner1, n1, sign),
        corner2,
        n2,
        sign,
      ),
    );

  const topClip = clipBorder(topLeft, nTopLeft, topRight, nTopRight, 1);
  const bottomClip = clipBorder(
    bottomLeft,
    nBottomLeft,
    bottomRight,
    nBottomRight,
    1,
  );
  const leftClip = clipBorder(topLeft, nTopLeft, bottomLeft, nBottomLeft, -1);
  const rightClip = clipBorder(
    topRight,
    nTopRight,
    bottomRight,
    nBottomRight,
    -1,
  );

  // Coordinate labels (mirrors CoordinateLabels in HexGame.tsx)
  const coordLabels = [];
  for (let i = 0; i < boardSize; i += 1) {
    const colX = 2 * i * D;
    const colY = -0.05;
    const rowPosition = 1.5 * i + 1;
    const rowPerp = i * D;
    const rowBaselineNudge = 0.2;
    const leftLabelOffset = i + 1 < 10 ? 0.7 : 0.95;
    const rowX = rowPerp - leftLabelOffset;
    const rowY = rowPosition + rowBaselineNudge;
    const [colLabelX, colLabelY] = rotated
      ? [colY, contentWidth - colX]
      : [colX, colY];
    const [rowLabelX, rowLabelY] = rotated
      ? [rowPosition, contentWidth - rowPerp + 0.7]
      : [rowX, rowY];

    coordLabels.push(
      <text
        key={`col-${i}`}
        x={colLabelX}
        y={colLabelY}
        textAnchor={rotated ? 'end' : undefined}
        dominantBaseline={rotated ? 'central' : undefined}
      >
        {COORDINATE_LETTERS[i]}
      </text>,
      <text
        key={`row-${i}`}
        x={rowLabelX}
        y={rowLabelY}
        textAnchor={rotated ? 'middle' : undefined}
      >
        {i + 1}
      </text>,
    );
  }

  return (
    <div className="HexBoardContainer">
      <svg className="HexBoard" viewBox={viewBox}>
        <g transform={gridTransform}>
          <g onMouseLeave={onBoardLeave}>{hexagons}</g>
          <g className="Border">
            <defs>
              <clipPath id="studyBorderClipTop">
                <polygon points={topClip} />
              </clipPath>
              <clipPath id="studyBorderClipBottom">
                <polygon points={bottomClip} />
              </clipPath>
              <clipPath id="studyBorderClipLeft">
                <polygon points={leftClip} />
              </clipPath>
              <clipPath id="studyBorderClipRight">
                <polygon points={rightClip} />
              </clipPath>
            </defs>
            <polyline
              points={pointsToString(offsetLeftBorderPoints)}
              stroke="white"
              clipPath="url(#studyBorderClipLeft)"
            />
            <polyline
              points={pointsToString(offsetRightBorderPoints)}
              stroke="white"
              clipPath="url(#studyBorderClipRight)"
            />
            <polyline
              points={pointsToString(offsetTopBorderPoints)}
              stroke="black"
              clipPath="url(#studyBorderClipTop)"
            />
            <polyline
              points={pointsToString(offsetBottomBorderPoints)}
              stroke="black"
              clipPath="url(#studyBorderClipBottom)"
            />
          </g>
        </g>
        <g className="CoordinateLabel">{coordLabels}</g>
      </svg>
    </div>
  );
}

export default function OpeningStudy() {
  const [boardSize, setBoardSize] = useState(13);
  const [hoveredCell, setHoveredCell] = useState<CellData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const cells =
    (openingStudyData.sizes[
      boardSize.toString() as keyof typeof openingStudyData.sizes
    ] as CellData[] | undefined) ?? [];

  const handleSizeChange = (size: number) => {
    setBoardSize(size);
    setHoveredCell(null);
    setTooltipPos(null);
  };

  const handleCellEnter = (cell: CellData, x: number, y: number) => {
    setHoveredCell(cell);
    setTooltipPos({ x, y });
  };

  return (
    <div className="OpeningStudy">
      <div className="HexGameTopPanel">
        <div className="TopPanelButtons">
          <Link to="/" tabIndex={-1}>
            <button type="button">Home</button>
          </Link>
          <OpeningStudyInfoButton visits={openingStudyData.visits} />
        </div>
      </div>
      <StudyBoard
        boardSize={boardSize}
        cells={cells}
        hoveredCell={hoveredCell}
        onCellEnter={handleCellEnter}
        onBoardLeave={() => {
          setHoveredCell(null);
          setTooltipPos(null);
        }}
      />
      {hoveredCell && tooltipPos && (
        <div
          className="OpeningStudyTooltip"
          style={{
            left: tooltipPos.x + 16,
            top: tooltipPos.y - 8,
            transform: 'translateY(-100%)',
          }}
        >
          <div>
            <strong>
              {(
                COORDINATE_LETTERS[hoveredCell.x] +
                (hoveredCell.y + 1)
              ).toUpperCase()}
            </strong>
          </div>
          <div>Win rate: {(hoveredCell.winrate * 100).toFixed(1)}%</div>
          <div>
            Policy:{' '}
            {hoveredCell.policy !== null
              ? `${(hoveredCell.policy * 100).toFixed(2)}%`
              : 'N/A'}
          </div>
        </div>
      )}
      <BoardSizeSelector size={boardSize} setBoardSize={handleSizeChange} />
    </div>
  );
}
