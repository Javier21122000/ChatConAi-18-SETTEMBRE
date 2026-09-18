import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, allPages, errorMessage } from '../services/api';
import { createChatSocket } from '../services/socket';
import { mergeMessages } from '../lib/messages';
import { demoFriendships, demoMessages, demoUsers } from '../data/demo';
import type { ConnectionStatus, FriendshipResponse, MessageResponse, Session, UserView } from '../types';

type Notice = (message: string, kind?: 'success' | 'error' | 'info') => void;
type HistoryState = { page: number; hasNext: boolean; loading: boolean; error: string; loaded: boolean };
const emptyHistory: HistoryState = { page: 0, hasNext: false, loading: false, error: '', loaded: false };

export function useChat(session: Session, demo: boolean, notify: Notice) {
  const [users, setUsers] = useState<UserView[]>(demo ? demoUsers.slice(0, 7) : []);
  const [friendships, setFriendships] = useState<FriendshipResponse[]>(demo ? demoFriendships : []);
  const [messages, setMessages] = useState<Record<number, MessageResponse[]>>(demo ? demoMessages : {});
  const [unread, setUnread] = useState<Record<number, number>>(demo ? { 3: 2, 5: 1 } : {});
  const [selected, setSelected] = useState<UserView | null>(demo ? demoUsers[0] : null);
  const [status, setStatus] = useState<ConnectionStatus>(demo ? 'demo' : 'connecting');
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Record<number, HistoryState>>({});
  const [sending, setSending] = useState(false);
  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);
  const selectedRef = useRef(selected);
  const viewingRef = useRef(false);
  const seenMessages = useRef(new Set<number>());
  const requests = useRef(new Set<string>());
  const metadataBusy = useRef(false);
  const previewsLoaded = useRef(new Set<number>());
  const pendingSend = useRef<{
    recipientId: number; content: string; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const selectedFriendship = friendships.find(f => f.requester.id === selected?.id || f.recipient.id === selected?.id);
  const accepted = selectedFriendship?.status === 'ACCEPTED';

  const refresh = useCallback(async () => {
    if (demo || metadataBusy.current) return;
    metadataBusy.current = true;
    try {
      const [chats, relations] = await Promise.all([allPages(api.chats), allPages(api.friendships)]);
      setFriendships(relations);
      const peers = relations.filter(f => f.status !== 'REJECTED')
        .map(f => f.requester.id === session.userId ? f.recipient : f.requester);
      setUsers(previous => [...new Map([...previous, ...chats, ...peers].map(user => [user.id, user])).values()]);
      setError('');
      // /chats returns UserView only. Load one real last message for each chat,
      // with a small concurrency limit instead of a burst of unbounded requests.
      const queue = chats.filter(user => !previewsLoaded.current.has(user.id) &&
        relations.some(f => f.status === 'ACCEPTED' && (f.requester.id === user.id || f.recipient.id === user.id)));
      queue.forEach(user => previewsLoaded.current.add(user.id));
      async function loadPreview() {
        while (queue.length) {
          const user = queue.shift()!;
          try {
            const result = await api.history(user.id, 0, 1);
            result.items.forEach(message => seenMessages.current.add(message.id));
            setMessages(previous => ({ ...previous, [user.id]: mergeMessages(previous[user.id] || [], result.items) }));
          } catch { previewsLoaded.current.delete(user.id); }
        }
      }
      void Promise.all(Array.from({ length: Math.min(4, queue.length) }, loadPreview));
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); metadataBusy.current = false; }
  }, [demo, session.userId]);

  const loadHistory = useCallback(async (userId: number, page = 0) => {
    if (demo) return;
    const requestKey = `${userId}:${page}`;
    if (requests.current.has(requestKey)) return;
    requests.current.add(requestKey);
    setHistory(previous => ({ ...previous, [userId]: { ...(previous[userId] || emptyHistory), loading: true, error: '' } }));
    try {
      const result = await api.history(userId, page);
      result.items.forEach(message => seenMessages.current.add(message.id));
      setMessages(previous => ({ ...previous, [userId]: mergeMessages(previous[userId] || [], result.items) }));
      setHistory(previous => {
        const old = previous[userId] || emptyHistory;
        // Refreshing page zero must not discard the older-history pagination cursor.
        const preserveCursor = page === 0 && old.page > 0;
        return { ...previous, [userId]: { page: preserveCursor ? old.page : result.page,
          hasNext: preserveCursor ? old.hasNext : result.hasNext, loading: false, loaded: true, error: '' } };
      });
    } catch (err) {
      setHistory(previous => ({ ...previous, [userId]: { ...(previous[userId] || emptyHistory), loading: false, error: errorMessage(err) } }));
    } finally { requests.current.delete(requestKey); }
  }, [demo]);

  const receive = useCallback((message: MessageResponse) => {
    const otherId = message.senderId === session.userId ? message.recipientId : message.senderId;
    const isNew = !seenMessages.current.has(message.id);
    seenMessages.current.add(message.id);
    setMessages(previous => ({ ...previous, [otherId]: mergeMessages(previous[otherId] || [], [message]) }));
    if (isNew && message.senderId !== session.userId &&
      (selectedRef.current?.id !== otherId || !viewingRef.current || document.hidden || !document.hasFocus())) {
      setUnread(previous => ({ ...previous, [otherId]: (previous[otherId] || 0) + 1 }));
    }
    const pending = pendingSend.current;
    if (pending && message.senderId === session.userId && message.recipientId === pending.recipientId && message.content === pending.content) {
      clearTimeout(pending.timer); pending.resolve(); pendingSend.current = null;
    }
  }, [session.userId]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
    function focus() {
      void refresh();
      const id = selectedRef.current?.id;
      if (id && viewingRef.current) setUnread(previous => ({ ...previous, [id]: 0 }));
    }
    window.addEventListener('focus', focus);
    return () => { clearInterval(interval); window.removeEventListener('focus', focus); };
  }, [refresh]);

  useEffect(() => {
    if (demo) return;
    let active = true;
    const socket = createChatSocket(session.accessToken, {
      onMessage: message => { if (active) receive(message); },
      onStatus: value => { if (active) setStatus(value); },
      onError: failure => {
        if (!active) return;
        const pending = pendingSend.current;
        if (pending) { clearTimeout(pending.timer); pending.reject(new Error(failure.message)); pendingSend.current = null; }
        else notify(failure.message, 'error');
      },
      onConnected: () => {
        if (!active) return;
        void refresh();
        const id = selectedRef.current?.id;
        if (id) void loadHistory(id);
      },
    });
    socketRef.current = socket;
    return () => {
      active = false;
      socketRef.current = null;
      void socket.disconnect();
      const pending = pendingSend.current;
      if (pending) { clearTimeout(pending.timer); pending.reject(new Error('Connessione chiusa.')); pendingSend.current = null; }
    };
  }, [demo, session.accessToken, receive, refresh, loadHistory, notify]);

  useEffect(() => {
    selectedRef.current = selected;
    if (selected) {
      setUnread(previous => ({ ...previous, [selected.id]: 0 }));
      if (accepted) void loadHistory(selected.id);
    }
  }, [selected, accepted, loadHistory]);

  function select(user: UserView) {
    selectedRef.current = user;
    setSelected(user);
    setUsers(previous => previous.some(item => item.id === user.id) ? previous : [...previous, user]);
  }
  const setViewing = useCallback((visible: boolean) => {
    viewingRef.current = visible;
    const id = selectedRef.current?.id;
    if (visible && id && !document.hidden) setUnread(previous => ({ ...previous, [id]: 0 }));
  }, []);
  async function send(content: string) {
    if (!selected || !accepted || sending || pendingSend.current) throw new Error('La chat non è pronta per l’invio.');
    const body = { recipientId: selected.id, content: content.trim() };
    if (!body.content || body.content.length > 4000) throw new Error('Il messaggio deve contenere da 1 a 4000 caratteri.');
    setSending(true);
    try {
      if (demo) {
        receive({ ...body, senderId: session.userId, id: Date.now(), sentAt: new Date().toISOString() });
      } else if (status === 'connected' && socketRef.current) {
        // Keep the draft until the persisted message returns through the user's queue.
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            pendingSend.current = null;
            void loadHistory(body.recipientId);
            reject(new Error('Conferma non ricevuta. Controlla la cronologia prima di riprovare: il messaggio potrebbe essere stato inviato.'));
          }, 12000);
          pendingSend.current = { ...body, resolve, reject, timer };
          try { socketRef.current!.send(body); }
          catch (err) { clearTimeout(timer); pendingSend.current = null; reject(err); }
        });
      } else {
        // REST persists the same DTO and also broadcasts it to the STOMP queues.
        receive(await api.send(body));
      }
    } finally { setSending(false); }
  }
  async function request(user: UserView) {
    const friendship: FriendshipResponse = demo ? {
      id: Date.now(), requester: { id: session.userId, username: session.username }, recipient: user,
      status: 'PENDING', requestedAt: new Date().toISOString(), respondedAt: null,
    } : await api.requestFriendship(user.id);
    setFriendships(previous => [...previous.filter(f => f.id !== friendship.id &&
      !(f.requester.id === user.id || f.recipient.id === user.id)), friendship]);
    setUsers(previous => previous.some(item => item.id === user.id) ? previous : [...previous, user]);
    notify(demo ? 'Richiesta simulata nella demo.' : `Richiesta inviata a ${user.username}.`, 'success');
  }
  async function respond(id: number, action: 'accept' | 'reject') {
    const friendship = demo ? { ...friendships.find(f => f.id === id)!,
      status: action === 'accept' ? 'ACCEPTED' as const : 'REJECTED' as const, respondedAt: new Date().toISOString() }
      : await api.respondFriendship(id, action);
    setFriendships(previous => previous.map(f => f.id === id ? friendship : f));
    notify(action === 'accept' ? 'Richiesta accettata. Potete iniziare a parlare.' : 'Richiesta rifiutata.', 'success');
    return friendship;
  }
  const contacts = useMemo(() => [...users].sort((a, b) => {
    const lastA = messages[a.id]?.at(-1)?.sentAt;
    const lastB = messages[b.id]?.at(-1)?.sentAt;
    return (lastB ? Date.parse(lastB) : 0) - (lastA ? Date.parse(lastA) : 0) || a.username.localeCompare(b.username);
  }), [users, messages]);
  const requestsCount = friendships.filter(f => f.status === 'PENDING' && f.recipient.id === session.userId).length;
  return { contacts, friendships, messages, unread, selected, status, loading, error, sending, requestsCount,
    selectedFriendship, accepted, select, setViewing, send, request, respond, refresh,
    history: selected ? history[selected.id] || emptyHistory : emptyHistory,
    loadMore: () => selected && loadHistory(selected.id, (history[selected.id]?.page || 0) + 1),
    retryHistory: () => selected && loadHistory(selected.id),
  };
}
export type ChatState = ReturnType<typeof useChat>;
