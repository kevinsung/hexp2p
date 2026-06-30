import aiReducer, {
  activateAi,
  aiThinkingChanged,
  aiThinkingCancelled,
} from '../slices/aiSlice';
import { AiState } from '../types';

const initialState: AiState = {
  active: false,
  aiPlaysBlack: false,
  thinking: false,
  generation: 0,
};

describe('aiThinkingCancelled', () => {
  it('sets thinking to false', () => {
    let state = aiReducer(initialState, activateAi());
    state = aiReducer(state, aiThinkingChanged(true));
    expect(state.thinking).toBe(true);

    state = aiReducer(state, aiThinkingCancelled());

    expect(state.thinking).toBe(false);
  });

  it('increments generation', () => {
    let state = aiReducer(initialState, activateAi());
    state = aiReducer(state, aiThinkingChanged(true));
    expect(state.generation).toBe(0);

    state = aiReducer(state, aiThinkingCancelled());

    expect(state.generation).toBe(1);
  });

  it('increments generation on each successive cancellation', () => {
    let state = aiReducer(initialState, activateAi());
    state = aiReducer(state, aiThinkingChanged(true));
    state = aiReducer(state, aiThinkingCancelled());
    state = aiReducer(state, aiThinkingChanged(true));
    state = aiReducer(state, aiThinkingCancelled());

    expect(state.generation).toBe(2);
    expect(state.thinking).toBe(false);
  });

  it('is a no-op for generation when thinking was already false', () => {
    // aiThinkingCancelled is safe to call even when not thinking
    const state = aiReducer(initialState, aiThinkingCancelled());

    expect(state.thinking).toBe(false);
    expect(state.generation).toBe(1);
  });
});
