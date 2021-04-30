import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectHostCode } from '../slices/netplaySlice';
import '../App.global.css';

function HostCodeDisplay() {
  // TODO display different message if host code not obtained
  const hostCode = useSelector(selectHostCode);
  const [copied, setCopied] = useState(false);

  const copiedStatus = copied ? '(Copied!)' : '(Click to copy)';

  const copyText = () => {
    if (hostCode) {
      navigator.clipboard.writeText(hostCode);
      setCopied(true);
    }
  };

  return (
    <div className="Hello">
      <div>Host code</div>
      <div>{copiedStatus}</div>
      <button className="ClickToCopy" type="button" onClick={copyText}>
        {hostCode}
      </button>
    </div>
  );
}

export default function HostNetplay() {
  return (
    <div>
      <Link to="/home">Home</Link>
      <HostCodeDisplay />
      <div className="Hello">Waiting for peer to join...</div>
    </div>
  );
}
