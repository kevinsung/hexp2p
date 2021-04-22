import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import './App.global.css';
import HexGame from './components/HexGame';
import HexSettings from './components/HexSettings';
import Home from './components/Home';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route path="/hexGame" component={HexGame} />
        <Route path="/hexSettings" component={HexSettings} />
        <Route path="/" component={Home} />
      </Switch>
    </Router>
  );
}
