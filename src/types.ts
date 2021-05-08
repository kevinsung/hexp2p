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
  swapped: boolean;
  swapPhaseComplete: boolean;
  selectedHexagon: Array<number>;
}

export interface NetplayState {
  active: boolean;
  connected: boolean;
  hosting: boolean;
  hostCode: string;
  hostCodeSubmitted: boolean;
  isBlack: boolean;
  undoRequestSent: boolean;
  undoRequestReceived: boolean;
}
