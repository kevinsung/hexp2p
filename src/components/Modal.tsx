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

import React, { useEffect } from 'react';
import classnames from 'classnames';
import '../App.global.scss';

interface ModalProps {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal(props: ModalProps) {
  const { title, wide = false, onClose, children } = props;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="ModalBackdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={classnames('Modal', { ModalWide: wide })}>
        <button
          type="button"
          className="ModalClose"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

Modal.defaultProps = {
  wide: false,
};
