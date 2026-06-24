// Copyright (C) 2021 Kevin J. Sung
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import React, { useCallback, useEffect, useState } from 'react';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  hexagonSelected,
  moveMade,
  navigateMoveHistory,
  playerResigned,
  selectBoardState,
  selectGameState,
  selectIsBlackTurn,
  swapChosen,
  undoMove,
} from '../slices/gameSlice';
import {
  sendMove,
  sendSwap,
  sendRequestUndo,
  sendAcceptUndo,
  sendResign,
} from '../netplayClient';
import {
  deactivateNetplay,
  selectNetplayState,
  undoRequestFulfilled,
  undoRequestSent,
} from '../slices/netplaySlice';
import getWinningConnectedComponent from '../slices/getWinningConnectedComponent';
import { HexagonState } from '../types';
import RulesButton from './RulesModal';
import Modal from './Modal';
import HexSettings from './HexSettings';
import '../App.global.scss';

type Move = [number, number];

interface HexagonProps {
  boardState: Array<Array<number>>;
  row: number;
  col: number;
  disabled: boolean;
  confirmMoves: boolean;
  pendingMove: Move | null;
  onRequestMove: (move: Move) => void;
  onCommitMove: (move: Move) => void;
  pendingSwap: boolean;
  onRequestSwap: () => void;
  onCommitSwap: () => void;
}

interface HexagonsProps {
  boardState: Array<Array<number>>;
  disabled: boolean;
  confirmMoves: boolean;
  pendingMove: Move | null;
  onRequestMove: (move: Move) => void;
  onCommitMove: (move: Move) => void;
  pendingSwap: boolean;
  onRequestSwap: () => void;
  onCommitSwap: () => void;
}

interface HexBoardProps {
  boardState: Array<Array<number>>;
  winningComponent: Array<Array<number>>;
  disabled: boolean;
  confirmMoves: boolean;
  pendingMove: Move | null;
  onRequestMove: (move: Move) => void;
  onCommitMove: (move: Move) => void;
  pendingSwap: boolean;
  onRequestSwap: () => void;
  onCommitSwap: () => void;
}

interface ComponentMarkerProps {
  component: Array<Array<number>>;
}

interface CoordinateLabelsProps {
  rotated: boolean;
}

interface WinnerAnnouncementProps {
  boardState: Array<Array<number>>;
  winningComponent: Array<Array<number>>;
}

interface TurnIndicatorProps {
  gameOver: boolean;
}

interface UndoButtonProps {
  disabled: boolean;
}

interface ResignButtonProps {
  disabled: boolean;
}

interface ConfirmMoveDialogProps {
  pendingMove: Move | null;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmSwapDialogProps {
  pendingSwap: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmMoveToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const COORDINATE_LETTERS = 'ABCDEFGHJKLMNOPQRST';
const INVERSE_GOLDEN_RATIO = 0.618033988749895;
// Half the border stroke-width (.Border, 0.2) plus half the hexagon
// stroke-width (.Hexagon, 0.05): pushes the border outward so its inner
// edge lands exactly where the hexagon's own gray stroke ends, leaving
// hexagon edges fully visible with no overlap.
const BORDER_OFFSET = 0.125;

// Determines whether a keydown event should be treated as a hotkey: ignores
// the event if a modifier key is held or the user is typing into a form field.
function isHotkeyEvent(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }
  const { target } = event;
  if (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  ) {
    return false;
  }
  return true;
}

// Tracks whether the viewport is taller than it is wide, so the board can be
// rotated 90 degrees to make better use of the available space.
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

// Commits a move: handles the swap-phase bookkeeping and netplay messaging
// that apply regardless of whether the move was made directly or via the
// confirm-move dialog.
function useCommitMove(): (move: Move) => void {
  const dispatch = useDispatch();
  const { active: netplayActive } = useSelector(selectNetplayState);
  const { moveNumber, settings, swapPhaseComplete } =
    useSelector(selectGameState);
  const { useSwapRule } = settings;
  const swapPhaseActive = useSwapRule && !swapPhaseComplete && moveNumber === 1;

  return useCallback(
    (move: Move) => {
      if (swapPhaseActive) {
        dispatch(swapChosen(false));
        if (netplayActive) {
          sendSwap(false);
        }
      }
      dispatch(moveMade(move));
      if (netplayActive) {
        sendMove(move);
        dispatch(undoRequestFulfilled());
      }
    },
    [dispatch, netplayActive, swapPhaseActive],
  );
}

// Commits a swap: handles the netplay messaging that applies regardless of
// whether the swap was made directly or via the confirm-move dialog.
function useCommitSwap(): () => void {
  const dispatch = useDispatch();
  const { active: netplayActive } = useSelector(selectNetplayState);

  return useCallback(() => {
    dispatch(swapChosen(true));
    if (netplayActive) {
      sendSwap(true);
      dispatch(undoRequestFulfilled());
    }
  }, [dispatch, netplayActive]);
}

function NewGameButton() {
  const { active: netplayActive, hosting } = useSelector(selectNetplayState);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (netplayActive && !hosting) {
    return null;
  }

  return (
    <>
      <button type="button" onClick={() => setSettingsOpen(true)}>
        New game
      </button>
      {settingsOpen && (
        <Modal title="Settings" onClose={() => setSettingsOpen(false)}>
          <HexSettings
            onStartHosting={() => setSettingsOpen(false)}
            onSubmitted={() => setSettingsOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

function WinnerAnnouncement(props: WinnerAnnouncementProps) {
  const { boardState, winningComponent } = props;
  const { resignationState } = useSelector(selectGameState);
  const [dismissed, setDismissed] = useState(false);

  const message = (() => {
    if (resignationState === HexagonState.BLACK) {
      return 'Black resigned, White wins';
    }
    if (resignationState === HexagonState.WHITE) {
      return 'White resigned, Black wins';
    }
    if (!winningComponent.length) {
      return null;
    }
    const [row, col] = winningComponent[0];
    switch (boardState[row][col]) {
      case HexagonState.BLACK:
        return 'Black wins';
      case HexagonState.WHITE:
        return 'White wins';
      default:
        return null;
    }
  })();

  useEffect(() => {
    setDismissed(false);
  }, [message]);

  if (dismissed || !message) {
    return null;
  }

  return (
    <Modal title="Game over" onClose={() => setDismissed(true)}>
      <p>{message}</p>
    </Modal>
  );
}

function UndoDialog() {
  const dispatch = useDispatch();
  const { undoRequestSent: undoRequested, undoRequestReceived } =
    useSelector(selectNetplayState);
  const { moveHistory } = useSelector(selectGameState);
  const [dismissed, setDismissed] = useState(false);

  const handleClick = useCallback(() => {
    dispatch(undoRequestFulfilled());
    // Re-check that our state hasn't moved on since the request arrived (e.g.
    // we made our own move while the dialog was showing) before accepting.
    if (undoRequestReceived === moveHistory.length) {
      sendAcceptUndo(undoRequestReceived);
      dispatch(undoMove());
    }
  }, [dispatch, undoRequestReceived, moveHistory.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isHotkeyEvent(event) || !undoRequestReceived) {
        return;
      }
      if (event.key.toLowerCase() === 'a') {
        event.preventDefault();
        handleClick();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoRequestReceived, handleClick]);

  useEffect(() => {
    setDismissed(false);
  }, [undoRequested, undoRequestReceived]);

  if (dismissed) {
    return null;
  }

  if (undoRequested) {
    return (
      <Modal title="Undo request" onClose={() => setDismissed(true)}>
        <p>Undo request sent</p>
      </Modal>
    );
  }

  if (undoRequestReceived) {
    return (
      <Modal title="Undo request" onClose={() => setDismissed(true)}>
        <p>Opponent requested undo</p>
        <div className="ResignDialogActions">
          <button type="button" onClick={handleClick}>
            Accept (A)
          </button>
        </div>
      </Modal>
    );
  }

  return null;
}

function Hexagon(props: HexagonProps) {
  const {
    boardState,
    row,
    col,
    disabled,
    confirmMoves,
    pendingMove,
    onRequestMove,
    onCommitMove,
    pendingSwap,
    onRequestSwap,
    onCommitSwap,
  } = props;
  const dispatch = useDispatch();
  const {
    moveHistory,
    moveNumber,
    selectedHexagon,
    settings,
    swapPhaseComplete,
  } = useSelector(selectGameState);
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const [selectedRow, selectedCol] = selectedHexagon;
  const { useSwapRule } = settings;

  const d = 0.5 * Math.sqrt(3);
  const translateX = (row + 1 + 2 * col) * d;
  const translateY = 1 + 1.5 * row;
  const transform = `translate(${translateX} ${translateY})`;
  const points = `0,1 ${d},0.5 ${d},-0.5 0,-1 ${-d},-0.5 ${-d},0.5`;
  const markerScale = INVERSE_GOLDEN_RATIO;
  const markerPoints = `0,${markerScale} ${d * markerScale},${0.5 * markerScale} ${d * markerScale},${-0.5 * markerScale} 0,${-markerScale} ${-d * markerScale},${-0.5 * markerScale} ${-d * markerScale},${0.5 * markerScale}`;

  const lastMove = moveNumber > 0 ? moveHistory[moveNumber - 1] : [NaN, NaN];
  const [lrow, lcol] = lastMove;
  const markerInvisible = lrow !== row || lcol !== col;

  const swapPhaseActive = useSwapRule && !swapPhaseComplete && moveNumber === 1;
  const isSwappablePiece = !disabled && swapPhaseActive && !markerInvisible;
  const isHovered = row === selectedRow && col === selectedCol;
  const isPending = Boolean(
    pendingMove && row === pendingMove[0] && col === pendingMove[1],
  );

  // hexagon fill properties
  let hexBlack;
  let hexGray = false;
  let hexPartialOpacity = false;
  switch (boardState[row][col]) {
    case HexagonState.BLACK:
      hexBlack = true;
      break;
    case HexagonState.WHITE:
      hexBlack = false;
      break;
    case HexagonState.EMPTY:
      if (isHovered || isPending) {
        hexBlack = isBlackTurn;
        hexPartialOpacity = !isPending;
      } else {
        hexGray = true;
      }
      break;
    // no default
  }

  const isPendingSwap = isSwappablePiece && pendingSwap;
  if (isSwappablePiece && (isHovered || isPendingSwap)) {
    hexBlack = !hexBlack;
    hexPartialOpacity = !isPendingSwap;
  }

  const onMouseEnter = () => {
    if (!disabled) {
      dispatch(hexagonSelected([row, col]));
    }
  };

  const onClick = () => {
    if (disabled) {
      return;
    }
    if (isSwappablePiece) {
      if (confirmMoves) {
        onRequestSwap();
      } else {
        onCommitSwap();
      }
      return;
    }
    if (!boardState[row][col]) {
      const move: Move = [row, col];
      if (confirmMoves) {
        onRequestMove(move);
      } else {
        onCommitMove(move);
      }
    }
  };

  return (
    <g onMouseEnter={onMouseEnter} onClick={onClick}>
      <polygon className="Hexagon gray" points={points} transform={transform} />
      <polygon
        className={classnames('Hexagon', {
          black: !hexGray && hexBlack,
          white: !hexGray && !hexBlack,
          partialOpacity: hexPartialOpacity,
          invisible: hexGray,
        })}
        points={points}
        transform={transform}
      />
      <polygon
        className={classnames('LastMoveMarker', 'gray', {
          invisible: markerInvisible || isSwappablePiece,
        })}
        points={markerPoints}
        transform={transform}
      />
      {isSwappablePiece && (
        <text
          className={classnames('SwapMarker', {
            white: hexBlack,
            black: !hexBlack,
          })}
          transform={transform}
          textAnchor="middle"
          dominantBaseline="central"
        >
          S
        </text>
      )}
    </g>
  );
}

function Hexagons(props: HexagonsProps) {
  const {
    boardState,
    disabled,
    confirmMoves,
    pendingMove,
    onRequestMove,
    onCommitMove,
    pendingSwap,
    onRequestSwap,
    onCommitSwap,
  } = props;
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
          confirmMoves={confirmMoves}
          pendingMove={pendingMove}
          onRequestMove={onRequestMove}
          onCommitMove={onCommitMove}
          pendingSwap={pendingSwap}
          onRequestSwap={onRequestSwap}
          onCommitSwap={onCommitSwap}
        />,
      );
    }
  }

  const onMouseLeave = () => {
    dispatch(hexagonSelected([NaN, NaN]));
  };

  return <g onMouseLeave={onMouseLeave}>{hexagons}</g>;
}

type Point = [number, number];

// Sutherland-Hodgman half-plane intersection: clips a convex polygon to the
// region where sign * ((p - P) . n) >= 0.
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

// Unit normal of the edge p1->p2 that points away from `center`. Determined
// by checking which of the two perpendicular candidates faces away from the
// edge's midpoint-to-center direction.
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

// Intersection of two lines, each given as a point plus a direction vector.
function lineIntersection(p1: Point, d1: Point, p2: Point, d2: Point): Point {
  const denom = d1[0] * d2[1] - d1[1] * d2[0];
  const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / denom;
  return [p1[0] + t * d1[0], p1[1] + t * d1[1]];
}

// Offsets a polyline outward (away from `center`) by `distance`, producing
// the parallel curve used to keep the border clear of the hexagon edges it
// used to run directly along. Each edge shifts along its own outward
// normal; interior vertices are rejoined via line intersection (a miter
// join). Collinear neighbors fall back to a plain shift since their offset
// lines don't meet at a single point.
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

// Outward-offset corner where two borders' edges meet: intersects their
// individually-offset lines. When the two edges are collinear there's no
// unique intersection, so instead shift the point the edges actually share
// (the corner hexagon's edge midpoint, where the original, pre-offset
// border paths handed off from one color to the other) along the shared
// normal -- this keeps the black/white split centered on that edge rather
// than drifting toward whichever edge's far endpoint happened to be used.
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

function Borders() {
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const d = 0.5 * Math.sqrt(3);

  const topBorderPoints: Point[] = [];
  const bottomBorderPoints: Point[] = [];
  const leftBorderPoints: Point[] = [];
  const rightBorderPoints: Point[] = [];
  bottomBorderPoints.push([(boardSize - 0.5) * d, 1.5 * boardSize + 0.25]);
  rightBorderPoints.push([(2 * boardSize - 0.5) * d, 0.25]);
  for (let i = 0; i < boardSize; i += 1) {
    topBorderPoints.push([2 * i * d, 0.5], [(2 * i + 1) * d, 0]);
    bottomBorderPoints.push(
      [(2 * i + boardSize) * d, 1.5 * boardSize + 0.5],
      [(2 * i + boardSize + 1) * d, 1.5 * boardSize],
    );
    leftBorderPoints.push([i * d, 1.5 * i + 0.5], [i * d, 1.5 * i + 1.5]);
    rightBorderPoints.push(
      [(i + 2 * boardSize) * d, 1.5 * i + 0.5],
      [(i + 2 * boardSize) * d, 1.5 * i + 1.5],
    );
  }
  topBorderPoints.push([(2 * boardSize - 0.5) * d, 0.25]);
  leftBorderPoints.push([(boardSize - 0.5) * d, 1.5 * (boardSize - 1) + 1.75]);

  const boardCenter: Point = [
    ((3 * boardSize - 1) * d) / 2,
    (1.5 * boardSize + 0.5) / 2,
  ];

  // Corner points and clip normals used to trim each border's round end
  // caps. At the top-left and bottom-right corners the two borders meet at a
  // genuine angle, so the normal is the bisector of their two directions,
  // splitting the round caps along a clean diagonal seam. At the top-right
  // and bottom-left corners the borders are actually collinear (the path
  // runs straight through), so the normal is that shared line direction
  // instead, which trims the round-cap bulge back to a flush cut rather than
  // introducing a diagonal split that wasn't there before. The corner points
  // themselves are computed as the outward-offset intersection of the two
  // borders' edges, so the clip plane moves outward in step with the
  // borders rather than staying pinned to the old, overlapping geometry.
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
  const nTopLeft: Point = [0.5, -d];
  const nTopRight: Point = [-d, -0.5];
  const nBottomLeft: Point = [d, 0.5];
  const nBottomRight: Point = [-0.5, d];

  // Offset each border's interior points outward, then pin its two open
  // ends to the corner points above (rather than the single-edge-normal
  // shift offsetPolyline would otherwise use there). This keeps each
  // border's drawn endpoint exactly on the clip plane used to trim its
  // round cap, so the corner clipping doesn't cut the line back short of
  // where it now needs to reach.
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

  const margin = 10;
  const boundingBox: Point[] = [
    [-margin, -margin],
    [(3 * boardSize - 1) * d + margin, -margin],
    [(3 * boardSize - 1) * d + margin, 1.5 * boardSize + 0.5 + margin],
    [-margin, 1.5 * boardSize + 0.5 + margin],
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

  return (
    <g className="Border">
      <defs>
        <clipPath id="borderClipTop">
          <polygon points={topClip} />
        </clipPath>
        <clipPath id="borderClipBottom">
          <polygon points={bottomClip} />
        </clipPath>
        <clipPath id="borderClipLeft">
          <polygon points={leftClip} />
        </clipPath>
        <clipPath id="borderClipRight">
          <polygon points={rightClip} />
        </clipPath>
      </defs>
      <polyline
        points={pointsToString(offsetLeftBorderPoints)}
        stroke="white"
        clipPath="url(#borderClipLeft)"
      />
      <polyline
        points={pointsToString(offsetRightBorderPoints)}
        stroke="white"
        clipPath="url(#borderClipRight)"
      />
      <polyline
        points={pointsToString(offsetTopBorderPoints)}
        stroke="black"
        clipPath="url(#borderClipTop)"
      />
      <polyline
        points={pointsToString(offsetBottomBorderPoints)}
        stroke="black"
        clipPath="url(#borderClipBottom)"
      />
    </g>
  );
}

function CoordinateLabels(props: CoordinateLabelsProps) {
  const { rotated } = props;
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const d = 0.5 * Math.sqrt(3);
  const contentWidth = (3 * boardSize - 1) * d;

  const coordinateLabels = [];
  for (let i = 0; i < boardSize; i += 1) {
    const topLabelKey = `coordinateLabel ${COORDINATE_LETTERS[i]}`;
    const leftLabelKey = `coordinateLabel ${i}`;
    const leftLabelOffset = i + 1 < 10 ? 0.7 : 0.95;

    const colX = 2 * i * d;
    const colY = -0.05;
    // rowPosition/rowPerp are the row's raw axis positions (matching
    // Hexagon's translateY and the slant-following left edge); rowBaselineNudge
    // and leftLabelOffset are rendering-specific compensations (default SVG
    // baseline, and anchor="start" digit width) that only apply when a value
    // is used as a y coordinate or with anchor="start", respectively.
    const rowPosition = 1.5 * i + 1;
    const rowPerp = i * d;
    const rowBaselineNudge = 0.2;
    const rowMargin = 0.7;
    const rowX = rowPerp - leftLabelOffset;
    const rowY = rowPosition + rowBaselineNudge;

    // Rotating the board 90 degrees maps model-space point (x, y) to
    // (y, contentWidth - x); labels are repositioned with this same
    // transform but rendered unrotated so the glyphs stay upright. The row
    // label uses textAnchor="middle" when rotated, so it needs neither the
    // baseline nudge (only relevant to y coordinates) nor the digit-width
    // compensation (only relevant to anchor="start").
    const [colLabelX, colLabelY] = rotated
      ? [colY, contentWidth - colX]
      : [colX, colY];
    const [rowLabelX, rowLabelY] = rotated
      ? [rowPosition, contentWidth - rowPerp + rowMargin]
      : [rowX, rowY];

    coordinateLabels.push(
      <text
        key={topLabelKey}
        x={colLabelX}
        y={colLabelY}
        textAnchor={rotated ? 'end' : undefined}
        dominantBaseline={rotated ? 'central' : undefined}
      >
        {COORDINATE_LETTERS[i]}
      </text>,
    );
    coordinateLabels.push(
      <text
        key={leftLabelKey}
        x={rowLabelX}
        y={rowLabelY}
        textAnchor={rotated ? 'middle' : undefined}
      >
        {i + 1}
      </text>,
    );
  }

  return <g className="CoordinateLabel">{coordinateLabels}</g>;
}

function ComponentMarker(props: ComponentMarkerProps) {
  const { component } = props;
  const d = 0.5 * Math.sqrt(3);
  const scale = INVERSE_GOLDEN_RATIO ** 2;
  const points = `0,${scale} ${d * scale},${0.5 * scale} ${d * scale},${-0.5 * scale} 0,${-scale} ${-d * scale},${-0.5 * scale} ${-d * scale},${0.5 * scale}`;
  const markers = [];
  for (let i = 0; i < component.length; i += 1) {
    const [row, col] = component[i];
    const translateX = (row + 1 + 2 * col) * d;
    const translateY = 1 + 1.5 * row;
    const transform = `translate(${translateX} ${translateY})`;
    const key = `pieceMarker ${row} ${col}`;
    markers.push(<polygon key={key} points={points} transform={transform} />);
  }
  return <g className="PieceMarker gray">{markers}</g>;
}

function HexBoard(props: HexBoardProps) {
  const {
    boardState,
    winningComponent,
    disabled,
    confirmMoves,
    pendingMove,
    onRequestMove,
    onCommitMove,
    pendingSwap,
    onRequestSwap,
    onCommitSwap,
  } = props;
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const rotated = useIsPortraitViewport();

  const d = 0.5 * Math.sqrt(3);
  const margin = 1;
  const contentWidth = (3 * boardSize - 1) * d;
  const contentHeight = 1.5 * boardSize + 0.5;
  const width = (rotated ? contentHeight : contentWidth) + 2 * margin;
  const height = (rotated ? contentWidth : contentHeight) + 2 * margin;
  const viewBox = `${-margin} ${-margin} ${width} ${height}`;
  const gridTransform = rotated
    ? `matrix(0,-1,1,0,0,${contentWidth})`
    : undefined;

  return (
    <div className="HexBoardContainer">
      <svg className="HexBoard" viewBox={viewBox}>
        <g transform={gridTransform}>
          <Hexagons
            boardState={boardState}
            disabled={disabled}
            confirmMoves={confirmMoves}
            pendingMove={pendingMove}
            onRequestMove={onRequestMove}
            onCommitMove={onCommitMove}
            pendingSwap={pendingSwap}
            onRequestSwap={onRequestSwap}
            onCommitSwap={onCommitSwap}
          />
          <Borders />
        </g>
        <CoordinateLabels rotated={rotated} />
        <g transform={gridTransform}>
          <ComponentMarker component={winningComponent} />
        </g>
      </svg>
    </div>
  );
}

function MoveHistoryButtons() {
  const dispatch = useDispatch();
  const { moveHistory, moveNumber } = useSelector(selectGameState);

  const shiftMoveNumber = useCallback(
    (offset: number) => {
      dispatch(
        navigateMoveHistory(
          Math.max(0, Math.min(moveHistory.length, moveNumber + offset)),
        ),
      );
    },
    [dispatch, moveHistory.length, moveNumber],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isHotkeyEvent(event)) {
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          shiftMoveNumber(-1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          shiftMoveNumber(1);
          break;
        case 'PageUp':
          event.preventDefault();
          shiftMoveNumber(-6);
          break;
        case 'PageDown':
          event.preventDefault();
          shiftMoveNumber(6);
          break;
        case 'Home':
          event.preventDefault();
          shiftMoveNumber(-Infinity);
          break;
        case 'End':
          event.preventDefault();
          shiftMoveNumber(Infinity);
          break;
        // no default
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shiftMoveNumber]);

  return (
    <div className="MoveHistoryButtons">
      <button type="button" onClick={() => shiftMoveNumber(-Infinity)}>
        |&lt;
      </button>
      <button type="button" onClick={() => shiftMoveNumber(-6)}>
        &lt;&lt;
      </button>
      <button type="button" onClick={() => shiftMoveNumber(-1)}>
        &lt;
      </button>
      <button type="button" onClick={() => shiftMoveNumber(1)}>
        &gt;
      </button>
      <button type="button" onClick={() => shiftMoveNumber(6)}>
        &gt;&gt;
      </button>
      <button type="button" onClick={() => shiftMoveNumber(Infinity)}>
        &gt;|
      </button>
    </div>
  );
}

function UndoButton(props: UndoButtonProps) {
  let { disabled } = props;
  const dispatch = useDispatch();
  const { active: netplayActive, isBlack } = useSelector(selectNetplayState);
  const { moveHistory, moveNumber } = useSelector(selectGameState);
  const isBlackTurn = useSelector(selectIsBlackTurn);

  disabled =
    disabled ||
    // disable when no moves have been made
    !moveHistory.length ||
    // disable when board not set to latest position
    moveNumber !== moveHistory.length ||
    // disable during own turn
    (netplayActive && isBlack === isBlackTurn);

  const handleClick = useCallback(() => {
    if (netplayActive) {
      sendRequestUndo(moveHistory.length);
      dispatch(undoRequestSent(moveHistory.length));
    } else {
      dispatch(undoMove());
    }
  }, [dispatch, netplayActive, moveHistory.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isHotkeyEvent(event) || disabled) {
        return;
      }
      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        handleClick();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleClick]);

  return (
    <button type="button" onClick={handleClick} disabled={disabled}>
      Undo (U)
    </button>
  );
}

function ResignButton(props: ResignButtonProps) {
  const { disabled } = props;
  const dispatch = useDispatch();
  const { active: netplayActive, isBlack } = useSelector(selectNetplayState);
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleResign = useCallback(() => {
    if (netplayActive) {
      sendResign();
    }
    dispatch(playerResigned(netplayActive ? isBlack : isBlackTurn));
  }, [dispatch, netplayActive, isBlack, isBlackTurn]);

  const handleClick = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isHotkeyEvent(event) || disabled) {
        return;
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        handleClick();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleClick]);

  return (
    <>
      <button type="button" onClick={handleClick} disabled={disabled}>
        Resign (R)
      </button>
      {confirmOpen && (
        <Modal title="Resign?" onClose={() => setConfirmOpen(false)}>
          <p>Are you sure you want to resign?</p>
          <div className="ResignDialogActions">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                handleResign();
              }}
            >
              Resign
            </button>
            <button type="button" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function DisconnectDialog() {
  const dispatch = useDispatch();
  const { active: netplayActive, connectionStatus } =
    useSelector(selectNetplayState);

  if (!netplayActive || connectionStatus !== 'disconnected') {
    return null;
  }

  const continueLocally = () => {
    dispatch(deactivateNetplay());
  };

  return (
    <Modal title="Opponent disconnected" onClose={continueLocally}>
      <p>Your opponent has disconnected. The online game has ended.</p>
      <div className="ResignDialogActions">
        <Link to="/" tabIndex={-1}>
          <button type="button">Return home</button>
        </Link>
        <button type="button" onClick={continueLocally}>
          Continue locally
        </button>
      </div>
    </Modal>
  );
}

function ConfirmMoveDialog(props: ConfirmMoveDialogProps) {
  const { pendingMove, onConfirm, onCancel } = props;

  if (!pendingMove) {
    return null;
  }

  const [row, col] = pendingMove;
  const label = `${COORDINATE_LETTERS[col]}${row + 1}`;

  return (
    <Modal title="Confirm move" onClose={onCancel}>
      <p>Move at {label}?</p>
      <div className="ResignDialogActions">
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function ConfirmSwapDialog(props: ConfirmSwapDialogProps) {
  const { pendingSwap, onConfirm, onCancel } = props;

  if (!pendingSwap) {
    return null;
  }

  return (
    <Modal title="Confirm swap" onClose={onCancel}>
      <p>Swap sides?</p>
      <div className="ResignDialogActions">
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function ConnectionStatus() {
  const {
    active: netplayActive,
    connectionStatus,
    statusMessage,
  } = useSelector(selectNetplayState);

  if (!netplayActive) {
    return <div className="ConnectionStatus" />;
  }

  let status = '';
  if (connectionStatus === 'error') {
    status = statusMessage || 'Connection error';
  }

  return <div className="ConnectionStatus">{status}</div>;
}

function PlayerHexagonIcon() {
  const d = 0.5 * Math.sqrt(3);
  const points = `0,1 ${d},0.5 ${d},-0.5 0,-1 ${-d},-0.5 ${-d},0.5`;
  return (
    <svg viewBox="-1 -1 2 2">
      <polygon points={points} />
    </svg>
  );
}

function TurnIndicator(props: TurnIndicatorProps) {
  const { gameOver } = props;
  const isBlackTurn = useSelector(selectIsBlackTurn);
  return (
    <div className="TurnIndicator">
      <div
        aria-label={isBlackTurn ? 'Black' : 'White'}
        className={classnames(
          { black: isBlackTurn },
          { white: !isBlackTurn },
          { partialOpacity: gameOver },
        )}
      >
        <PlayerHexagonIcon />
      </div>
    </div>
  );
}

function ConfirmMoveToggle(props: ConfirmMoveToggleProps) {
  const { enabled, onChange } = props;
  return (
    <label className="ConfirmMoveToggle" htmlFor="confirmMoves">
      Confirm moves
      <input
        type="checkbox"
        id="confirmMoves"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function HexGame() {
  const {
    active: netplayActive,
    connectionStatus,
    isBlack,
  } = useSelector(selectNetplayState);
  const { moveHistory, moveNumber, resignationState } =
    useSelector(selectGameState);
  const boardState = useSelector(selectBoardState);
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const commitMove = useCommitMove();
  const commitSwap = useCommitSwap();
  const [confirmMoves, setConfirmMoves] = useState(false);
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const [pendingSwap, setPendingSwap] = useState(false);

  const winningComponent = getWinningConnectedComponent(boardState);
  const gameOver = Boolean(resignationState) || winningComponent.length > 0;

  const disabled =
    // disable board when it is not set to latest position
    moveNumber !== moveHistory.length ||
    // disable board during opponent's turn
    (netplayActive && isBlack !== isBlackTurn) ||
    // disable board when the game is over
    gameOver ||
    // disable board when opponent has disconnected
    (netplayActive && connectionStatus === 'disconnected');

  // Clear a stale confirmation if the board becomes unclickable while it's
  // pending (e.g. the turn changes, the game ends, or the opponent
  // disconnects).
  useEffect(() => {
    if (disabled) {
      setPendingMove(null);
      setPendingSwap(false);
    }
  }, [disabled]);

  const onCommitMove = useCallback(
    (move: Move) => {
      commitMove(move);
      setPendingMove(null);
    },
    [commitMove],
  );

  const onCommitSwap = useCallback(() => {
    commitSwap();
    setPendingSwap(false);
  }, [commitSwap]);

  return (
    <div className="HexGame">
      <div className="HexGameTopPanel">
        <div className="TopPanelButtons">
          <Link to="/" tabIndex={-1}>
            <button type="button">Home</button>
          </Link>
          <RulesButton />
          <NewGameButton />
        </div>
      </div>
      <ConfirmMoveToggle enabled={confirmMoves} onChange={setConfirmMoves} />
      <TurnIndicator gameOver={gameOver} />
      <WinnerAnnouncement
        boardState={boardState}
        winningComponent={winningComponent}
      />
      <UndoDialog />
      <DisconnectDialog />
      <ConfirmMoveDialog
        pendingMove={pendingMove}
        onConfirm={() => pendingMove && onCommitMove(pendingMove)}
        onCancel={() => setPendingMove(null)}
      />
      <ConfirmSwapDialog
        pendingSwap={pendingSwap}
        onConfirm={onCommitSwap}
        onCancel={() => setPendingSwap(false)}
      />
      <HexBoard
        boardState={boardState}
        winningComponent={winningComponent}
        disabled={disabled}
        confirmMoves={confirmMoves}
        pendingMove={pendingMove}
        onRequestMove={setPendingMove}
        onCommitMove={onCommitMove}
        pendingSwap={pendingSwap}
        onRequestSwap={() => setPendingSwap(true)}
        onCommitSwap={onCommitSwap}
      />
      <div className="HexGameBottomPanel">
        <ConnectionStatus />
        <MoveHistoryButtons />
        <div className="ActionButtons">
          <UndoButton disabled={gameOver} />
          <ResignButton disabled={gameOver} />
        </div>
      </div>
    </div>
  );
}
