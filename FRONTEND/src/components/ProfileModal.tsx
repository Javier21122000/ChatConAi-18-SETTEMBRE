import { useEffect, useState } from 'react';
import { Check, Download, LogOut, Mail, Moon, Sun } from 'lucide-react';
import { api, errorMessage } from '../services/api';
import type { Session, StatisticsResponse } from '../types';
import type { ChatState } from '../hooks/useChat';
import { Avatar, Modal, Spinner } from './ui';

export function ProfileModal({ session, chat, demo, onClose, onLogout, theme, toggleTheme, notify }: {
  session: Session; chat: ChatState; demo: boolean; onClose: () => void; onLogout: () => void;
  theme: string; toggleTheme: () => void; notify: (text: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const [stats, setStats] = useState<StatisticsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    if (demo) {
      const messages = Object.values(chat.messages).flat();
      setStats({ sentMessages: messages.filter(m => m.senderId === session.userId).length,
        receivedMessages: messages.filter(m => m.recipientId === session.userId).length,
        openChats: Object.keys(chat.messages).length, generatedAt: new Date().toISOString() });
      setLoading(false);
    } else api.statistics().then(result => { if (active) setStats(result); })
      .catch(err => { if (active) setError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [demo, session.userId, chat.messages, retry]);
  async function sendStatistics() {
    if (sending) return;
    if (demo) { notify('Nella demo non vengono inviate email. Accedi per ricevere le tue statistiche.', 'info'); return; }
    setSending(true); setSent(false);
    try { setStats(await api.emailStatistics()); setSent(true); notify('Statistiche inviate all’email del tuo account.', 'success'); }
    catch (err) { notify(errorMessage(err), 'error'); }
    finally { setSending(false); }
  }
  return <Modal title="Il tuo profilo" onClose={onClose}>
    <div className="profile-identity"><Avatar user={{ id: session.userId, username: session.username }} size="lg" /><h3>{session.username}</h3><span className="status-pill">{demo ? 'Account dimostrativo' : 'Il tuo spazio su TxTr'}</span></div>
    <div className="profile-statistics"><h4>Le tue conversazioni</h4>{loading ? <div className="list-state"><Spinner /></div> : error ? <p className="form-error" role="alert">{error} <button className="text-button" onClick={() => setRetry(retry + 1)}>Riprova</button></p> : <div className="stats-grid"><div><strong>{stats?.sentMessages ?? 0}</strong><span>Inviati</span></div><div><strong>{stats?.receivedMessages ?? 0}</strong><span>Ricevuti</span></div><div><strong>{stats?.openChats ?? 0}</strong><span>Chat aperte</span></div></div>}
      <button className={`button button-secondary download-statistics ${sent ? 'success' : ''}`} onClick={() => void sendStatistics()} disabled={sending || sent}>{sending ? <Spinner /> : sent ? <Check size={18} /> : <Download size={18} />}{sending ? 'Invio in corso…' : sent ? 'Statistiche inviate' : 'Scarica statistiche'}</button><p className="statistics-caption"><Mail size={13} />Le riceverai all’indirizzo email del tuo account.</p>
    </div>
    <button className="profile-setting" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'} aria-label="Tema scuro"><span>{theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}Tema scuro</span><span className={`switch ${theme === 'dark' ? 'on' : ''}`}><span /></span></button>
    <button className="logout-button" onClick={onLogout}><LogOut size={18} />{demo ? 'Esci dalla demo' : 'Esci dal tuo account'}</button>
  </Modal>;
}
