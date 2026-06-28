import openingStudyData from '../data/opening-study.json';

// Win rate (first player's) for the opening stone at [row, col] on a board of
// `size`, from src/data/opening-study.json. Returns null when the board size
// is not covered by the study (outside the 7–19 range), so callers can fall
// back gracefully.
export function openingWinrate(
  size: number,
  row: number,
  col: number,
): number | null {
  const cells = (
    openingStudyData.sizes as Record<
      string,
      Array<{ x: number; y: number; winrate: number }>
    >
  )[String(size)];
  if (!cells) return null;
  const entry = cells.find((c) => c.x === col && c.y === row);
  return entry !== undefined ? entry.winrate : null;
}
