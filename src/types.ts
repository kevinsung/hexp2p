export enum HexagonState {
  WHITE = -2,
  WHITE_PARTIAL = -1,
  EMPTY = 0,
  BLACK_PARTIAL = 1,
  BLACK = 2,
}

export interface HexSettings {
  boardSize: number;
  useSwapRule: boolean;
}

export interface GameState {
  settings: HexSettings;
  boardState: Array<Array<HexagonState>>;
  isBlackTurn: boolean;
}
