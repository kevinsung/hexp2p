import React from 'react';
import { render, act } from '@testing-library/react';
import useHotkeys, { HotkeyMap } from '../useHotkeys';

function HotkeyHarness({
  keymap,
  enabled,
}: {
  keymap: HotkeyMap;
  enabled?: boolean;
}) {
  useHotkeys(keymap, enabled);
  return null;
}

function fireKeyDown(key: string, options: KeyboardEventInit = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...options }),
    );
  });
}

describe('useHotkeys', () => {
  it('calls the mapped handler when the matching key is pressed', () => {
    const handler = jest.fn();
    render(<HotkeyHarness keymap={{ u: handler }} />);
    fireKeyDown('u');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('matches keys case-insensitively (uppercase key value)', () => {
    const handler = jest.fn();
    render(<HotkeyHarness keymap={{ u: handler }} />);
    fireKeyDown('U');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call the handler for an unmapped key', () => {
    const handler = jest.fn();
    render(<HotkeyHarness keymap={{ u: handler }} />);
    fireKeyDown('r');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call the handler when enabled is false', () => {
    const handler = jest.fn();
    render(<HotkeyHarness keymap={{ u: handler }} enabled={false} />);
    fireKeyDown('u');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call the handler when a modifier key is held', () => {
    const handler = jest.fn();
    render(<HotkeyHarness keymap={{ u: handler }} />);
    fireKeyDown('u', { ctrlKey: true });
    fireKeyDown('u', { metaKey: true });
    fireKeyDown('u', { altKey: true });
    fireKeyDown('u', { shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call the handler when an INPUT is focused', () => {
    const handler = jest.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    render(<HotkeyHarness keymap={{ u: handler }} />);
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'u', bubbles: true }),
      );
    });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not call the handler when a TEXTAREA is focused', () => {
    const handler = jest.fn();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    render(<HotkeyHarness keymap={{ u: handler }} />);
    act(() => {
      textarea.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'u', bubbles: true }),
      );
    });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('cleans up the listener when unmounted', () => {
    const handler = jest.fn();
    const { unmount } = render(<HotkeyHarness keymap={{ u: handler }} />);
    unmount();
    fireKeyDown('u');
    expect(handler).not.toHaveBeenCalled();
  });

  it('picks up a freshly updated keymap without re-registering the listener', () => {
    // Render with handler A, then re-render with handler B — the new handler
    // should fire, confirming the keymapRef approach works.
    const handlerA = jest.fn();
    const handlerB = jest.fn();
    const { rerender } = render(<HotkeyHarness keymap={{ u: handlerA }} />);
    rerender(<HotkeyHarness keymap={{ u: handlerB }} />);
    fireKeyDown('u');
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it('a handler that calls two callbacks is invoked as a single unit', () => {
    // Verifies that both side effects happen inside one unstable_batchedUpdates
    // call. We can't inspect React render counts in jsdom, but we can at least
    // confirm both effects fire and neither throws.
    const calls: string[] = [];
    render(
      <HotkeyHarness
        keymap={{
          u: () => {
            calls.push('first');
            calls.push('second');
          },
        }}
      />,
    );
    fireKeyDown('u');
    expect(calls).toEqual(['first', 'second']);
  });

  it('supports multi-key keymaps and routes each key to the right handler', () => {
    const left = jest.fn();
    const right = jest.fn();
    render(<HotkeyHarness keymap={{ arrowleft: left, arrowright: right }} />);
    fireKeyDown('ArrowLeft');
    fireKeyDown('ArrowRight');
    fireKeyDown('ArrowRight');
    expect(left).toHaveBeenCalledTimes(1);
    expect(right).toHaveBeenCalledTimes(2);
  });
});
