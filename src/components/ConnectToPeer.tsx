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
    }
  };

  return (
    <div>
      <Link to="/home">Home</Link>
      <form onSubmit={handleSubmit}>
        <label htmlFor="hostCode">
          Enter host code
          <input
            type="text"
            id="hostCode"
            value={hostCode}
            onChange={(event) => setHostCode(event.target.value)}
            required
          />
        </label>
        <div className="Hello">
          <button type="submit" disabled={!hostCode}>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
