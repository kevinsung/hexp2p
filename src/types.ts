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
  moveHistory: Array<Array<number>>;
  moveNumber: number;
  selectedHexagon: Array<number>;
}

export interface NetplayState {
  connected: boolean;
  hostCode?: string;
}
