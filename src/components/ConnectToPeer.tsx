import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { startNetplay } from '../netplayClient';
import { hostCodeSubmitted } from '../slices/netplaySlice';
import '../App.global.scss';

export default function ConnectToPeer() {
  const dispatch = useDispatch();
  const [hostCode, setHostCode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitted) {
      setSubmitted(true);
      dispatch(hostCodeSubmitted());
      startNetplay(hostCode);
      setTimeout(() => setSubmitted(false), 2000);
    }
  };

  return (
    <div className="ConnectToPeer">
      <div className="ConnectToPeerTopPanel">
        <Link to="/">
          <button type="button">Home</button>
        </Link>
      </div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="hostCode">
          <h3>Enter host code</h3>
          <input
            type="text"
            id="hostCode"
            size={32}
            value={hostCode}
            onChange={(event) => setHostCode(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={!hostCode}>
          Submit
        </button>
      </form>
    </div>
  );
}
