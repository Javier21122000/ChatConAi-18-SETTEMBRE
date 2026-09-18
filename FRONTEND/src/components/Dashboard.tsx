import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Conversation } from './Conversation';
import { FriendsModal } from './FriendsModal';
import { ProfileModal } from './ProfileModal';
import { Toast, type ToastMessage } from './ui';
import { useChat } from '../hooks/useChat';
import type { Session, UserView } from '../types';

export default function Dashboard({ session, demo, onLogout, theme, toggleTheme }: {
  session: Session; demo: boolean; onLogout: () => void; theme: string; toggleTheme: () => void;
}) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [modal, setModal] = useState<'friends' | 'profile' | null>(null);
  const [mobileConversation, setMobileConversation] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const notify = useCallback((text: string, kind: ToastMessage['kind'] = 'info') => setToast({ id: Date.now(), text, kind }), []);
  const closeToast = useCallback(() => setToast(null), []);
  const chat = useChat(session, demo, notify);
  const { setViewing } = chat;
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 680px)');
    const update = () => setViewing(!mobile.matches || mobileConversation);
    update();
    mobile.addEventListener('change', update);
    return () => mobile.removeEventListener('change', update);
  }, [mobileConversation, setViewing]);
  function select(user: UserView) { chat.select(user); setMobileConversation(true); }
  return <main className={`app-shell ${mobileConversation ? 'show-conversation' : ''}`}>
    <Sidebar chat={chat} session={session} onSelect={select} onFriends={() => setModal('friends')} onProfile={() => setModal('profile')} theme={theme} toggleTheme={toggleTheme} demo={demo} />
    <Conversation chat={chat} session={session} demo={demo} onBack={() => setMobileConversation(false)} onFriends={() => setModal('friends')} drafts={drafts} setDraft={(id, value) => setDrafts(previous => ({ ...previous, [id]: value }))} notify={notify} />
    {modal === 'friends' && <FriendsModal chat={chat} userId={session.userId} demo={demo} onClose={() => setModal(null)} onSelect={select} notify={notify} />}
    {modal === 'profile' && <ProfileModal session={session} chat={chat} demo={demo} onClose={() => setModal(null)} onLogout={onLogout} theme={theme} toggleTheme={toggleTheme} notify={notify} />}
    <Toast toast={toast} onClose={closeToast} />
  </main>;
}
