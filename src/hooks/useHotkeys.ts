// Copyright (C) 2021 Kevin J. Sung
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// Registers keyboard shortcuts via a native keydown listener and wraps each
// handler in unstable_batchedUpdates so that multi-dispatch handlers behave
// identically to onClick (React synthetic events are auto-batched in React 17;
// native listeners are not, so without this wrapper each dispatch triggers a
// separate render).
//
// keymap keys must be lowercased event.key values (e.g. 'u', 'arrowleft').
// The listener is re-registered only when `enabled` changes, not on every
// render, because the keymap is held in a ref that is updated each render.

import { useEffect, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';

export type HotkeyMap = Record<string, () => void>;

// Returns false if a modifier key is held or the event target is a form field,
// so shortcuts don't fire while typing.
function isHotkeyEvent(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }
  const { target } = event;
  if (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
  ) {
    return false;
  }
  return true;
}

export default function useHotkeys(keymap: HotkeyMap, enabled = true): void {
  const keymapRef = useRef(keymap);
  keymapRef.current = keymap;

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isHotkeyEvent(event)) return;
      const handler = keymapRef.current[event.key.toLowerCase()];
      if (handler) {
        event.preventDefault();
        // Wrap in unstable_batchedUpdates so that a handler dispatching
        // multiple actions produces one render, matching the behaviour of
        // a React onClick handler.
        unstable_batchedUpdates(handler);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
