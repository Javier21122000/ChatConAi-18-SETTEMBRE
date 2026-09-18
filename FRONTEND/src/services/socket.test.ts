import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StompConfig } from '@stomp/stompjs';

const mocks = vi.hoisted(() => ({
  config: {} as StompConfig,
  callbacks: new Map<string, (frame: { body: string }) => void>(),
  publish: vi.fn(), deactivate: vi.fn(), activate: vi.fn(), connected: false,
}));
vi.mock('@stomp/stompjs', () => ({ Client: class {
  constructor(config: StompConfig) { mocks.config = config; }
  get connected() { return mocks.connected; }
  subscribe(destination: string, callback: (frame: { body: string }) => void) { mocks.callbacks.set(destination, callback); }
  activate = mocks.activate; deactivate = mocks.deactivate; publish = mocks.publish;
} }));
vi.mock('sockjs-client', () => ({ default: class {} }));
import { createChatSocket } from './socket';

beforeEach(() => { vi.clearAllMocks(); mocks.callbacks.clear(); mocks.connected = false; });
describe('Spring STOMP contracts', () => {
  it('authenticates CONNECT and subscribes only to the authorized user queues', () => {
    const callbacks = { onMessage: vi.fn(), onError: vi.fn(), onStatus: vi.fn(), onConnected: vi.fn() };
    createChatSocket('jwt-value', callbacks);
    expect(mocks.config.connectHeaders).toEqual({ Authorization: 'Bearer jwt-value' });
    expect(mocks.activate).toHaveBeenCalledOnce();
    mocks.config.onConnect!({} as never);
    expect([...mocks.callbacks.keys()]).toEqual(['/user/queue/messages', '/user/queue/errors']);
    mocks.callbacks.get('/user/queue/messages')!({ body: JSON.stringify({ id: 5, content: 'Ciao' }) });
    expect(callbacks.onMessage).toHaveBeenCalledWith({ id: 5, content: 'Ciao' });
    expect(callbacks.onStatus).toHaveBeenCalledWith('connected');
    expect(callbacks.onConnected).toHaveBeenCalledOnce();
  });
  it('sends the exact SendRequest payload to /app/chat.send and deactivates cleanly', async () => {
    const socket = createChatSocket('jwt-value', { onMessage: vi.fn(), onError: vi.fn(), onStatus: vi.fn(), onConnected: vi.fn() });
    expect(() => socket.send({ recipientId: 2, content: 'Ciao' })).toThrow('riconnessione');
    mocks.connected = true;
    socket.send({ recipientId: 2, content: 'Ciao' });
    expect(mocks.publish).toHaveBeenCalledWith({ destination: '/app/chat.send', body: '{"recipientId":2,"content":"Ciao"}' });
    await socket.disconnect(); expect(mocks.deactivate).toHaveBeenCalledOnce();
  });
  it('surfaces backend queue errors without treating the message as delivered', () => {
    const onError = vi.fn(); const onMessage = vi.fn();
    createChatSocket('jwt-value', { onMessage, onError, onStatus: vi.fn(), onConnected: vi.fn() });
    mocks.config.onConnect!({} as never);
    mocks.callbacks.get('/user/queue/errors')!({ body: '{"status":403,"message":"È necessaria un’amicizia accettata"}' });
    expect(onError).toHaveBeenCalledWith({ status: 403, message: 'È necessaria un’amicizia accettata' });
    expect(onMessage).not.toHaveBeenCalled();
  });
});
