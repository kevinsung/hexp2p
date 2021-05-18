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
import { Link } from 'react-router-dom';
import { selectNetplayState } from '../slices/netplaySlice';
import '../App.global.scss';

function HostCodeDisplay() {
  const { hostCode } = useSelector(selectNetplayState);
  const [copied, setCopied] = useState(false);

  const copiedStatus = copied ? 'Copied!' : 'Click to copy';

  const copyText = () => {
    if (hostCode) {
      navigator.clipboard.writeText(hostCode);
      setCopied(true);
    }
  };

  return (
    <div className="HostCodeDisplay">
      <h3>Host code</h3>
      <button className="ClickToCopy" type="button" onClick={copyText}>
        {hostCode}
      </button>
      <div>{copiedStatus}</div>
    </div>
  );
}

export default function HostNetplay() {
  return (
    <div className="HostNetplay">
      <div className="HostNetplayTopPanel">
        <Link to="/">
          <button type="button">Home</button>
        </Link>
      </div>
      <HostCodeDisplay />
      <div className="HostNetplayBottomPanel">Waiting for peer to join...</div>
    </div>
  );
}
