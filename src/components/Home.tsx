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
import { useDispatch } from 'react-redux';
import icon from '../../assets/icon.svg';
import { stopNetplay } from '../netplayClient';
import { resetGameState } from '../slices/gameSlice';
import { activateNetplay, deactivateNetplay } from '../slices/netplaySlice';
import ConnectToPeer from './ConnectToPeer';
import HexSettings from './HexSettings';
import HostNetplay from './HostNetplay';
import Modal from './Modal';
import RulesButton from './RulesModal';
import '../App.global.scss';

type SetupModal = 'settings' | 'connect' | 'host' | null;

export default function Home() {
  const dispatch = useDispatch();
  const [modal, setModal] = useState<SetupModal>(null);

  const closeSetup = () => {
    stopNetplay();
    dispatch(deactivateNetplay());
    dispatch(resetGameState());
    setModal(null);
  };

  return (
    <div className="Home">
      <div>
        <img width="240px" alt="icon" src={icon} />
      </div>
      <button
        type="button"
        onClick={() => {
          dispatch(deactivateNetplay());
          setModal('settings');
        }}
      >
        Play local game
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch(activateNetplay());
          setModal('settings');
        }}
      >
        Host netplay
      </button>
      <button
        type="button"
        onClick={() => {
          dispatch(activateNetplay());
          setModal('connect');
        }}
      >
        Connect to peer
      </button>
      <RulesButton />
      {modal === 'settings' && (
        <Modal title="Settings" onClose={closeSetup}>
          <HexSettings onStartHosting={() => setModal('host')} />
        </Modal>
      )}
      {modal === 'connect' && (
        <Modal title="Connect to peer" onClose={closeSetup}>
          <ConnectToPeer />
        </Modal>
      )}
      {modal === 'host' && (
        <Modal title="Host netplay" wide onClose={closeSetup}>
          <HostNetplay />
        </Modal>
      )}
    </div>
  );
}
