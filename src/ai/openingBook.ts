import openingStudyData from '../data/opening-study.json';

// A single cell from the opening study, in row/col terms.
export interface OpeningCell {
  row: number;
  col: number;
  winrate: number;
}

// All cells for the given board size from the opening study, mapped to
// {row, col, winrate}. Returns null when the size is not covered (outside
// 7–19), so callers can handle uncovered sizes gracefully.
export function openingCells(size: number): OpeningCell[] | null {
  const raw = (
    openingStudyData.sizes as Record<
      string,
      Array<{ x: number; y: number; winrate: number }>
    >
  )[String(size)];
  if (!raw) return null;
  return raw.map((c) => ({ row: c.y, col: c.x, winrate: c.winrate }));
}

// Win rate (first player's) for the opening stone at [row, col] on a board of
// `size`, from src/data/opening-study.json. Returns null when the board size
// is not covered by the study (outside the 7–19 range), so callers can fall
// back gracefully.
export function openingWinrate(
  size: number,
  row: number,
  col: number,
): number | null {
  const cells = openingCells(size);
  if (!cells) return null;
  const entry = cells.find((c) => c.row === row && c.col === col);
  return entry !== undefined ? entry.winrate : null;
}
