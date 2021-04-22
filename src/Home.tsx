import React from 'react';
import { Link } from 'react-router-dom';
import icon from '../assets/icon.svg';
import './App.global.css';

export default function Home() {
  return (
    <div>
      <div className="Hello">
        <img width="200px" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        <Link to="/hexSettings">
          <button type="button">Play Hex</button>
        </Link>
      </div>
    </div>
  );
}
