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

history.listen((location) => {
  console.log(
    `The current URL is ${location.pathname}${location.search}${location.hash}`
  );
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
