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

interface WinnerAnnouncementProps {
  boardState: Array<Array<number>>;
  winningComponent: Array<Array<number>>;
}

interface PlayerNamesProps {
  gameOver: boolean;
}

interface NewGameButtonProps {
  disabled: boolean;
}

interface UndoButtonProps {
  disabled: boolean;
}

interface ResignButtonProps {
  disabled: boolean;
}

const COORDINATE_LETTERS = 'ABCDEFGHJKLMNOPQRST';
const INVERSE_GOLDEN_RATIO = 0.618033988749895;

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

function NewGameButton(props: NewGameButtonProps) {
  const { disabled } = props;
  const { active: netplayActive, hosting } = useSelector(selectNetplayState);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (disabled) {
    return null;
  }

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

  if (!winningComponent.length && !resignationState) {
    return null;
  }

  if (resignationState === HexagonState.BLACK) {
    return <div className="WinnerAnnouncement">Black resigned, White wins</div>;
  }

  if (resignationState === HexagonState.WHITE) {
    return <div className="WinnerAnnouncement">White resigned, Black wins</div>;
  }

  const [row, col] = winningComponent[0];
  switch (boardState[row][col]) {
    case HexagonState.BLACK:
      return <div className="WinnerAnnouncement">Black wins</div>;
    case HexagonState.WHITE:
      return <div className="WinnerAnnouncement">White wins</div>;
    default:
      return null;
  }
}

function UndoDialog() {
  const dispatch = useDispatch();
  const { undoRequestSent: undoRequested, undoRequestReceived } =
    useSelector(selectNetplayState);

  const handleClick = useCallback(() => {
    sendAcceptUndo();
    dispatch(undoRequestFulfilled());
    dispatch(undoMove());
  }, [dispatch]);

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

  if (undoRequested) {
    return <div>Undo request sent</div>;
  }

  if (undoRequestReceived) {
    return (
      <div>
        Opponent requested undo
        <button
          className="UndoDialogButton"
          type="button"
          onClick={handleClick}
        >
          Accept (A)
        </button>
      </div>
    );
  }

  return null;
}

function Hexagon(props: HexagonProps) {
  const { boardState, row, col, disabled } = props;
  const dispatch = useDispatch();
  const { active: netplayActive } = useSelector(selectNetplayState);
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
      if (isHovered) {
        hexBlack = isBlackTurn;
        hexPartialOpacity = true;
      } else {
        hexGray = true;
      }
      break;
    // no default
  }

  if (isSwappablePiece && isHovered) {
    hexBlack = !hexBlack;
    hexPartialOpacity = true;
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
      dispatch(swapChosen(true));
      if (netplayActive) {
        sendSwap(true);
        dispatch(undoRequestFulfilled());
      }
      return;
    }
    if (!boardState[row][col]) {
      const move = [row, col];
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
    }
  };

  return (
    <g onMouseEnter={onMouseEnter} onClick={onClick}>
      <polygon
        className={classnames('Hexagon', {
          gray: hexGray,
          black: !hexGray && hexBlack,
          white: !hexGray && !hexBlack,
          partialOpacity: hexPartialOpacity,
        })}
        points={points}
        transform={transform}
      />
      <polygon
        className={classnames('LastMoveMarker', 'gray', {
          invisible: markerInvisible,
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

function Borders() {
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;
  const d = 0.5 * Math.sqrt(3);

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
      },${1.5 * boardSize}`,
    );
    leftBorderPoints.push(
      `${i * d},${1.5 * i + 0.5} ${i * d},${1.5 * i + 1.5}`,
    );
    rightBorderPoints.push(
      `${(i + 2 * boardSize) * d},${1.5 * i + 0.5} ${(i + 2 * boardSize) * d},${
        1.5 * i + 1.5
      }`,
    );
  }
  topBorderPoints.push(`${(2 * boardSize - 0.5) * d},0.25`);
  leftBorderPoints.push(
    `${(boardSize - 0.5) * d},${1.5 * (boardSize - 1) + 1.75}`,
  );

  // Corner points and clip normals used to trim each border's round end
  // caps. At the top-left and bottom-right corners the two borders meet at a
  // genuine angle, so the normal is the bisector of their two directions,
  // splitting the round caps along a clean diagonal seam. At the top-right
  // and bottom-left corners the borders are actually collinear (the path
  // runs straight through), so the normal is that shared line direction
  // instead, which trims the round-cap bulge back to a flush cut rather than
  // introducing a diagonal split that wasn't there before.
  const topLeft: Point = [0, 0.5];
  const topRight: Point = [(2 * boardSize - 0.5) * d, 0.25];
  const bottomLeft: Point = [(boardSize - 0.5) * d, 1.5 * boardSize + 0.25];
  const bottomRight: Point = [(3 * boardSize - 1) * d, 1.5 * boardSize];
  const nTopLeft: Point = [0.5, -d];
  const nTopRight: Point = [-d, -0.5];
  const nBottomLeft: Point = [d, 0.5];
  const nBottomRight: Point = [-0.5, d];

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
        points={leftBorderPoints.join(' ')}
        stroke="white"
        clipPath="url(#borderClipLeft)"
      />
      <polyline
        points={rightBorderPoints.join(' ')}
        stroke="white"
        clipPath="url(#borderClipRight)"
      />
      <polyline
        points={topBorderPoints.join(' ')}
        stroke="black"
        clipPath="url(#borderClipTop)"
      />
      <polyline
        points={bottomBorderPoints.join(' ')}
        stroke="black"
        clipPath="url(#borderClipBottom)"
      />
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
      </text>,
    );
    coordinateLabels.push(
      <text key={leftLabelKey} x={i * d - leftLabelOffset} y={1.5 * i + 1.2}>
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
  const { boardState, winningComponent, disabled } = props;
  const { settings } = useSelector(selectGameState);
  const { boardSize } = settings;

  const d = 0.5 * Math.sqrt(3);
  const margin = 1;
  const width = (3 * boardSize - 1) * d + 2 * margin;
  const height = 1.5 * boardSize + 0.5 + 2 * margin;
  const viewBox = `${-margin} ${-margin} ${width} ${height}`;

  return (
    <div className="HexBoard">
      <svg className="HexBoard" viewBox={viewBox}>
        <Hexagons boardState={boardState} disabled={disabled} />
        <Borders />
        <CoordinateLabels />
        <ComponentMarker component={winningComponent} />
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
      sendRequestUndo();
      dispatch(undoRequestSent());
    } else {
      dispatch(undoMove());
    }
  }, [dispatch, netplayActive]);

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

function PlayerNames(props: PlayerNamesProps) {
  const { gameOver } = props;
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const {
    active: netplayActive,
    hosting,
    isBlack,
  } = useSelector(selectNetplayState);
  const playerOneIsBlack = !netplayActive || hosting === isBlack;
  return (
    <div className="PlayerNames">
      <div
        className={classnames(
          { black: playerOneIsBlack },
          { white: !playerOneIsBlack },
          {
            partialOpacity: playerOneIsBlack !== isBlackTurn || gameOver,
          },
        )}
      >
        Player 1
      </div>
      <div
        className={classnames(
          { black: !playerOneIsBlack },
          { white: playerOneIsBlack },
          {
            partialOpacity: playerOneIsBlack === isBlackTurn || gameOver,
          },
        )}
      >
        Player 2
      </div>
    </div>
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

  return (
    <div className="HexGame">
      <div className="HexGameTopPanel">
        <div className="TopPanelButtons">
          <Link to="/" tabIndex={-1}>
            <button type="button">Home</button>
          </Link>
          <RulesButton />
        </div>
        <div className="DialogPanel">
          <WinnerAnnouncement
            boardState={boardState}
            winningComponent={winningComponent}
          />
          <NewGameButton disabled={!gameOver} />
          <UndoDialog />
          <DisconnectDialog />
        </div>
        <PlayerNames gameOver={gameOver} />
      </div>
      <HexBoard
        boardState={boardState}
        winningComponent={winningComponent}
        disabled={disabled}
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
