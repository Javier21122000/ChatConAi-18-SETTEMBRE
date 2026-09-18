import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { api, allPages, errorMessage, http, setAccessToken } from './api';

let requests: InternalAxiosRequestConfig[];
beforeEach(() => {
  requests = [];
  http.defaults.adapter = async config => {
    requests.push(config);
    return { data: { items: [], page: 0, hasNext: false }, status: 200, statusText: 'OK', headers: {}, config };
  };
});
afterEach(() => { setAccessToken(); vi.unstubAllGlobals(); });
const payload = (index: number) => requests[index].data ? JSON.parse(requests[index].data) : undefined;

describe('Spring REST contracts', () => {
  it('uses the exact auth paths and DTO keys', async () => {
    await api.login({ email: 'test@example.com', password: 'password123' });
    await api.register({ username: 'test_user', email: 'test@example.com', password: 'password123' });
    expect(requests.map(r => [r.method, r.url])).toEqual([['post', '/api/auth/login'], ['post', '/api/auth/register']]);
    expect(payload(0)).toEqual({ email: 'test@example.com', password: 'password123' });
    expect(payload(1).username).toBe('test_user');
  });
  it('matches friendship endpoints and passes recipientId, not username or senderId', async () => {
    await api.requestFriendship(7); await api.respondFriendship(12, 'accept'); await api.respondFriendship(13, 'reject');
    expect(requests.map(r => [r.method, r.url])).toEqual([['post', '/api/friendships'], ['patch', '/api/friendships/12/accept'], ['patch', '/api/friendships/13/reject']]);
    expect(payload(0)).toEqual({ recipientId: 7 });
  });
  it('uses real paginated search/history routes and sends Bearer auth', async () => {
    setAccessToken('test-token');
    await api.users('so', 2); await api.history(7, 3); await api.chats(); await api.friendships(); await api.me();
    expect(requests.map(r => r.url)).toEqual(['/api/users', '/api/messages/7', '/api/chats', '/api/friendships', '/api/users/me']);
    expect(requests[0].params).toEqual({ query: 'so', page: 2, size: 20 });
    expect(requests[1].params).toEqual({ page: 3, size: 50 });
    expect(requests.every(r => r.headers.Authorization === 'Bearer test-token')).toBe(true);
  });
  it('posts messages, the single AI suggestion and the email statistics action to the actual controllers', async () => {
    await api.send({ recipientId: 2, content: 'Ciao' });
    await api.suggest({ recipientId: 2, history: [{ senderId: 1, content: 'Ciao' }] });
    await api.statistics(); await api.emailStatistics();
    expect(requests.map(r => [r.method, r.url])).toEqual([['post', '/api/messages'], ['post', '/api/ai/suggestion'], ['get', '/api/statistics'], ['post', '/api/statistics/email']]);
    expect(payload(0)).toEqual({ recipientId: 2, content: 'Ciao' });
    expect(payload(1)).toEqual({ recipientId: 2, history: [{ senderId: 1, content: 'Ciao' }] });
    expect(payload(3)).toBeUndefined();
  });
  it('loads all Spring SliceResponse pages', async () => {
    const fetchPage = vi.fn(async (page: number) => ({ items: [page + 1], page, hasNext: page < 2 }));
    expect(await allPages(fetchPage)).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
  it('expires authenticated sessions on 401 but preserves the login form on wrong credentials', async () => {
    const events = { dispatchEvent: vi.fn() }; vi.stubGlobal('window', events);
    http.defaults.adapter = async config => { throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, { data: {}, status: 401, statusText: 'Unauthorized', headers: {}, config }); };
    await expect(api.login({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow();
    expect(events.dispatchEvent).not.toHaveBeenCalled();
    await expect(api.me()).rejects.toThrow();
    expect(events.dispatchEvent).toHaveBeenCalledOnce();
    expect(events.dispatchEvent.mock.calls[0][0].type).toBe('txtr:session-expired');
  });
  it('displays Spring ProblemDetail and network failures accurately', () => {
    expect(errorMessage(new AxiosError('Network error'))).toContain('Server non raggiungibile');
    expect(errorMessage(new AxiosError('Error', undefined, undefined, undefined,
      { status: 409, data: { detail: 'Amicizia già richiesta o accettata' }, statusText: 'Conflict', headers: {}, config: {} as InternalAxiosRequestConfig }))).toBe('Amicizia già richiesta o accettata');
  });
});
