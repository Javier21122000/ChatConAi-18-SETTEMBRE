import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Info, LockKeyhole, MessageCircle, UserRoundPlus, WifiOff } from 'lucide-react';
import type { ChatState } from '../hooks/useChat';
import type { Session } from '../types';
import { dayLabel, timeLabel } from '../lib/messages';
import { errorMessage } from '../services/api';
import { Avatar, Modal, Spinner } from './ui';
import { Composer } from './Composer';

export function Conversation({ chat, session, demo, onBack, onFriends, drafts, setDraft, notify }: {
  chat: ChatState; session: Session; demo: boolean; onBack: () => void; onFriends: () => void;
  drafts: Record<number, string>; setDraft: (id: number, value: string) => void;
  notify: (text: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const previous = useRef({ id: 0, lastId: 0, firstId: 0, height: 0 });
  const reducedMotion = useReducedMotion();
  const user = chat.selected;
  const messages = user ? chat.messages[user.id] || [] : [];
  const lastId = messages.at(-1)?.id || 0;
  const firstId = messages[0]?.id || 0;
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element || !user) return;
    const old = previous.current;
    const switched = old.id !== user.id;
    const wasNearBottom = old.height - element.scrollTop - element.clientHeight < 140;
    if (switched || old.lastId === 0) {
      element.scrollTop = element.scrollHeight; setNewMessages(false);
    } else if (old.lastId !== lastId) {
      if (wasNearBottom || messages.at(-1)?.senderId === session.userId) element.scrollTo({ top: element.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' });
      else setNewMessages(true);
    } else if (old.firstId !== firstId) {
      element.scrollTop += element.scrollHeight - old.height;
    }
    previous.current = { id: user.id, lastId, firstId, height: element.scrollHeight };
  }, [user, lastId, firstId, messages, session.userId, reducedMotion]);

  if (!user) return <section className="conversation conversation-empty"><span className="empty-icon"><MessageCircle size={35} strokeWidth={1.4} /></span><span className="eyebrow">LE TUE CONVERSAZIONI, QUI.</span><h2>Fai spazio a un ciao.</h2><p>Scegli una chat o ritrova i tuoi amici.<br />Ogni bella conversazione comincia così.</p><button className="button button-primary" onClick={onFriends}><UserRoundPlus size={18} />Trova un amico</button></section>;

  const incomingRequest = chat.selectedFriendship?.status === 'PENDING' && chat.selectedFriendship.recipient.id === session.userId;
  async function friendshipAction(action: 'request' | 'accept' | 'reject') {
    if (!user || busy) return;
    setBusy(true);
    try {
      if (action === 'request') await chat.request(user);
      else await chat.respond(chat.selectedFriendship!.id, action);
    } catch (err) { notify(errorMessage(err), 'error'); }
    finally { setBusy(false); }
  }
  return <section className="conversation" aria-label={`Conversazione con ${user.username}`}>
    <header className="conversation-header"><button className="icon-button mobile-back" onClick={onBack} aria-label="Torna alle conversazioni"><ArrowLeft size={22} /></button><Avatar user={user} /><div className="conversation-person"><h2>{user.username}</h2><span>{chat.accepted ? 'Amicizia accettata' : 'In attesa di amicizia'}</span></div>
      <div className="connection-status" title="Stato della tua connessione al servizio chat"><span className={`connection-dot ${chat.status}`} />{chat.status === 'demo' ? 'Anteprima locale' : chat.status === 'connected' ? 'Chat connessa' : chat.status === 'connecting' ? 'Connessione…' : 'Riconnessione…'}</div>
      <button className="icon-button" onClick={() => setContactOpen(true)} aria-label="Informazioni sul contatto"><Info size={21} /></button>
    </header>
    {chat.status === 'disconnected' && <div className="connection-banner" role="status"><WifiOff size={15} />Connessione live interrotta. I messaggi possono essere inviati tramite il server.</div>}
    {chat.accepted ? <>
      <div className="message-scroll" ref={scroll} onScroll={() => { const el = scroll.current; if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 100) setNewMessages(false); }}>
        <div className="message-content">
          {chat.history.hasNext && <button className="load-history" onClick={() => void chat.loadMore()} disabled={chat.history.loading}>{chat.history.loading ? <Spinner /> : 'Carica messaggi precedenti'}</button>}
          {chat.history.loading && !messages.length && <div className="message-loading" role="status"><div /><div /><div /><span>Caricamento della conversazione…</span></div>}
          {chat.history.error && <div className="history-error" role="alert">{chat.history.error}<button className="text-button" onClick={() => void chat.retryHistory()}>Riprova</button></div>}
          {!messages.length && !chat.history.loading && !chat.history.error && <div className="first-message"><Avatar user={user} size="lg" /><h3>Un ciao a {user.username}?</h3><p>Siete amici. Il resto comincia con un messaggio.</p></div>}
          <div role="log" aria-label="Messaggi" aria-live="polite" aria-relevant="additions"><AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const mine = message.senderId === session.userId;
              const before = messages[index - 1];
              const after = messages[index + 1];
              const startsDay = !before || new Date(before.sentAt).toDateString() !== new Date(message.sentAt).toDateString();
              const endsGroup = !after || after.senderId !== message.senderId || Date.parse(after.sentAt) - Date.parse(message.sentAt) > 300000;
              return <Fragment key={message.id}>
                {startsDay && <div className="day-divider"><span>{dayLabel(message.sentAt)}</span></div>}
                <motion.div className={`message-row ${mine ? 'mine' : 'theirs'} ${endsGroup ? 'group-end' : ''}`} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 430, damping: 29, mass: 0.7 }} style={{ transformOrigin: mine ? 'bottom right' : 'bottom left' }}>
                  {!mine && <span className={`message-avatar ${endsGroup ? '' : 'invisible'}`}><Avatar user={user} size="sm" /></span>}
                  <div className="message-stack"><div className="message-bubble">{message.content}</div>{endsGroup && <div className="message-meta"><time dateTime={message.sentAt}>{timeLabel(message.sentAt)}</time>{mine && <Check size={13} aria-label="Inviato al server" />}</div>}</div>
                </motion.div>
              </Fragment>;
            })}
          </AnimatePresence></div>
        </div>
      </div>
      {newMessages && <button className="new-messages" onClick={() => { scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' }); setNewMessages(false); }}>Nuovi messaggi ↓</button>}
      <Composer key={user.id} recipientId={user.id} userId={session.userId} messages={messages} draft={drafts[user.id] || ''} setDraft={value => setDraft(user.id, value)} onSend={chat.send} sending={chat.sending} demo={demo} />
    </> : <div className="locked-conversation"><span className="empty-icon"><LockKeyhole size={29} strokeWidth={1.5} /></span><h3>Prima amici, poi due parole.</h3><p>{incomingRequest ? `${user.username} vorrebbe aggiungerti agli amici. Accetta per iniziare a parlare.` : chat.selectedFriendship?.status === 'PENDING' ? `La richiesta è arrivata a ${user.username}. La chat si aprirà quando verrà accettata.` : 'Per scambiarvi messaggi, la richiesta di amicizia deve essere accettata.'}</p>
      {incomingRequest ? <div className="flex gap-3"><button className="button button-secondary" disabled={busy} onClick={() => void friendshipAction('reject')}>Rifiuta</button><button className="button button-primary" disabled={busy} onClick={() => void friendshipAction('accept')}>{busy ? <Spinner /> : 'Accetta richiesta'}</button></div> : chat.selectedFriendship?.status === 'PENDING' ? <span className="status-pill">Richiesta inviata</span> : <button className="button button-primary" disabled={busy} onClick={() => void friendshipAction('request')}>{busy ? <Spinner /> : <><UserRoundPlus size={17} />Invia richiesta</>}</button>}
    </div>}
    {contactOpen && <Modal title="Informazioni sul contatto" onClose={() => setContactOpen(false)}><div className="contact-info"><Avatar user={user} size="lg" /><h3>{user.username}</h3><span className="status-pill">{chat.accepted ? 'Amici su TxTr' : 'Amicizia da confermare'}</span><p>Solo gli amici possono scambiarsi messaggi.</p></div></Modal>}
  </section>;
}
