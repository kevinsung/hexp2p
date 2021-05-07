import React from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import { activateNetplay, deactivateNetplay } from '../slices/netplaySlice';
import '../App.global.scss';

export default function Home() {
  const dispatch = useDispatch();

  return (
    <div className="Home">
      <div>
        <img width="240px" alt="icon" src={icon} />
      </div>
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
  );
}
