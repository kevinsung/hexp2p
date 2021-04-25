export enum HexagonState {
  WHITE = -1,
  EMPTY = 0,
  BLACK = 1,
}

export interface HexSettings {
  boardSize: number;
  useSwapRule: boolean;
}

export interface GameState {
  settings: HexSettings;
  boardState: Array<Array<HexagonState>>;
  isBlackTurn: boolean;
  selectedHexagon: Array<number>;
}
