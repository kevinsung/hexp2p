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
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { startNetplay } from '../netplayClient';
import {
  hostCodeSubmitted,
  hostCodeSubmissionTimedOut,
  selectNetplayState,
} from '../slices/netplaySlice';
import '../App.global.scss';

export default function ConnectToPeer() {
  const dispatch = useDispatch();
  const { hostCodeSubmitted: submitted } = useSelector(selectNetplayState);
  const [hostCode, setHostCode] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitted) {
      dispatch(hostCodeSubmitted());
      startNetplay(hostCode);
      setTimeout(() => dispatch(hostCodeSubmissionTimedOut()), 2000);
    }
  };

  return (
    <div className="ConnectToPeer">
      <div className="ConnectToPeerTopPanel">
        <Link to="/" tabIndex={-1}>
          <button type="button">Home</button>
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
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
        <button type="submit" disabled={!hostCode}>
          Submit
        </button>
      </form>
    </div>
  );
}
