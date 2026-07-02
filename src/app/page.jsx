"use client";

import App from '../App';
import LoginGate from '../components/LoginGate';

export default function Page() {
  return (
    <LoginGate>
      <App />
    </LoginGate>
  );
}
