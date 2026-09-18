import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage, setAccessToken } from '../services/api';
import { readStorage, writeStorage } from '../lib/storage';
import type { AuthResponse, Session } from '../types';

function restoreSession() {
  const session = readStorage<Session | null>(sessionStorage, 'txtr-session', null);
  if (!session || !session.accessToken || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) return null;
  setAccessToken(session.accessToken);
  return session;
}
export function useSession() {
  const [session, setSession] = useState(restoreSession);
  const [sessionError, setSessionError] = useState('');
  const [checking, setChecking] = useState(!!session);
  const logout = useCallback(() => {
    setAccessToken();
    try { sessionStorage.removeItem('txtr-session'); } catch { /* Session still closes in memory. */ }
    setSession(null);
    setChecking(false);
  }, []);
  function authenticate(response: AuthResponse) {
    const value = { ...response, expiresAt: Date.now() + response.expiresIn * 1000 };
    setAccessToken(value.accessToken);
    writeStorage(sessionStorage, 'txtr-session', value);
    setSessionError('');
    setSession(value);
  }
  useEffect(() => {
    if (!session) return;
    const expire = () => { logout(); setSessionError('La sessione è scaduta. Accedi di nuovo.'); };
    const timer = window.setTimeout(expire, Math.min(session.expiresAt - Date.now(), 2147483647));
    window.addEventListener('txtr:session-expired', expire);
    return () => { clearTimeout(timer); window.removeEventListener('txtr:session-expired', expire); };
  }, [session, logout]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    api.me().catch(error => {
      if (active) { setSessionError(errorMessage(error)); logout(); }
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [session, logout]);
  return { session, sessionError, checking, authenticate, logout };
}
