import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Eye, EyeOff, MessageCircle, Sparkles } from 'lucide-react';
import { api, errorMessage } from '../services/api';
import type { AuthResponse } from '../types';
import { Avatar, Brand, Spinner, ThemeToggle } from './ui';

export function AuthScreen({ onAuthenticated, onDemo, theme, toggleTheme, sessionError }: {
  onAuthenticated: (response: AuthResponse) => void; onDemo: () => void;
  theme: string; toggleTheme: () => void; sessionError: string;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    if (new TextEncoder().encode(password).length > 72) { setError('La password deve occupare al massimo 72 byte UTF-8.'); return; }
    setBusy(true); setError('');
    try {
      const result = mode === 'login' ? await api.login({ email, password }) :
        await api.register({ username: String(form.get('username')).trim(), email, password });
      onAuthenticated(result);
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }
  return <main className="auth-layout">
    <section className="auth-story" aria-label="Benvenuto su TxTr">
      <Brand /><div className="story-main"><span className="eyebrow">MENO RUMORE. PIÙ CONVERSAZIONI.</span>
        <h1>Le persone giuste.<br />Le tue parole.</h1>
        <p>Uno spazio per ritrovarsi, un messaggio alla volta.</p>
        <div className="auth-conversation" aria-label="Anteprima della chat">
          <div className="preview-person"><Avatar user={{ id: 2, username: 'sofia' }} /><div><strong>Sofia</strong><span>Un’anteprima di TxTr</span></div><MessageCircle size={20} /></div>
          <div className="preview-bubble incoming">Un caffè e due chiacchiere? ☕</div>
          <div className="preview-bubble outgoing">Il programma perfetto. Quando?</div>
          <div className="preview-bubble incoming">Adesso, se ti va.</div>
          <div className="preview-assist"><Sparkles size={16} /><span>A volte basta una parola per iniziare.</span></div>
        </div>
      </div><span className="story-footer">Fatto per sentirsi vicini.</span>
    </section>
    <section className="auth-form-side">
      <header className="auth-top"><span className="mobile-brand"><Brand /></span><ThemeToggle theme={theme} onToggle={toggleTheme} /></header>
      <div className="auth-form-wrap"><span className="eyebrow">IL TUO SPAZIO, LE TUE PERSONE</span>
        <AnimatePresence mode="wait"><motion.div key={mode} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.18 }}>
          <h2>{mode === 'login' ? 'Bello ritrovarti.' : 'Piacere di conoscerti.'}</h2>
          <p className="auth-description">{mode === 'login' ? 'Accedi e riprendi da dove eri rimasto.' : 'Crea il tuo account. La prima conversazione ti aspetta.'}</p>
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <label className="field-label">Username<input name="username" placeholder="Il tuo nome su TxTr" autoComplete="username" pattern="[a-zA-Z0-9_]{3,30}" title="Da 3 a 30 lettere, numeri o underscore" minLength={3} maxLength={30} required disabled={busy} /><span className="field-hint">3–30 lettere, numeri o underscore.</span></label>}
            <label className="field-label">Email<input name="email" type="email" placeholder="nome@esempio.it" autoComplete="email" maxLength={254} required disabled={busy} /></label>
            <label className="field-label">Password<div className="password-field"><input name="password" type={visiblePassword ? 'text' : 'password'} placeholder={mode === 'register' ? 'Almeno 8 caratteri' : 'La tua password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : 1} maxLength={72} required disabled={busy} /><button type="button" className="icon-button" onClick={() => setVisiblePassword(!visiblePassword)} aria-label={visiblePassword ? 'Nascondi password' : 'Mostra password'}>{visiblePassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {(error || sessionError) && <p className="form-error" role="alert">{error || sessionError}</p>}
            <button className="button button-primary auth-submit" disabled={busy}>{busy ? <Spinner /> : <>{mode === 'login' ? 'Accedi' : 'Crea account'}<ArrowRight size={18} /></>}</button>
          </form>
        </motion.div></AnimatePresence>
        <p className="auth-switch">{mode === 'login' ? 'Non hai ancora un account?' : 'Hai già un account?'} <button disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Registrati' : 'Accedi'}</button></p>
        <div className="auth-demo"><button onClick={onDemo}>Dai un’occhiata alla demo <ArrowUpRight size={16} /></button><span>Esplora l’interfaccia con conversazioni di esempio.</span></div>
      </div><footer className="auth-footer">TxTr <span>Uno spazio per le tue conversazioni.</span></footer>
    </section>
  </main>;
}
