import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import ConnectToPeer from './components/ConnectToPeer';
import HexGame from './components/HexGame';
import HexSettings from './components/HexSettings';
import Home from './components/Home';
import HostNetplay from './components/HostNetplay';
import './App.global.css';

export default function App() {
  return (
    <Router>
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
