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

import React from 'react';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  hexagonSelected,
  moveMade,
  navigateMoveHistory,
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
} from '../netplayClient';
import {
  selectNetplayState,
  undoRequestFulfilled,
  undoRequestSent,
} from '../slices/netplaySlice';
import getWinningConnectedComponent from '../slices/getWinningConnectedComponent';
import { HexagonState } from '../types';
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

interface NewGameButtonProps {
  winningComponent: Array<Array<number>>;
}

interface WinnerAnnouncementProps {
  boardState: Array<Array<number>>;
  winningComponent: Array<Array<number>>;
}

interface PlayerNamesProps {
  winningComponent: Array<Array<number>>;
}

const COORDINATE_LETTERS = 'ABCDEFGHJKLMNOPQRST';

function NewGameButton(props: NewGameButtonProps) {
  const { winningComponent } = props;
  const { active: netplayActive, hosting } = useSelector(selectNetplayState);

  if (!winningComponent.length) {
    return null;
  }

  if (netplayActive && !hosting) {
    return null;
  }

  return (
    <Link to="/settings">
      <button type="button">New game</button>
    </Link>
  );
}

function WinnerAnnouncement(props: WinnerAnnouncementProps) {
  const { boardState, winningComponent } = props;

  if (!winningComponent.length) {
    return null;
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

function SwapDialog() {
  const dispatch = useDispatch();
  const { active: netplayActive, isBlack } = useSelector(selectNetplayState);
  const { moveNumber, settings, swapPhaseComplete } = useSelector(
    selectGameState
  );
  const { useSwapRule } = settings;

  if (!useSwapRule || swapPhaseComplete || moveNumber !== 1) {
    return null;
  }

  if (netplayActive && isBlack) {
    return (
      <div className="SwapDialog">
        SWAP PHASE: Opponent is choosing whether to swap...
      </div>
    );
  }

  const handleSwap = (swap: boolean) => {
    dispatch(swapChosen(swap));
    if (netplayActive) {
      sendSwap(swap);
      dispatch(undoRequestFulfilled());
    }
  };

  return (
    <div className="SwapDialog">
      SWAP PHASE: Do you want to swap pieces?
      <button type="button" onClick={() => handleSwap(true)}>
        YES
      </button>
      <button type="button" onClick={() => handleSwap(false)}>
        NO
      </button>
    </div>
  );
}

function UndoDialog() {
  const dispatch = useDispatch();
  const { undoRequestSent: undoRequested, undoRequestReceived } = useSelector(
    selectNetplayState
  );

  if (undoRequested) {
    return <div>Undo request sent</div>;
  }

  const handleClick = () => {
    sendAcceptUndo();
    dispatch(undoRequestFulfilled());
    dispatch(undoMove());
  };

  if (undoRequestReceived) {
    return (
      <div>
        Opponent requested undo
        <button
          className="UndoDialogButton"
          type="button"
          onClick={handleClick}
        >
          Accept
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
  const { moveHistory, moveNumber, selectedHexagon } = useSelector(
    selectGameState
  );
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const [selectedRow, selectedCol] = selectedHexagon;

  const d = 0.5 * Math.sqrt(3);
  const translateX = (row + 1 + 2 * col) * d;
  const translateY = 1 + 1.5 * row;
  const transform = `translate(${translateX} ${translateY})`;
  const points = `0,1 ${d},0.5 ${d},-0.5 0,-1 ${-d},-0.5 ${-d},0.5`;

  // circle properties
  let circleBlack;
  let circlePartialOpacity;
  let circleInvisible = false;
  switch (boardState[row][col]) {
    case HexagonState.BLACK:
      circleBlack = true;
      circlePartialOpacity = false;
      break;
    case HexagonState.WHITE:
      circleBlack = false;
      circlePartialOpacity = false;
      break;
    case HexagonState.EMPTY:
      if (row === selectedRow && col === selectedCol) {
        circleBlack = isBlackTurn;
        circlePartialOpacity = true;
      } else {
        circleInvisible = true;
      }
      break;
    // no default
  }

  const lastMove = moveNumber > 0 ? moveHistory[moveNumber - 1] : [NaN, NaN];
  const [lrow, lcol] = lastMove;
  const markerInvisible = lrow !== row || lcol !== col;

  const onMouseEnter = () => {
    if (!disabled) {
      dispatch(hexagonSelected([row, col]));
    }
  };

  const onClick = () => {
    if (!disabled && !boardState[row][col]) {
      const move = [row, col];
      dispatch(moveMade(move));
      if (netplayActive) {
        sendMove(move);
        dispatch(undoRequestFulfilled());
      }
    }
  };

  return (
    <g onMouseEnter={onMouseEnter} onClick={onClick}>
      <polygon className="Hexagon gray" points={points} transform={transform} />
      <circle
        className={classnames(
          'Circle',
          { black: circleBlack },
          { white: !circleBlack },
          { partialOpacity: circlePartialOpacity },
          { invisible: circleInvisible }
        )}
        r="0.6"
        transform={transform}
      />
      <circle
        className={classnames('LastMoveMarker', 'gray', {
          invisible: markerInvisible,
        })}
        r="0.3"
        transform={transform}
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
  const cornerOverlap = 0.1;

  const topBorderPoints = [];
  const bottomBorderPoints = [];
  const leftBorderPoints = [];
  const rightBorderPoints = [];
  topBorderPoints.push(`0,${0.5 + cornerOverlap}`);
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
  bottomBorderPoints.push(
    `${(3 * boardSize - 1) * d},${1.5 * boardSize - cornerOverlap}`
  );

  return (
    <g className="Border">
      <polyline points={leftBorderPoints.join(' ')} stroke="white" />
      <polyline points={rightBorderPoints.join(' ')} stroke="white" />
      <polyline points={topBorderPoints.join(' ')} stroke="black" />
      <polyline points={bottomBorderPoints.join(' ')} stroke="black" />
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

function MoveHistoryButtons() {
  const dispatch = useDispatch();
  const { moveHistory, moveNumber } = useSelector(selectGameState);

  const shiftMoveNumber = (offset: number) => {
    dispatch(
      navigateMoveHistory(
        Math.max(0, Math.min(moveHistory.length, moveNumber + offset))
      )
    );
  };

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

function UndoButton() {
  const dispatch = useDispatch();
  const { active: netplayActive, isBlack } = useSelector(selectNetplayState);
  const { moveHistory, moveNumber } = useSelector(selectGameState);
  const isBlackTurn = useSelector(selectIsBlackTurn);

  const disabled =
    // disable when no moves have been made
    !moveHistory.length ||
    // disable when board not set to latest position
    moveNumber !== moveHistory.length ||
    // disable during own turn
    (netplayActive && isBlack === isBlackTurn);

  const handleClick = () => {
    if (netplayActive) {
      sendRequestUndo();
      dispatch(undoRequestSent());
    } else {
      dispatch(undoMove());
    }
  };

  return (
    <div className="UndoButton">
      <button type="button" onClick={handleClick} disabled={disabled}>
        Undo
      </button>
    </div>
  );
}

function ConnectionStatus() {
  const { active: netplayActive, connected } = useSelector(selectNetplayState);
  const status = netplayActive && !connected ? 'DISCONNECTED' : '';
  return <div className="ConnectionStatus">{status}</div>;
}

function PlayerNames(props: PlayerNamesProps) {
  const { winningComponent } = props;
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const { active: netplayActive, hosting, isBlack } = useSelector(
    selectNetplayState
  );
  const playerOneIsBlack = !netplayActive || hosting === isBlack;
  return (
    <div className="PlayerNames">
      <div
        className={classnames(
          { black: playerOneIsBlack },
          { white: !playerOneIsBlack },
          {
            partialOpacity:
              playerOneIsBlack !== isBlackTurn || winningComponent.length,
          }
        )}
      >
        Player 1
      </div>
      <div
        className={classnames(
          { black: !playerOneIsBlack },
          { white: playerOneIsBlack },
          {
            partialOpacity:
              playerOneIsBlack === isBlackTurn || winningComponent.length,
          }
        )}
      >
        Player 2
      </div>
    </div>
  );
}

export default function HexGame() {
  const { active: netplayActive, isBlack } = useSelector(selectNetplayState);
  const { moveHistory, moveNumber, settings, swapPhaseComplete } = useSelector(
    selectGameState
  );
  const boardState = useSelector(selectBoardState);
  const isBlackTurn = useSelector(selectIsBlackTurn);
  const { useSwapRule } = settings;

  const winningComponent = getWinningConnectedComponent(boardState);

  const disabled =
    // disable board during swap phase
    (useSwapRule && !swapPhaseComplete && moveNumber === 1) ||
    // disable board when it is not set to latest position
    moveNumber !== moveHistory.length ||
    // disable board during opponent's turn
    (netplayActive && isBlack !== isBlackTurn);

  return (
    <div className="HexGame">
      <div className="HexGameTopPanel">
        <Link to="/" tabIndex={-1}>
          <button type="button">Home</button>
        </Link>
        <div className="DialogPanel">
          <WinnerAnnouncement
            boardState={boardState}
            winningComponent={winningComponent}
          />
          <NewGameButton winningComponent={winningComponent} />
          <SwapDialog />
          <UndoDialog />
        </div>
        <PlayerNames winningComponent={winningComponent} />
      </div>
      <HexBoard
        boardState={boardState}
        winningComponent={winningComponent}
        disabled={disabled}
      />
      <div className="HexGameBottomPanel">
        <ConnectionStatus />
        <MoveHistoryButtons />
        <UndoButton />
      </div>
    </div>
  );
}
