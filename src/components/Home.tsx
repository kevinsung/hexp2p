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

import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import { activateNetplay, deactivateNetplay } from '../slices/netplaySlice';
import '../App.global.scss';

export default function Home() {
  const dispatch = useDispatch();

  return (
    <div className="Home">
      <div>
        <img width="240px" alt="icon" src={icon} />
      </div>
      <Link to="/settings">
        <button
          type="button"
          onClick={() => {
            dispatch(deactivateNetplay());
          }}
        >
          Play local game
        </button>
      </Link>
      <Link to="/settings">
        <button
          type="button"
          onClick={() => {
            dispatch(activateNetplay());
          }}
        >
          Host netplay
        </button>
      </Link>
      <Link to="/connectToPeer">
        <button
          type="button"
          onClick={() => {
            dispatch(activateNetplay());
          }}
        >
          Connect to peer
        </button>
      </Link>
    </div>
  );
}
