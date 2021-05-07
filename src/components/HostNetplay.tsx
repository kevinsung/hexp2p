import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { selectNetplayState } from '../slices/netplaySlice';
import '../App.global.scss';

function HostCodeDisplay() {
  // TODO display different message if host code not obtained
  const { hostCode } = useSelector(selectNetplayState);
  const [copied, setCopied] = useState(false);

  const copiedStatus = copied ? '(Copied!)' : '(Click to copy)';

  const copyText = () => {
    if (hostCode) {
      navigator.clipboard.writeText(hostCode);
      setCopied(true);
    }
  };

  return (
    <div>
      <div>Host code {copiedStatus}</div>
      <button className="ClickToCopy" type="button" onClick={copyText}>
        {hostCode}
      </button>
    </div>
  );
}

export default function HostNetplay() {
  return (
    <div className="HostNetplay">
      <div className="HomeButtonTopPanel">
        <Link to="/">
          <button type="button">Home</button>
        </Link>
      </div>
      <div>
        <HostCodeDisplay />
        <div>Waiting for peer to join...</div>
      </div>
    </div>
  );
}
