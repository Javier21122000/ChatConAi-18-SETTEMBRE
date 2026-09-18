import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from './api';
import type { ChatError, ConnectionStatus, MessageResponse, SendRequest } from '../types';

export function createChatSocket(token: string, callbacks: {
  onMessage: (message: MessageResponse) => void;
  onError: (error: ChatError) => void;
  onStatus: (status: ConnectionStatus) => void;
  onConnected: () => void;
}) {
  const client = new Client({
    webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || `${API_BASE_URL}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000, connectionTimeout: 12000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe('/user/queue/messages', frame => {
        try { callbacks.onMessage(JSON.parse(frame.body)); }
        catch { callbacks.onError({ status: 500, message: 'Messaggio ricevuto non valido.' }); }
      });
      client.subscribe('/user/queue/errors', frame => {
        try { callbacks.onError(JSON.parse(frame.body)); }
        catch { callbacks.onError({ status: 500, message: 'Invio non riuscito.' }); }
      });
      callbacks.onStatus('connected');
      callbacks.onConnected();
    },
    onWebSocketClose: () => callbacks.onStatus('disconnected'),
    onWebSocketError: () => {
      callbacks.onStatus('disconnected');
      callbacks.onError({ status: 503, message: 'Server chat non raggiungibile. Riprovo automaticamente.' });
    },
    onStompError: frame => {
      callbacks.onStatus('disconnected');
      const message = frame.headers.message?.toLowerCase() || '';
      callbacks.onError(message.includes('jwt') || message.includes('auth')
        ? { status: 401, message: 'Sessione chat scaduta. Accedi di nuovo.' }
        : { status: 400, message: 'Connessione chat rifiutata. Controlla server e configurazione.' });
    },
  });
  client.activate();
  return {
    send(body: SendRequest) {
      if (!client.connected) throw new Error('Chat in riconnessione. Attendi e riprova.');
      client.publish({ destination: '/app/chat.send', body: JSON.stringify(body) });
    },
    disconnect: () => client.deactivate(),
  };
}
