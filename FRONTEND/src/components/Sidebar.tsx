import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MessageCircle, Plus, Search, UserRoundPlus, X } from 'lucide-react';
import type { ChatState } from '../hooks/useChat';
import type { Session, UserView } from '../types';
import { timeLabel } from '../lib/messages';
import { Avatar, Brand, Spinner, ThemeToggle } from './ui';

export function Sidebar({ chat, session, onSelect, onFriends, onProfile, theme, toggleTheme, demo }: {
  chat: ChatState; session: Session; onSelect: (user: UserView) => void; onFriends: () => void;
  onProfile: () => void; theme: string; toggleTheme: () => void; demo: boolean;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const contacts = chat.contacts.filter(user => user.username.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || chat.unread[user.id] > 0));
  const unreadCount = Object.values(chat.unread).reduce((sum, value) => sum + value, 0);
  return <aside className="sidebar" aria-label="Conversazioni">
    <header className="sidebar-brand"><Brand /><div className="flex items-center gap-2">{demo && <span className="demo-badge">DEMO</span>}<ThemeToggle theme={theme} onToggle={toggleTheme} /></div></header>
    <div className="sidebar-heading"><h1>Messaggi<span className="count-label">{chat.contacts.length}</span></h1><button className="icon-button filled" onClick={onFriends} aria-label="Nuova conversazione" title="Nuova conversazione"><Plus size={21} /></button></div>
    <label className="search-field"><Search size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cerca una conversazione" aria-label="Cerca una conversazione" />{query && <button className="icon-button" onClick={() => setQuery('')} aria-label="Cancella ricerca"><X size={16} /></button>}</label>
    <div className="chat-filters" role="group" aria-label="Filtra conversazioni">{[{ id: 'all', label: 'Tutte' }, { id: 'unread', label: 'Non lette' }].map(item => <button key={item.id} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''}>
      {filter === item.id && <motion.span layoutId="chat-filter" className="filter-background" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}<span>{item.label}{item.id === 'unread' && unreadCount > 0 && <span className="filter-count">{unreadCount}</span>}</span>
    </button>)}</div>
    <div className="chat-list">
      {chat.loading && <div className="list-state"><Spinner /><span>Le tue conversazioni stanno arrivando.</span></div>}
      {chat.error && <div className="list-state form-error" role="alert"><span>{chat.error}</span><button className="text-button" onClick={() => void chat.refresh()}>Riprova</button></div>}
      {!chat.loading && !chat.error && contacts.length === 0 && <div className="list-state"><MessageCircle size={26} /><strong>{query ? 'Nessuna corrispondenza' : filter === 'unread' ? 'Tutto letto' : 'La prima parola è tua.'}</strong><span>{query ? 'Prova con un altro nome.' : filter === 'unread' ? 'Qui compariranno i nuovi messaggi ricevuti.' : 'Aggiungi un amico e inizia una conversazione.'}</span>{filter === 'all' && !query && <button className="button button-secondary" onClick={onFriends}>Trova i tuoi amici</button>}</div>}
      {contacts.map(user => {
        const lastMessage = chat.messages[user.id]?.at(-1);
        const friendship = chat.friendships.find(f => f.recipient.id === user.id || f.requester.id === user.id);
        const pending = friendship?.status === 'PENDING';
        return <button className={`chat-card ${chat.selected?.id === user.id ? 'selected' : ''}`} key={user.id} onClick={() => onSelect(user)} aria-current={chat.selected?.id === user.id ? 'true' : undefined}>
          <Avatar user={user} /><span className="chat-card-copy"><span className="chat-card-top"><strong>{user.username}</strong>{lastMessage && <time dateTime={lastMessage.sentAt}>{timeLabel(lastMessage.sentAt)}</time>}</span>
            <span className="chat-card-bottom"><span>{pending ? 'Richiesta in attesa' : friendship?.status === 'REJECTED' ? 'Richiesta non accettata' : lastMessage ? `${lastMessage.senderId === session.userId ? 'Tu: ' : ''}${lastMessage.content}` : 'Inizia la conversazione'}</span>{!!chat.unread[user.id] && <b className="unread-badge" aria-label={`${chat.unread[user.id]} messaggi non letti`}>{chat.unread[user.id]}</b>}</span>
          </span>
        </button>;
      })}
    </div>
    <div className="sidebar-bottom"><button className="friendship-shortcut" onClick={onFriends}><span className="shortcut-icon"><UserRoundPlus size={19} /></span><span>Amici e richieste</span>{chat.requestsCount > 0 ? <span className="unread-badge">{chat.requestsCount}</span> : <ChevronRight size={17} />}</button>
      <button className="profile-shortcut" onClick={onProfile}><Avatar user={{ id: session.userId, username: session.username }} size="sm" /><span><strong>{session.username}</strong><small>Il tuo profilo</small></span><ChevronRight size={17} /></button>
    </div>
  </aside>;
}
