import React from 'react';
import { Link } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import startNetplay from '../slices/netplayClient';
import '../App.global.css';

export default function Home() {
  return (
    <div>
      <div className="Hello">
        <img width="200px" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        <Link to="/settings">
          <button type="button">Play local game</button>
        </Link>
      </div>
      <div className="Hello">
        <Link to="/hostNetplay">
          <button type="button" onClick={() => startNetplay()}>
            Host netplay
          </button>
        </Link>
      </div>
      <div className="Hello">
        <Link to="/connectToPeer">
          <button type="button">Connect to peer</button>
        </Link>
      </div>
    </div>
  );
}
