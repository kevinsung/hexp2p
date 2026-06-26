import { createHexBoard, placeStone, toIndex } from '../hexBoard';
import { findBridgeSave } from '../bridges';
import { HexagonState } from '../../types';

describe('findBridgeSave', () => {
  it('saves a threatened bridge by playing the other carrier', () => {
    const size = 7;
    const board = createHexBoard(size);
    // Black stones at (2,2) and (1,1) form a bridge with carriers (1,2) and
    // (2,1) (bridgeOffset [-1,-1] in bridges.ts's pattern table). White
    // attacks carrier (2,1); the save is the other carrier, (1,2).
    placeStone(board, toIndex(2, 2, size), HexagonState.BLACK);
    placeStone(board, toIndex(1, 1, size), HexagonState.BLACK);
    placeStone(board, toIndex(2, 1, size), HexagonState.WHITE);

    const save = findBridgeSave(board, toIndex(2, 1, size), HexagonState.BLACK);
    expect(save).toBe(toIndex(1, 2, size));
  });

  it('returns null when the last move does not threaten any bridge', () => {
    const size = 7;
    const board = createHexBoard(size);
    placeStone(board, toIndex(2, 2, size), HexagonState.BLACK);
    placeStone(board, toIndex(1, 1, size), HexagonState.BLACK);
    // Far away from the bridge above; doesn't touch either carrier.
    placeStone(board, toIndex(5, 5, size), HexagonState.WHITE);

    const save = findBridgeSave(board, toIndex(5, 5, size), HexagonState.BLACK);
    expect(save).toBeNull();
  });

  it('returns null once the bridge has already been broken', () => {
    const size = 7;
    const board = createHexBoard(size);
    placeStone(board, toIndex(2, 2, size), HexagonState.BLACK);
    placeStone(board, toIndex(1, 1, size), HexagonState.BLACK);
    // Black already occupies the other carrier itself; nothing to save.
    placeStone(board, toIndex(1, 2, size), HexagonState.BLACK);
    placeStone(board, toIndex(2, 1, size), HexagonState.WHITE);

    const save = findBridgeSave(board, toIndex(2, 1, size), HexagonState.BLACK);
    expect(save).toBeNull();
  });

  it('handles a move in the corner without going out of bounds', () => {
    // The corner cell has only 3 in-bounds neighbors instead of 6, so most
    // of the 12 save templates compute off-board coordinates here; this just
    // confirms the bounds checks filter those out safely rather than
    // crashing or returning a bogus index.
    const size = 7;
    const board = createHexBoard(size);
    placeStone(board, toIndex(0, 0, size), HexagonState.WHITE);

    expect(() =>
      findBridgeSave(board, toIndex(0, 0, size), HexagonState.BLACK),
    ).not.toThrow();
    expect(
      findBridgeSave(board, toIndex(0, 0, size), HexagonState.BLACK),
    ).toBeNull();
  });

  it('finds a save when the threatened carrier sits on the board edge', () => {
    // Black stones (0,2) and (1,0) form a bridge (bridgeOffset [1,-2] in
    // bridges.ts) with carriers (0,1) and (1,1); (0,1) sits on row 0.
    const size = 7;
    const board = createHexBoard(size);
    placeStone(board, toIndex(0, 2, size), HexagonState.BLACK);
    placeStone(board, toIndex(1, 0, size), HexagonState.BLACK);
    placeStone(board, toIndex(0, 1, size), HexagonState.WHITE);

    const save = findBridgeSave(board, toIndex(0, 1, size), HexagonState.BLACK);
    expect(save).toBe(toIndex(1, 1, size));
  });
});
