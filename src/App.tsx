import React from 'react';
import { Router, Switch, Route } from 'react-router-dom';
import ConnectToPeer from './components/ConnectToPeer';
import HexGame from './components/HexGame';
import HexSettings from './components/HexSettings';
import Home from './components/Home';
import HostNetplay from './components/HostNetplay';
import { stopNetplay } from './slices/netplayClient';
import { history } from './store';
import './App.global.css';

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
  }
});

export default function App() {
  return (
    <Router history={history}>
      <Switch>
        <Route path="/game" component={HexGame} />
        <Route path="/settings" component={HexSettings} />
        <Route path="/hostNetplay" component={HostNetplay} />
        <Route path="/connectToPeer" component={ConnectToPeer} />
        <Route path="/" component={Home} />
      </Switch>
    </Router>
  );
}
