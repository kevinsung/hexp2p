import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import { activateNetplay, deactivateNetplay } from '../slices/netplaySlice';
import '../App.global.scss';

export default function Home() {
  const dispatch = useDispatch();

  return (
    <div>
      <div className="Hello">
        <img width="200px" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="Hello">
        <Link to="/settings">
          <button
            type="button"
            onClick={() => {
              dispatch(deactivateNetplay());
            }}
          >
            Play local game
          </button>
        </Link>
      </div>
      <div className="Hello">
        <Link to="/settings">
          <button
            type="button"
            onClick={() => {
              dispatch(activateNetplay());
            }}
          >
            Host netplay
          </button>
        </Link>
      </div>
      <div className="Hello">
        <Link to="/connectToPeer">
          <button
            type="button"
            onClick={() => {
              dispatch(activateNetplay());
            }}
          >
            Connect to peer
          </button>
        </Link>
      </div>
    </div>
  );
}
