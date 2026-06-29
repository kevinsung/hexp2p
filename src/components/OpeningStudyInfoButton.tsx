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

interface OpeningStudyInfoButtonProps {
  visits: number;
}

export default function OpeningStudyInfoButton(
  props: OpeningStudyInfoButtonProps,
) {
  const { visits } = props;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Info
      </button>
      {open && (
        <Modal
          title="About the opening study"
          wide
          onClose={() => setOpen(false)}
        >
          <p style={{ textAlign: 'left' }}>
            Each cell represents playing there as the first move of the game.
            Its shade represents the win rate — lighter means higher probability
            of winning. Hover any cell to see the exact win rate. Win rates were
            estimated using{' '}
            <a
              href="https://github.com/hzyhhzy/KataGomo"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#99ddff' }}
            >
              KataHex
            </a>{' '}
            with {visits} visits per move.
          </p>
          <p style={{ textAlign: 'left' }}>
            The blue markers indicate fair opening moves. A small marker appears
            for moves with win rate 30–70%, and a larger marker for win rate
            40–60%. These are the best moves to play under the swap rule.
          </p>
        </Modal>
      )}
    </>
  );
}
