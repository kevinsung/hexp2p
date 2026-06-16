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

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectNetplayState } from '../slices/netplaySlice';
import '../App.global.scss';

// navigator.clipboard is only available in secure contexts (HTTPS or
// localhost), so fall back to the older execCommand-based copy when serving
// the dev build over plain HTTP to another device.
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand('copy');
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

function HostCodeDisplay() {
  const { hostCode } = useSelector(selectNetplayState);
  const [copyStatus, setCopyStatus] = useState('Click to copy');

  const copyText = async () => {
    if (!hostCode) {
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(hostCode);
        setCopyStatus('Copied!');
        return;
      } catch {
        // fall through to legacy copy
      }
    }
    if (legacyCopy(hostCode)) {
      setCopyStatus('Copied!');
    } else {
      setCopyStatus('Could not copy automatically - select the code above');
    }
  };

  return (
    <div className="HostCodeDisplay">
      <h3>Host code</h3>
      <button className="ClickToCopy" type="button" onClick={copyText}>
        {hostCode}
      </button>
      <div>{copyStatus}</div>
    </div>
  );
}

function WaitingMessage() {
  return (
    <div className="HostNetplayBottomPanel">Waiting for peer to join...</div>
  );
}

export default function HostNetplay() {
  return (
    <div className="HostNetplay">
      <HostCodeDisplay />
      <WaitingMessage />
    </div>
  );
}
