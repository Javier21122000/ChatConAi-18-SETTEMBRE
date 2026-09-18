import { lazy, Suspense, useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Brand, Spinner } from './components/ui';
import { useTheme } from './hooks/useTheme';
import { useSession } from './hooks/useSession';
import { demoSession } from './data/demo';

const Dashboard = lazy(() => import('./components/Dashboard'));

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { session, checking, sessionError, authenticate, logout } = useSession();
  const [demo, setDemo] = useState(false);
  if (checking) return <main className="session-loading"><Brand /><Spinner label="Verifica sessione" /></main>;
  if (!session && !demo) return <AuthScreen onAuthenticated={authenticate} onDemo={() => setDemo(true)} theme={theme} toggleTheme={toggleTheme} sessionError={sessionError} />;
  return <Suspense fallback={<main className="session-loading"><Brand /><Spinner /></main>}><Dashboard key={demo ? 'demo' : session!.userId} session={demo ? demoSession : session!} demo={demo} onLogout={() => { setDemo(false); logout(); }} theme={theme} toggleTheme={toggleTheme} /></Suspense>;
}
