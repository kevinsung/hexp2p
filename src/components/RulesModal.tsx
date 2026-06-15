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
import Modal from './Modal';
import '../App.global.scss';

export default function RulesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Rules
      </button>
      {open && (
        <Modal title="How to Play Hex" wide onClose={() => setOpen(false)}>
          <p>
            <strong>Goal:</strong> Be the first to link your two sides of the
            board with an unbroken chain of your stones.
          </p>
          <p>
            <strong>Sides:</strong> Black connects the top and bottom edges.
            White connects the left and right edges.
          </p>
          <p>
            <strong>Play:</strong> Players alternate turns, placing one stone on
            any empty hexagon. Black moves first.
          </p>
          <p>
            <strong>Winning:</strong> The first player to complete a connected
            path between their two edges wins. Hex can never end in a draw -
            exactly one player wins.
          </p>
          <p>
            <strong>Swap rule:</strong> When enabled, after the first move the
            second player may either play normally or swap, taking the opening
            move as their own. This offsets the first-player advantage.
          </p>
        </Modal>
      )}
    </>
  );
}
