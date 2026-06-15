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
import { startNetplay } from '../netplayClient';
import { selectNetplayState } from '../slices/netplaySlice';
import '../App.global.scss';

export default function ConnectToPeer() {
  const { connectionStatus, statusMessage } = useSelector(selectNetplayState);
  const [hostCode, setHostCode] = useState('');

  const connecting =
    connectionStatus === 'connecting' || connectionStatus === 'waiting';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!connecting) {
      startNetplay(hostCode);
    }
  };

  return (
    <form className="ConnectToPeer" onSubmit={handleSubmit}>
      <label htmlFor="hostCode">
        <h3>Enter host code</h3>
        <input
          type="text"
          id="hostCode"
          size={32}
          value={hostCode}
          onChange={(event) => setHostCode(event.target.value)}
          required
        />
      </label>
      <button type="submit" disabled={!hostCode || connecting}>
        {connecting ? 'Joining…' : 'Submit'}
      </button>
      {connectionStatus === 'error' && (
        <div className="ConnectError">{statusMessage}</div>
      )}
    </form>
  );
}
