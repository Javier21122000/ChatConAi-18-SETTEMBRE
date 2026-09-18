import axios from 'axios';
import type { AuthResponse, FriendshipResponse, LoginRequest, RegisterRequest, MessageResponse,
  SendRequest, SliceResponse, StatisticsResponse, SuggestionRequest, SuggestionResponse, UserView } from '../types';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
export const http = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });
export function setAccessToken(token?: string) {
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete http.defaults.headers.common.Authorization;
}
http.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !error.config?.url?.startsWith('/api/auth/')) {
    window.dispatchEvent(new Event('txtr:session-expired'));
  }
  return Promise.reject(error);
});
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) return error.response.data.detail;
    if (error.response?.status === 401) return 'Email o password non corretti.';
    if (error.response?.status === 403) return 'Questa azione richiede un’amicizia accettata.';
    if (error.code === 'ECONNABORTED') return 'Il server sta impiegando troppo tempo. Riprova.';
    if (!error.response) return 'Server non raggiungibile. Controlla la connessione e riprova.';
  }
  return error instanceof Error ? error.message : 'Qualcosa non ha funzionato. Riprova.';
}
export const api = {
  login: (body: LoginRequest) => http.post<AuthResponse>('/api/auth/login', body).then(r => r.data),
  register: (body: RegisterRequest) => http.post<AuthResponse>('/api/auth/register', body).then(r => r.data),
  me: () => http.get<UserView>('/api/users/me').then(r => r.data),
  users: (query: string, page = 0, signal?: AbortSignal) => http.get<SliceResponse<UserView>>('/api/users', { params: { query, page, size: 20 }, signal }).then(r => r.data),
  chats: (page = 0) => http.get<SliceResponse<UserView>>('/api/chats', { params: { page, size: 100 } }).then(r => r.data),
  friendships: (page = 0) => http.get<SliceResponse<FriendshipResponse>>('/api/friendships', { params: { page, size: 100 } }).then(r => r.data),
  requestFriendship: (recipientId: number) => http.post<FriendshipResponse>('/api/friendships', { recipientId }).then(r => r.data),
  respondFriendship: (id: number, action: 'accept' | 'reject') => http.patch<FriendshipResponse>(`/api/friendships/${id}/${action}`).then(r => r.data),
  history: (id: number, page = 0, size = 50) => http.get<SliceResponse<MessageResponse>>(`/api/messages/${id}`, { params: { page, size } }).then(r => r.data),
  send: (body: SendRequest) => http.post<MessageResponse>('/api/messages', body).then(r => r.data),
  suggest: (body: SuggestionRequest, signal?: AbortSignal) => http.post<SuggestionResponse>('/api/ai/suggestion', body, { timeout: 45000, signal }).then(r => r.data),
  statistics: () => http.get<StatisticsResponse>('/api/statistics').then(r => r.data),
  emailStatistics: () => http.post<StatisticsResponse>('/api/statistics/email', undefined, { timeout: 45000 }).then(r => r.data),
};
export async function allPages<T>(fetchPage: (page: number) => Promise<SliceResponse<T>>): Promise<T[]> {
  const items: T[] = [];
  let page = 0;
  while (true) {
    const result = await fetchPage(page++);
    items.push(...result.items);
    if (!result.hasNext) return items;
  }
}
