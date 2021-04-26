export enum HexagonState {
  WHITE = -1,
  EMPTY = 0,
  BLACK = 1,
}

export interface GameSettings {
  boardSize: number;
  useSwapRule: boolean;
}

export interface GameState {
  settings: GameSettings;
  boardState: Array<Array<HexagonState>>;
  isBlackTurn: boolean;
  selectedHexagon: Array<number>;
}
