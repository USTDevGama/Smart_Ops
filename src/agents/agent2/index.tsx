import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { API_MODE } from './api/client';
import Alert from './components/Alert';
import { ToastProvider, useToast } from './components/Toast';
import { bindHost, setUnauthorizedHandler } from './host/bridge';
import { useHostAuth } from './host/useHostAuth';
import Admin from './pages/Admin';
import User from './pages/User';
import './styles/tailwind.css';
import './styles/bf.css';

/**
 * Bias Flagging Agent: the mountable root of this UI. No login page, no header, no router of its own.
 *
 * The host portal owns sign-in (Zitadel) and the page chrome. This component only decides which page to show from the
 * host user's role: admins get flag management, everyone else gets the run page. The two are strictly separate, as in
 * the portal's rules. Routes are relative to wherever the host mounts this (e.g. /agents/<id>/*), and any unknown
 * path goes back to the role's page. The backend enforces roles again (401 not signed in, 403 wrong role).
 *
 * How to mount and what to replace: see ../MERGING.md.
 */
function Pages() {
  const host = useHostAuth();
  const toast = useToast();

  // Bind during render, not in an effect: child effects run first and their first API call needs the headers.
  bindHost(host);
  useEffect(() => {
    setUnauthorizedHandler(() =>
      toast('Your session has expired. Sign in again to continue.', 'error'),
    );
  }, [toast]);

  if (!host.user) return <Alert kind="warning">You are not signed in.</Alert>;

  return (
    <div className="flex flex-col gap-4">
      {API_MODE === 'mock' && (
        <Alert kind="info">Running on mock data. Nothing is sent to a server.</Alert>
      )}
      <Routes>
        <Route index element={host.user.role === 'admin' ? <Admin /> : <User />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Routes>
    </div>
  );
}

export default function BiasFlagging() {
  return (
    <div className="bf">
      <ToastProvider>
        <Pages />
      </ToastProvider>
    </div>
  );
}
