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
import { Provider } from 'react-redux';
import { Router, Switch, Route } from 'react-router-dom';
import ConnectToPeer from './components/ConnectToPeer';
import HexGame from './components/HexGame';
import HexSettings from './components/HexSettings';
import Home from './components/Home';
import HostNetplay from './components/HostNetplay';
import { stopNetplay } from './netplayClient';
import { resetGameState } from './slices/gameSlice';
import { deactivateNetplay } from './slices/netplaySlice';
import { history, store } from './store';
import './App.global.scss';

// eslint-disable-next-line consistent-return
history.block((_location, action) => {
  // disable "back" navigation
  if (action === 'POP') {
    return false;
  }
});

history.listen((location) => {
  if (location.pathname === '/') {
    stopNetplay();
    store.dispatch(deactivateNetplay());
    store.dispatch(resetGameState());
  }
});

export default function App() {
  return (
    <Provider store={store}>
      <Router history={history}>
        <Switch>
          <Route path="/game" component={HexGame} />
          <Route path="/settings" component={HexSettings} />
          <Route path="/hostNetplay" component={HostNetplay} />
          <Route path="/connectToPeer" component={ConnectToPeer} />
          <Route path="/" component={Home} />
        </Switch>
      </Router>
    </Provider>
  );
}
