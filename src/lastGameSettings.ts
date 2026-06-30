export const MIN_BOARD_SIZE = 7;
export const MAX_BOARD_SIZE = 19;
export const DEFAULT_BOARD_SIZE = 13;

interface RememberedSettings {
  boardSize: number;
  useSwapRule: boolean;
  color: string;
}

let lastSettings: RememberedSettings = {
  boardSize: DEFAULT_BOARD_SIZE,
  useSwapRule: true,
  color: 'random',
};

export function getLastSettings(): RememberedSettings {
  return { ...lastSettings };
}

export function setLastSettings(s: RememberedSettings): void {
  lastSettings = { ...s };
}
