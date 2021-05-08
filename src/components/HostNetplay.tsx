import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectNetplayState } from '../slices/netplaySlice';
import '../App.global.scss';

function HostCodeDisplay() {
  const { hostCode } = useSelector(selectNetplayState);
  const [copied, setCopied] = useState(false);

  const copiedStatus = copied ? 'Copied!' : 'Click to copy';

  const copyText = () => {
    if (hostCode) {
      navigator.clipboard.writeText(hostCode);
      setCopied(true);
    }
  };

  return (
    <div className="HostCodeDisplay">
      <h3>Host code</h3>
      <button className="ClickToCopy" type="button" onClick={copyText}>
        {hostCode}
      </button>
      <div>{copiedStatus}</div>
    </div>
  );
}

export default function HostNetplay() {
  return (
    <div className="HostNetplay">
      <div className="HostNetplayTopPanel">
        <Link to="/">
          <button type="button">Home</button>
        </Link>
      </div>
      <HostCodeDisplay />
      <div className="HostNetplayBottomPanel">Waiting for peer to join...</div>
    </div>
  );
}
