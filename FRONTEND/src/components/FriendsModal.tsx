import { useEffect, useRef, useState } from 'react';
import { Check, MessageCircle, Search, UserRoundPlus, Users, X } from 'lucide-react';
import { api, errorMessage } from '../services/api';
import { demoUsers } from '../data/demo';
import type { ChatState } from '../hooks/useChat';
import type { UserView } from '../types';
import { Avatar, Modal, Spinner } from './ui';

export function FriendsModal({ chat, userId, demo, onClose, onSelect, notify }: {
  chat: ChatState; userId: number; demo: boolean; onClose: () => void;
  onSelect: (user: UserView) => void; notify: (text: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserView[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const moreController = useRef<AbortController | null>(null);
  const term = query.trim();
  useEffect(() => {
    setPage(0); setResults([]); setHasNext(false); setError('');
    if (term.length < 2) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (demo) setResults(demoUsers.filter(user => user.username.includes(term.toLowerCase())));
        else {
          const result = await api.users(term, 0, controller.signal);
          if (!controller.signal.aborted) { setResults(result.items); setHasNext(result.hasNext); }
        }
      } catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); moreController.current?.abort(); };
  }, [term, demo]);

  async function loadMore() {
    if (loading) return;
    const controller = new AbortController(); moreController.current = controller;
    setLoading(true); setError('');
    try {
      const result = await api.users(term, page + 1, controller.signal);
      if (!controller.signal.aborted) { setResults(previous => [...previous, ...result.items]); setPage(result.page); setHasNext(result.hasNext); }
    } catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  const pending = chat.friendships.filter(f => f.status === 'PENDING');
  const accepted = chat.friendships.filter(f => f.status === 'ACCEPTED');
  const getPeer = (f: typeof pending[number]) => f.requester.id === userId ? f.recipient : f.requester;
  const people = tab === 'search' ? results : (tab === 'requests' ? pending : accepted).map(getPeer);
  async function action(user: UserView, type: 'request' | 'accept' | 'reject') {
    if (busy !== null) return;
    setBusy(user.id);
    try {
      if (type === 'request') await chat.request(user);
      else {
        const relation = chat.friendships.find(f => f.requester.id === user.id || f.recipient.id === user.id)!;
        await chat.respond(relation.id, type);
      }
    } catch (err) { notify(errorMessage(err), 'error'); }
    finally { setBusy(null); }
  }
  return <Modal title="Le tue persone" onClose={onClose} wide>
    <p className="modal-description">Trova un amico. Il resto viene da sé.</p>
    <div className="modal-tabs" role="tablist" aria-label="Gestione amici">{[{ id: 'search', label: 'Cerca' }, { id: 'requests', label: `Richieste${pending.length ? ` (${pending.length})` : ''}` }, { id: 'friends', label: 'Amici' }].map((item, index, tabs) => <button role="tab" id={`tab-${item.id}`} aria-controls="friends-panel" aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)} onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; setTab(next.id); document.getElementById(`tab-${next.id}`)?.focus(); }
    }}>{item.label}</button>)}</div>
    <div id="friends-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {tab === 'search' && <label className="search-field modal-search"><Search size={18} /><input autoFocus placeholder="Cerca per username" value={query} onChange={event => setQuery(event.target.value)} maxLength={30} aria-label="Cerca utenti per username" />{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="Cancella ricerca"><X size={16} /></button>}</label>}
      <div className="friends-results">
        {tab === 'search' && term.length < 2 && <div className="list-state"><Search size={28} strokeWidth={1.5} /><strong>Chi stai cercando?</strong><span>Scrivi almeno 2 caratteri del suo username.</span></div>}
        {error && tab === 'search' && <p className="form-error" role="alert">{error}</p>}
        {loading && <div className="list-state"><Spinner /><span>Ricerca in corso…</span></div>}
        {!loading && !error && people.length === 0 && (tab !== 'search' || term.length >= 2) && <div className="list-state"><Users size={28} strokeWidth={1.5} /><strong>{tab === 'search' ? 'Nessun utente trovato' : tab === 'requests' ? 'Nessuna richiesta in attesa' : 'Le amicizie iniziano qui'}</strong><span>{tab === 'search' ? 'Prova un altro username.' : tab === 'requests' ? 'Le nuove richieste compariranno qui.' : 'Cerca un utente e inviagli una richiesta.'}</span></div>}
        {people.map(user => {
          const relationship = chat.friendships.find(f => f.requester.id === user.id || f.recipient.id === user.id);
          const incoming = relationship?.status === 'PENDING' && relationship.recipient.id === userId;
          return <div className="friend-row" key={user.id}><Avatar user={user} /><span className="friend-name"><strong>{user.username}</strong><small>{relationship?.status === 'ACCEPTED' ? 'Amici su TxTr' : incoming ? 'Ti ha inviato una richiesta' : relationship?.status === 'PENDING' ? 'Richiesta inviata' : 'Su TxTr'}</small></span>
            {busy === user.id ? <Spinner /> : relationship?.status === 'ACCEPTED' ? <button className="icon-button filled" onClick={() => { onSelect(user); onClose(); }} aria-label={`Apri chat con ${user.username}`}><MessageCircle size={19} /></button> : incoming ? <div className="flex gap-1"><button className="icon-button" disabled={busy !== null} onClick={() => void action(user, 'reject')} aria-label={`Rifiuta richiesta di ${user.username}`} title="Rifiuta"><X size={19} /></button><button className="icon-button filled" disabled={busy !== null} onClick={() => void action(user, 'accept')} aria-label={`Accetta richiesta di ${user.username}`} title="Accetta"><Check size={19} /></button></div> : relationship?.status === 'PENDING' ? <button className="text-button muted" onClick={() => { onSelect(user); onClose(); }}>In attesa</button> : <button className="icon-button filled" disabled={busy !== null} onClick={() => void action(user, 'request')} aria-label={`Invia richiesta a ${user.username}`} title="Aggiungi amico"><UserRoundPlus size={19} /></button>}
          </div>;
        })}
        {tab === 'search' && hasNext && <button className="load-history" disabled={loading} onClick={() => void loadMore()}>Mostra altri utenti</button>}
      </div>
    </div>
    <div className="modal-footnote">La chat si apre quando la richiesta viene accettata.</div>
  </Modal>;
}
