import React, { useState } from 'react';
import startNetplay from '../slices/netplayClient';
import '../App.global.css';

export default function ConnectToPeer() {
  const [hostCode, setHostCode] = useState('');

  return (
    <div>
      <form onSubmit={() => startNetplay(hostCode)}>
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
