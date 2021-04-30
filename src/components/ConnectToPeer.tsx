import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import startNetplay from '../slices/netplayClient';
import '../App.global.css';

export default function ConnectToPeer() {
  const [hostCode, setHostCode] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startNetplay(hostCode);
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
