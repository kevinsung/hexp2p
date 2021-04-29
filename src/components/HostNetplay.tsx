import React from 'react';
import { useSelector } from 'react-redux';
import { selectHostCode } from '../slices/netplaySlice';
import '../App.global.css';

function HostCodeDisplay() {
  // TODO display different message if host code not obtained
  // TODO pretty text with button to copy text
  const hostCode = useSelector(selectHostCode);
  return <div className="Hello">Host code: {hostCode}</div>;
}

export default function HostNetplay() {
  return (
    <div>
      <HostCodeDisplay />
      <div className="Hello">Waiting for peer to join...</div>
    </div>
  );
}
