import { HexagonState } from '../types';

function hasCoordinates(coordinates: Array<number>, boardSize: number) {
  const [row, col] = coordinates;
  return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
}

function neighbors(coordinates: Array<number>) {
  const [row, col] = coordinates;
  return [
    [row - 1, col],
    [row - 1, col + 1],
    [row, col - 1],
    [row, col + 1],
    [row + 1, col - 1],
    [row + 1, col],
  ];
}

function getConnectedComponent(
  coordinates: Array<number>,
  hexagonState: HexagonState,
  boardState: Array<Array<HexagonState>>,
  visited: Array<Array<boolean>>,
  result: Array<Array<number>>
) {
  const [row, col] = coordinates;
  const size = boardState.length;

  visited[row][col] = true;
  if (boardState[row][col] === hexagonState) {
    result.push(coordinates);
  }

  neighbors(coordinates).forEach((neighbor) => {
    const [nrow, ncol] = neighbor;
    if (
      hasCoordinates(neighbor, size) &&
      !visited[nrow][ncol] &&
      boardState[nrow][ncol] === hexagonState
    ) {
      getConnectedComponent(
        neighbor,
        hexagonState,
        boardState,
        visited,
        result
      );
    }
  });
}

function connectedComponents(boardState: Array<Array<HexagonState>>) {
  const size = boardState.length;

  const visited = [];
  for (let row = 0; row < size; row += 1) {
    const rowState = [];
    for (let col = 0; col < size; col += 1) {
      rowState.push(false);
    }
    visited.push(rowState);
  }

  const components = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (boardState[row][col] && !visited[row][col]) {
        const result: Array<Array<number>> = [];
        getConnectedComponent(
          [row, col],
          boardState[row][col],
          boardState,
          visited,
          result
        );
        components.push(result);
      }
    }
  }

  return components;
}

export default function getWinningConnectedComponent(
  boardState: Array<Array<HexagonState>>
) {
  const size = boardState.length;
  const components = connectedComponents(boardState);
  let winningComponent: Array<Array<number>> = [];
  for (let i = 0; i < components.length; i += 1) {
    const component = components[i];
    const [row, col] = component[0];
    const state = boardState[row][col];
    if (state === HexagonState.BLACK) {
      const rows = component.map((coordinates) => coordinates[0]);
      if (Math.min(...rows) === 0 && Math.max(...rows) === size - 1) {
        winningComponent = component;
        break;
      }
    } else if (state === HexagonState.WHITE) {
      const cols = component.map((coordinates) => coordinates[1]);
      if (Math.min(...cols) === 0 && Math.max(...cols) === size - 1) {
        winningComponent = component;
        break;
      }
    }
  }
  return winningComponent;
}
