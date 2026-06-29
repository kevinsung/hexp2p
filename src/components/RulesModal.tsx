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

interface RulesButtonProps {
  transparent?: boolean;
}

export default function RulesButton(props: RulesButtonProps) {
  const { transparent = false } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Rules
      </button>
      {open && (
        <Modal
          title="How to Play Hex"
          wide
          transparent={transparent}
          onClose={() => setOpen(false)}
        >
          <p>
            Hex is played on a rhombus of hexagons. Each player owns the two
            opposite board edges drawn in their color, and wins by linking their
            pair of edges with an unbroken chain of their own stones. Players
            alternate placing one stone on any empty hexagon, and Black moves
            first.
          </p>
          <p>
            <strong>Swap rule:</strong> When enabled, the second player may
            respond to the opening move by swapping instead of playing normally,
            claiming that first stone as their own. This offsets the advantage
            of moving first, discouraging an overpowering opening move.
          </p>
        </Modal>
      )}
    </>
  );
}

RulesButton.defaultProps = {
  transparent: false,
};
